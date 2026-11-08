#!/usr/bin/env node
// Applies an approved plan from github-repo-init or github-repo-audit with the gh CLI, in a fixed
// order: create the repository and wait for its first commit (skipped when repo.existing is true),
// run the settings steps, run the protection steps last, then read the result back from GitHub.
// Prints one JSON report to stdout.
//
// Usage: node apply-plan.mjs <plan.json> --dry-run          validate, print commands, call nothing
//        node apply-plan.mjs <plan.json> --approve          validate, write NN-approved (sha256)
//        node apply-plan.mjs <plan.json> [--out <report>]   apply; needs a matching NN-approved
// Env:   GH_BIN overrides the gh executable (tests use a fake).
// Exit:  0 repository created (some steps may have failed — see the report)
//        0 also for an existing repository: the steps ran (see the report)
//        1 repository creation failed, nothing else ran
//        2 nothing ran: the plan is invalid, unapproved, or changed since approval
//        3 repository created, but the run crashed or the report file could not be written;
//          the JSON on stdout says what ran

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";

const GH = process.env.GH_BIN || "gh";
// Template contents usually land within seconds; 30 polls 2 s apart give it about a minute.
const WAIT_ATTEMPTS = Number(process.env.APPLY_PLAN_WAIT_ATTEMPTS || 30);
const WAIT_MS = Number(process.env.APPLY_PLAN_WAIT_MS || 2000);
const MAX_DESCRIPTION = 350; // GitHub's limit for a repository description

// Commands the plan may never contain: they touch credentials or destroy data, and no phase of
// the skill asks for them.
const FORBIDDEN = [
  (a) => a[0] === "auth",
  (a) => a[0] === "secret",
  (a) => a[0] === "repo" && a[1] === "delete",
  (a) => a.some((x, i) => (x === "-X" || x === "--method") && /^delete$/i.test(a[i + 1] || "")),
  (a) => a.some((x) => /^--method=delete$/i.test(x)),
];

export function validatePlan(plan) {
  const errors = [];
  const r = plan?.repo;
  if (!r) return ["plan.repo is missing"];
  if (!r.owner || !r.name) errors.push("repo.owner and repo.name are required");
  if (r.name && !/^[A-Za-z0-9._-]{1,100}$/.test(r.name)) errors.push(`repo.name "${r.name}" is not a valid repository name`);
  if (r.existing) {
    if (r.template || r.gitignore || r.license || r.addReadme || r.visibility) errors.push("an existing repository takes no creation fields (visibility, template, gitignore, license, addReadme)");
  } else {
    if (!["public", "private", "internal"].includes(r.visibility)) errors.push("repo.visibility must be public, private or internal");
    if (r.template && (r.gitignore || r.license || r.addReadme)) errors.push("a template cannot be combined with gitignore, license or addReadme");
  }
  if (r.description && r.description.length > MAX_DESCRIPTION) errors.push(`repo.description is longer than ${MAX_DESCRIPTION} characters`);
  if (!Array.isArray(plan.steps)) errors.push("plan.steps must be an array");
  const ids = new Set();
  for (const s of plan.steps || []) {
    if (!s.id) errors.push("every step needs an id");
    if (ids.has(s.id)) errors.push(`duplicate step id "${s.id}"`);
    ids.add(s.id);
    if (!Array.isArray(s.args) || s.args.length === 0) errors.push(`step "${s.id}": args must be a non-empty array`);
    else if (!s.args.every((x) => typeof x === "string")) errors.push(`step "${s.id}": every arg must be a string`);
    else if (s.args[0] === "gh") errors.push(`step "${s.id}": args start after "gh" — drop the leading "gh"`);
    else if (FORBIDDEN.some((f) => f(s.args))) errors.push(`step "${s.id}": command not allowed: gh ${s.args.join(" ")}`);
    if (s.body !== undefined && !s.args?.includes("--input")) errors.push(`step "${s.id}": a body needs "--input -" in args`);
    if (s.body !== undefined && (typeof s.body !== "object" || s.body === null || Array.isArray(s.body))) errors.push(`step "${s.id}": body must be a JSON object`);
  }
  for (const s of plan.steps || []) for (const n of s.needs || []) if (!ids.has(n)) errors.push(`step "${s.id}" needs unknown step "${n}"`);
  return errors;
}

export function createArgs(r) {
  const a = ["repo", "create", `${r.owner}/${r.name}`, `--${r.visibility}`];
  if (r.description) a.push("--description", r.description);
  if (r.homepage) a.push("--homepage", r.homepage);
  if (r.template) {
    a.push("--template", r.template);
    if (r.includeAllBranches) a.push("--include-all-branches");
  } else {
    if (r.gitignore) a.push("--gitignore", r.gitignore);
    if (r.license) a.push("--license", r.license);
    if (r.addReadme) a.push("--add-readme");
  }
  return a;
}

// Protection runs last so a ruleset never blocks a settings step, and needs order is kept.
export function orderSteps(steps) {
  const rest = steps.filter((s) => s.group !== "protection");
  const prot = steps.filter((s) => s.group === "protection");
  return [...rest, ...prot];
}

const fill = (args, repo) => args.map((x) => x.replaceAll("{repo}", repo));
const show = (args) => "gh " + args.map((x) => (/[\s"'$]/.test(x) ? JSON.stringify(x) : x)).join(" ");

function gh(args, input) {
  const p = spawnSync(GH, args, { input, encoding: "utf8" });
  return { code: p.status ?? 1, stdout: (p.stdout || "").trim(), stderr: (p.stderr || p.error?.message || "").trim() };
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function apply(plan, { dryRun = false } = {}) {
  const r = plan.repo;
  const repo = `${r.owner}/${r.name}`;
  const report = { repo, dryRun, create: null, waitedForCommit: null, steps: [], readBack: null };

  const cArgs = r.existing ? null : createArgs(r);
  if (!cArgs) report.create = { status: "existing" };
  else if (dryRun) report.create = { command: show(cArgs), status: "planned" };
  else {
    const res = gh(cArgs);
    report.create = { command: show(cArgs), status: res.code === 0 ? "ok" : "failed", output: res.code === 0 ? res.stdout : res.stderr };
    if (res.code !== 0) return { report, exit: 1 };
  }

  // A repository generated from a template gets its files a few seconds after the API answers.
  if (!dryRun && cArgs && (r.template || r.addReadme)) {
    report.waitedForCommit = false;
    for (let i = 0; i < WAIT_ATTEMPTS; i++) {
      const res = gh(["api", `repos/${repo}/commits?per_page=1`, "--jq", ".[0].sha"]);
      if (res.code === 0 && res.stdout) { report.waitedForCommit = true; break; }
      sleep(WAIT_MS);
    }
  }

  const status = new Map();
  for (const s of orderSteps(plan.steps)) {
    const args = fill(s.args, repo);
    const entry = { id: s.id, group: s.group || null, command: show(args) };
    const blocked = (s.needs || []).filter((n) => status.get(n) !== "ok" && status.get(n) !== "planned");
    if (blocked.length) Object.assign(entry, { status: "skipped", reason: `needs ${blocked.join(", ")}` });
    else if (dryRun) entry.status = "planned";
    else {
      const res = gh(args, s.body === undefined ? undefined : JSON.stringify(s.body));
      entry.status = res.code === 0 ? "ok" : "failed";
      if (res.code !== 0) entry.error = res.stderr || res.stdout;
    }
    status.set(s.id, entry.status);
    report.steps.push(entry);
  }

  if (!dryRun) report.readBack = readBack(repo);
  return { report, exit: 0 };
}

function readBack(repo) {
  const json = (res) => { try { return JSON.parse(res.stdout); } catch { return res.stdout || null; } };
  const view = gh(["repo", "view", repo, "--json",
    "visibility,description,repositoryTopics,templateRepository,defaultBranchRef,deleteBranchOnMerge,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed,hasIssuesEnabled,hasWikiEnabled,hasProjectsEnabled,hasDiscussionsEnabled"]);
  const alerts = gh(["api", `repos/${repo}/vulnerability-alerts`]);
  const fixes = gh(["api", `repos/${repo}/automated-security-fixes`]);
  const actions = gh(["api", `repos/${repo}/actions/permissions/workflow`]);
  const rulesets = gh(["api", `repos/${repo}/rulesets`, "--jq", "[.[] | {id, name, enforcement}]"]);
  return {
    repository: view.code === 0 ? json(view) : { error: view.stderr },
    vulnerabilityAlerts: alerts.code === 0 ? "enabled" : "disabled or unreadable",
    automatedSecurityFixes: fixes.code === 0 ? json(fixes) : { error: fixes.stderr },
    actionsWorkflowPermissions: actions.code === 0 ? json(actions) : { error: actions.stderr },
    rulesets: rulesets.code === 0 ? json(rulesets) : { error: rulesets.stderr },
  };
}

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");
// NN-plan.json is approved by NN-approved beside it (05 in github-repo-init, 04 in github-repo-audit).
const approvalFile = (planFile) => {
  const base = basename(planFile);
  const m = base.match(/^(\d+)-plan\.json$/);
  return join(dirname(planFile), m ? `${m[1]}-approved` : `${base}.approved`);
};

function main(argv) {
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : null;
  const file = argv.find((a, i) => !a.startsWith("--") && !(outIdx >= 0 && i === outIdx + 1));
  if (!file) { console.error("usage: apply-plan.mjs <plan.json> (--dry-run | --approve | [--out <report.json>])"); return 2; }
  let text, plan;
  try { text = readFileSync(file, "utf8"); plan = JSON.parse(text); } catch (e) { console.error(`cannot read plan: ${e.message}`); return 2; }
  const errors = validatePlan(plan);
  if (errors.length) { console.error(JSON.stringify({ invalid: errors }, null, 2)); return 2; }
  const dryRun = argv.includes("--dry-run");

  if (argv.includes("--approve")) {
    const approval = { sha256: sha256(text), approvedAt: new Date().toISOString() };
    writeFileSync(approvalFile(file), JSON.stringify(approval, null, 2) + "\n");
    console.log(JSON.stringify({ approved: approvalFile(file), ...approval }, null, 2));
    return 0;
  }

  // The user's "yes" covers one exact file; refuse a plan with no approval or edited after it.
  if (!dryRun) {
    const af = approvalFile(file);
    let approved = null;
    try { approved = existsSync(af) ? JSON.parse(readFileSync(af, "utf8")).sha256 : null; } catch { approved = null; }
    if (approved !== sha256(text)) {
      console.error(approved ? `${file} changed after it was approved; dry-run, show and approve it again` : `no approval for ${file}; run --approve after the user answers Apply`);
      return 2;
    }
  }

  let report, exit;
  try { ({ report, exit } = apply(plan, { dryRun })); }
  catch (e) {
    console.log(JSON.stringify({ crashed: true, error: e.message, note: "the repository may exist; check it before anything else" }, null, 2));
    return 3;
  }
  const json = JSON.stringify(report, null, 2);
  console.log(json);
  if (out) {
    try { writeFileSync(out, json + "\n"); }
    catch (e) { console.error(`repository step ran, but cannot write the report to ${out}: ${e.message}; the report is on stdout`); return exit === 0 ? 3 : exit; }
  }
  return exit;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));

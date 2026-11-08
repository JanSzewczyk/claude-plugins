#!/usr/bin/env node
// Reads the current settings of one existing GitHub repository with the gh CLI (read-only: every
// call is a GET) and compares them with the baseline in references/settings-catalog.md.
// Prints one JSON document: { repo, snapshot, findings, unreadable }.
//
// Usage: node read-settings.mjs <owner/repo> [--out <file>]
// Env:   GH_BIN overrides the gh executable (tests use a fake).
// Exit:  0 read and compared (findings may be empty)
//        1 the repository cannot be read, or the token is not an admin of it
//        2 bad arguments

import { spawnSync } from "node:child_process";
import { writeFileSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GH = process.env.GH_BIN || "gh";
const GITHUB_ACTIONS_APP_ID = 15368; // the integration id GITHUB_TOKEN pushes as

function gh(args) {
  const p = spawnSync(GH, args, { encoding: "utf8" });
  return { code: p.status ?? 1, stdout: (p.stdout || "").trim(), stderr: (p.stderr || p.error?.message || "").trim() };
}
const json = (res) => { try { return JSON.parse(res.stdout); } catch { return null; } };
const notFound = (res) => /HTTP 404|Not Found|Branch not protected/.test(res.stderr);
const firstLine = (res) => res.stderr.split("\n")[0];
const api = (path, extra = []) => gh(["api", path, ...extra]);

// Release tools and git commands that push to the default branch from a workflow.
const PUSHER = /semantic-release|release-please|changesets\/action|standard-version|npm version|git push|create-github-app-token|github-app-token/;

export function snapshot(repo) {
  const unreadable = [];
  const read = (key, res, parse = json) => {
    if (res.code !== 0) { unreadable.push({ key, error: res.stderr.split("\n")[0] }); return null; }
    return parse(res);
  };
  const info = read("repository", api(`repos/${repo}`));
  if (!info) return { error: unreadable[0]?.error || "cannot read the repository" };
  if (!info.permissions?.admin) return { error: "the token is not an admin of this repository; settings cannot be read or changed" };
  if (!info.default_branch) return { error: "the repository has no default branch (empty repository); nothing to audit" };

  const owner = info.owner?.login;
  // GitHub shows .plan only to org owners (and to the user themself): a repo admin who is not an
  // owner gets nothing, which must not be read as Free.
  const tierRes = info.owner?.type === "Organization" ? api(`orgs/${owner}`, ["--jq", ".plan.name // \"unknown\""]) : api("user", ["--jq", ".plan.name // \"unknown\""]);
  if (tierRes.code !== 0 || tierRes.stdout === "unknown") unreadable.push({ key: "plan", error: "billing plan not visible to this token" });
  const branch = info.default_branch;

  const snap = {
    visibility: info.visibility,
    archived: info.archived,
    ownerType: info.owner?.type,
    planName: tierRes.code === 0 ? tierRes.stdout : "unknown",
    defaultBranch: branch,
    repo: pick(info, ["has_issues", "has_wiki", "has_projects", "has_discussions", "allow_merge_commit", "allow_squash_merge",
      "allow_rebase_merge", "delete_branch_on_merge", "allow_auto_merge", "allow_update_branch", "squash_merge_commit_title",
      "squash_merge_commit_message", "merge_commit_title", "merge_commit_message", "security_and_analysis"]),
    vulnerabilityAlerts: null,
    automatedSecurityFixes: read("automatedSecurityFixes", api(`repos/${repo}/automated-security-fixes`)),
    privateVulnerabilityReporting: read("privateVulnerabilityReporting", api(`repos/${repo}/private-vulnerability-reporting`)),
    codeScanningDefaultSetup: read("codeScanningDefaultSetup", api(`repos/${repo}/code-scanning/default-setup`)),
    actionsWorkflow: read("actionsWorkflow", api(`repos/${repo}/actions/permissions/workflow`)),
    rulesets: [],
    branchProtection: null,
    workflows: [],
    dependabotConfig: false,
    lastMergedPr: null,
  };

  // 204 = enabled, 404 = disabled; anything else is a gap, not "off".
  const va = api(`repos/${repo}/vulnerability-alerts`);
  if (va.code === 0) snap.vulnerabilityAlerts = true;
  else if (notFound(va)) snap.vulnerabilityAlerts = false;
  else unreadable.push({ key: "vulnerabilityAlerts", error: firstLine(va) });

  const list = read("rulesets", api(`repos/${repo}/rulesets`, ["--paginate", "--jq", ".[]"]), (res) => res.stdout.split("\n").filter(Boolean).map((l) => JSON.parse(l))) || [];
  for (const r of list) {
    const full = read(`ruleset ${r.id}`, api(`repos/${repo}/rulesets/${r.id}`));
    if (full) snap.rulesets.push(pick(full, ["id", "name", "target", "enforcement", "source_type", "source", "conditions", "bypass_actors", "rules"]));
  }

  const bp = api(`repos/${repo}/branches/${branch}/protection`);
  if (bp.code !== 0 && !notFound(bp)) unreadable.push({ key: "branchProtection", error: firstLine(bp) });
  if (bp.code === 0) {
    const b = json(bp) || {};
    snap.branchProtection = {
      requiredChecks: b.required_status_checks?.contexts || [],
      strict: b.required_status_checks?.strict ?? null,
      approvals: b.required_pull_request_reviews?.required_approving_review_count ?? null,
      enforceAdmins: b.enforce_admins?.enabled ?? null,
      allowForcePushes: b.allow_force_pushes?.enabled ?? null,
    };
  }

  const wf = api(`repos/${repo}/contents/.github/workflows`, ["--jq", '.[] | select(.type == "file" and (.name | test("[.]ya?ml$"))) | .name']);
  if (wf.code !== 0 && !notFound(wf)) unreadable.push({ key: "workflows", error: firstLine(wf) });
  for (const name of wf.code === 0 ? wf.stdout.split("\n").filter(Boolean) : []) {
    const raw = api(`repos/${repo}/contents/.github/workflows/${name}`, ["-H", "Accept: application/vnd.github.raw"]);
    if (raw.code !== 0) { unreadable.push({ key: `workflow ${name}`, error: raw.stderr.split("\n")[0] }); continue; }
    snap.workflows.push(scanWorkflow(name, raw.stdout, branch));
  }

  const dep = [".github/dependabot.yml", ".github/dependabot.yaml"].map((f) => api(`repos/${repo}/contents/${f}`, ["--jq", ".name"]));
  if (dep.some((r) => r.code === 0)) snap.dependabotConfig = true;
  else if (dep.every(notFound)) snap.dependabotConfig = false;
  else { snap.dependabotConfig = null; unreadable.push({ key: "dependabotConfig", error: firstLine(dep.find((r) => !notFound(r))) }); }

  // The most recently merged PR among the last 50 updated ones, not the most recently created.
  const pr = api(`repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`,
    ["--jq", "[.[] | select(.merged_at != null)] | if length == 0 then null else (max_by(.merged_at) | {number, head: .head.sha}) end"]);
  const last = pr.code === 0 ? json(pr) : null;
  if (last?.head) {
    // A required context can come from a check run (Actions, apps) or a commit status (external CI).
    const runs = api(`repos/${repo}/commits/${last.head}/check-runs?per_page=100`, ["--paginate", "--jq", ".check_runs[].name"]);
    const statuses = api(`repos/${repo}/commits/${last.head}/status`, ["--jq", ".statuses[].context"]);
    if (runs.code !== 0) unreadable.push({ key: "checkRuns", error: firstLine(runs) });
    if (statuses.code !== 0) unreadable.push({ key: "commitStatuses", error: firstLine(statuses) });
    const names = [runs, statuses].flatMap((r) => (r.code === 0 ? r.stdout.split("\n").filter(Boolean) : []));
    snap.lastMergedPr = { number: last.number, checks: [...new Set(names)] };
  }

  return { snapshot: snap, unreadable };
}

function pick(o, keys) { return Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]])); }

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Does a workflow run on pushes to `branch`? `on: push`, `on: [push, …]`, or a `push:` block whose
// `branches:` (if any) names the branch or a wildcard. Branch filters under pull_request don't count.
export function pushesTo(text, branch) {
  const lines = text.split("\n");
  if (lines.some((l) => /^on:\s*(push|\[[^\]]*\bpush\b[^\]]*\])\s*(#.*)?$/.test(l))) return true;
  const i = lines.findIndex((l) => /^\s+push:\s*(#.*)?$/.test(l));
  if (i < 0) return false;
  const indent = lines[i].match(/^\s*/)[0].length;
  const block = [];
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j];
    if (l.trim() === "" || /^\s*#/.test(l)) continue;
    if (l.match(/^\s*/)[0].length <= indent) break;
    block.push(l);
  }
  const body = block.join("\n");
  if (!/\bbranches(-ignore)?:/.test(body)) return true;
  if (/\bbranches-ignore:/.test(body) && !/\bbranches:/.test(body)) return !new RegExp(`(^|[\\s'"\\[,-])${esc(branch)}(['"\\],\\s]|$)`, "m").test(body);
  return new RegExp(`(^|[\\s'"\\[,-])(${esc(branch)}|\\*\\*?)(['"\\],\\s]|$)`, "m").test(body);
}

export function scanWorkflow(name, text, branch) {
  const lines = text.split("\n");
  const onPushToDefault = pushesTo(text, branch);
  const hits = [];
  lines.forEach((l, i) => { if (PUSHER.test(l)) hits.push({ line: i + 1, text: l.trim().slice(0, 120), commented: /^\s*#/.test(l) }); });
  const usesAppToken = hits.some((h) => /app-token/.test(h.text));
  const secrets = [...new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]).filter((n) => n !== "GITHUB_TOKEN"))];
  const pullRequestJobs = /(^|\n)\s*pull_request(_target)?:/.test(text) || /on:\s*\[[^\]]*pull_request/.test(text);
  return { name, onPushToDefault, pusherLines: hits, usesAppToken, secrets, pullRequestTrigger: pullRequestJobs };
}

const tierOf = (plan) => ({ free: "Free", pro: "Pro", team: "Team", business: "Team", unknown: "Unknown" })[plan] || (/enterprise/.test(plan) ? "Enterprise" : plan ? "Free" : "Unknown");

// Each finding: { id, group, severity: high|medium|low, current, recommended, step? , note? }.
// `step` is a ready plan step (args with {repo}) when the fix is one catalog command.
export function compare(s) {
  const f = [];
  const add = (x) => f.push(x);
  const r = s.repo || {};
  const pub = s.visibility === "public";
  const tier = tierOf(s.planName);
  const paid = tier !== "Free"; // Unknown counts as possibly paid: better a finding with a note than a hidden one
  const tierNote = tier === "Unknown" ? "tier not visible to this token; on a private repository this may need Team" : undefined;
  const sa = r.security_and_analysis || {};
  const on = (k) => sa[k]?.status === "enabled";

  if (r.delete_branch_on_merge === false) add({ id: "delete-branch-on-merge", group: "merge", severity: "medium", current: "off", recommended: "on",
    step: ["repo", "edit", "{repo}", "--delete-branch-on-merge"] });
  for (const [k, flag] of [["allow_merge_commit", "--enable-merge-commit"], ["allow_squash_merge", "--enable-squash-merge"], ["allow_rebase_merge", "--enable-rebase-merge"]])
    if (r[k] === false) add({ id: k.replaceAll("_", "-"), group: "merge", severity: "low", current: "off", recommended: "on (baseline: all methods available)",
      step: ["repo", "edit", "{repo}", flag], note: "keep it off if it was disabled on purpose" });
  if (r.allow_update_branch === false) add({ id: "allow-update-branch", group: "merge", severity: "low", current: "off", recommended: "on", step: ["repo", "edit", "{repo}", "--allow-update-branch"] });
  if (r.allow_auto_merge === false) add({ id: "allow-auto-merge", group: "merge", severity: "low", current: "off", recommended: "on", step: ["repo", "edit", "{repo}", "--enable-auto-merge"] });
  if (r.squash_merge_commit_title && r.squash_merge_commit_title !== "PR_TITLE") add({ id: "squash-commit-title", group: "merge", severity: "low",
    current: r.squash_merge_commit_title, recommended: "PR_TITLE", step: ["api", "-X", "PATCH", "repos/{repo}", "-f", "squash_merge_commit_title=PR_TITLE"] });
  if (r.has_wiki === true) add({ id: "wiki", group: "features", severity: "low", current: "on", recommended: "off unless used", step: ["repo", "edit", "{repo}", "--enable-wiki=false"] });
  if (r.has_issues === false) add({ id: "issues", group: "features", severity: "low", current: "off", recommended: "on", step: ["repo", "edit", "{repo}", "--enable-issues"] });

  if (s.vulnerabilityAlerts === false) add({ id: "vulnerability-alerts", group: "dependabot", severity: "high", current: "off", recommended: "on",
    step: ["api", "-X", "PUT", "repos/{repo}/vulnerability-alerts"] });
  if (!s.automatedSecurityFixes?.enabled) add({ id: "automated-security-fixes", group: "dependabot", severity: "high", current: s.automatedSecurityFixes?.paused ? "paused" : "off", recommended: "on",
    step: ["api", "-X", "PUT", "repos/{repo}/automated-security-fixes"], needs: s.vulnerabilityAlerts === false ? ["vulnerability-alerts"] : [] });
  if (s.dependabotConfig === false) add({ id: "dependabot-version-updates", group: "dependabot", severity: "medium", current: "no .github/dependabot.yml", recommended: "a config per ecosystem",
    note: "needs a file — this skill does not commit files; report it" });

  if (pub || paid) {
    if (!on("secret_scanning")) add({ id: "secret-scanning", group: "security", severity: "high", current: "off", recommended: "on", step: ["repo", "edit", "{repo}", "--enable-secret-scanning"],
      note: pub ? undefined : tierNote || "private: needs Secret Protection on Team/Enterprise" });
    if (!on("secret_scanning_push_protection")) add({ id: "push-protection", group: "security", severity: "high", current: "off", recommended: "on",
      step: ["repo", "edit", "{repo}", "--enable-secret-scanning-push-protection"], needs: on("secret_scanning") ? [] : ["secret-scanning"] });
  }
  if (pub && !s.privateVulnerabilityReporting?.enabled) add({ id: "private-vulnerability-reporting", group: "security", severity: "medium", current: "off", recommended: "on",
    step: ["api", "-X", "PUT", "repos/{repo}/private-vulnerability-reporting"] });
  const codeqlWorkflow = s.workflows.some((w) => /codeql/i.test(w.name));
  if (pub && s.codeScanningDefaultSetup?.state !== "configured" && !codeqlWorkflow) add({ id: "code-scanning", group: "security", severity: "medium", current: "not configured", recommended: "default setup",
    step: ["api", "-X", "PATCH", "repos/{repo}/code-scanning/default-setup", "-f", "state=configured"] });

  const aw = s.actionsWorkflow || {};
  if (aw.default_workflow_permissions === "write") add({ id: "workflow-token-permissions", group: "actions", severity: "medium", current: "write", recommended: "read",
    step: ["api", "-X", "PUT", "repos/{repo}/actions/permissions/workflow", "-f", "default_workflow_permissions=read", "-F", "can_approve_pull_request_reviews=false"],
    note: "check that every workflow that writes declares its own permissions: block first" });
  else if (aw.can_approve_pull_request_reviews === true) add({ id: "actions-approve-prs", group: "actions", severity: "medium", current: "Actions may approve PRs", recommended: "not allowed",
    step: ["api", "-X", "PUT", "repos/{repo}/actions/permissions/workflow", "-f", `default_workflow_permissions=${aw.default_workflow_permissions || "read"}`, "-F", "can_approve_pull_request_reviews=false"] });

  // Protection: judged here only on facts; the bypass and check names go to the phase for approval.
  const targetsDefault = (rs) => rs.target === "branch" && rs.enforcement === "active" &&
    (rs.conditions?.ref_name?.include || []).some((x) => x === "~DEFAULT_BRANCH" || x === "~ALL" || x === `refs/heads/${s.defaultBranch}`);
  const rulesets = s.rulesets.filter(targetsDefault);
  const rules = rulesets.flatMap((rs) => (rs.rules || []).map((x) => x.type));
  const bp = s.branchProtection;
  const protectedAtAll = rulesets.length > 0 || bp;
  const rulesetsAllowed = pub || paid;
  if (!protectedAtAll) {
    if (rulesetsAllowed) add({ id: "protect-default-branch", group: "protection", severity: "high", current: "unprotected", recommended: "ruleset: deletion, non_fast_forward, pull_request, required checks", note: pub ? undefined : tierNote });
  } else {
    for (const t of ["deletion", "non_fast_forward", "pull_request"])
      if (rulesets.length && !rules.includes(t)) add({ id: `ruleset-${t}`, group: "protection", severity: "medium", current: "missing", recommended: `add the ${t} rule` });
    if (bp && !rulesets.length) add({ id: "classic-branch-protection", group: "protection", severity: "low", current: "classic branch protection", recommended: "a ruleset (visible to readers, can be disabled without deleting)",
      note: "rulesets stack with classic protection; removing the classic one is a manual step in Settings" });
  }
  const required = [
    ...rulesets.flatMap((rs) => (rs.rules || []).filter((x) => x.type === "required_status_checks").flatMap((x) => x.parameters?.required_status_checks?.map((c) => c.context) || [])),
    ...(bp?.requiredChecks || []),
  ];
  if (protectedAtAll && required.length === 0) add({ id: "required-status-checks", group: "protection", severity: "high", current: "none required", recommended: "the checks that run on pull requests",
    note: s.lastMergedPr?.checks?.length ? `checks seen on PR #${s.lastMergedPr.number}: ${s.lastMergedPr.checks.join(", ")}` : "no merged PR with checks found — read the pull_request workflows" });
  const seen = new Set(s.lastMergedPr?.checks || []);
  if (s.lastMergedPr) for (const c of required) if (!seen.has(c)) add({ id: `required-check-never-ran:${c}`, group: "protection", severity: "high", current: `"${c}" is required`,
    recommended: "a name that really runs", note: `not among the checks of the last merged PR #${s.lastMergedPr.number} — pull requests may wait forever` });

  const bypassIds = rulesets.flatMap((rs) => (rs.bypass_actors || []).map((b) => `${b.actor_type}:${b.actor_id}`));
  for (const w of s.workflows.filter((x) => x.onPushToDefault && x.pusherLines.some((h) => !h.commented))) {
    const ev = w.pusherLines.find((h) => !h.commented);
    if (!rulesets.length && !bp) continue; // nothing blocks it yet; the ruleset proposal must include the bypass
    if (!w.usesAppToken && !bypassIds.includes(`Integration:${GITHUB_ACTIONS_APP_ID}`)) add({ id: `release-bypass:${w.name}`, group: "protection", severity: "high",
      current: "no bypass for GitHub Actions", recommended: "bypass Integration 15368 (always)", note: `${w.name}:${ev.line} ${ev.text} — pushes to ${s.defaultBranch} and will be rejected` });
    if (w.usesAppToken) add({ id: `release-bypass-app:${w.name}`, group: "protection", severity: "medium", current: `bypass actors: ${bypassIds.join(", ") || "none"}`,
      recommended: "a bypass for the app that creates the token", note: `${w.name}:${ev.line} uses an app token — confirm its app id is in the bypass list` });
  }

  if (!rulesetsAllowed && tier !== "Unknown") add({ id: "protection-not-available", group: "protection", severity: "low", current: `private on ${tier}`, recommended: "Pro or higher, or public", note: "rulesets and branch protection need Pro+ for private repositories" });
  return f;
}

function main(argv) {
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : null;
  const repo = argv.find((a, i) => !a.startsWith("--") && !(outIdx >= 0 && i === outIdx + 1));
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) { console.error("usage: read-settings.mjs <owner/repo> [--out <file>]"); return 2; }
  const res = snapshot(repo);
  if (res.error) { console.error(res.error); return 1; }
  const doc = { repo, snapshot: res.snapshot, findings: compare(res.snapshot), unreadable: res.unreadable };
  const text = JSON.stringify(doc, null, 2);
  console.log(text);
  if (out) { try { writeFileSync(out, text + "\n"); } catch (e) { console.error(`cannot write ${out}: ${e.message}; the result is on stdout`); } }
  return 0;
}

const invokedDirectly = (() => { try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; } catch { return false; } })();
if (invokedDirectly) process.exit(main(process.argv.slice(2)));

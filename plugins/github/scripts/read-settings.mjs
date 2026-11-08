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
import { writeFileSync } from "node:fs";

const GH = process.env.GH_BIN || "gh";
const GITHUB_ACTIONS_APP_ID = 15368; // the integration id GITHUB_TOKEN pushes as

function gh(args) {
  const p = spawnSync(GH, args, { encoding: "utf8" });
  return { code: p.status ?? 1, stdout: (p.stdout || "").trim(), stderr: (p.stderr || p.error?.message || "").trim() };
}
const json = (res) => { try { return JSON.parse(res.stdout); } catch { return null; } };
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

  const owner = info.owner?.login;
  const tierRes = info.owner?.type === "Organization" ? api(`orgs/${owner}`, ["--jq", ".plan.name // \"unknown\""]) : api("user", ["--jq", ".plan.name // \"unknown\""]);
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
    vulnerabilityAlerts: api(`repos/${repo}/vulnerability-alerts`).code === 0,
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

  const list = read("rulesets", api(`repos/${repo}/rulesets`)) || [];
  for (const r of list) {
    const full = read(`ruleset ${r.id}`, api(`repos/${repo}/rulesets/${r.id}`));
    if (full) snap.rulesets.push(pick(full, ["id", "name", "target", "enforcement", "conditions", "bypass_actors", "rules"]));
  }

  const bp = api(`repos/${repo}/branches/${branch}/protection`);
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

  const wf = api(`repos/${repo}/contents/.github/workflows`, ["--jq", ".[].name"]);
  for (const name of wf.code === 0 ? wf.stdout.split("\n").filter(Boolean) : []) {
    const raw = api(`repos/${repo}/contents/.github/workflows/${name}`, ["-H", "Accept: application/vnd.github.raw"]);
    if (raw.code !== 0) { unreadable.push({ key: `workflow ${name}`, error: raw.stderr.split("\n")[0] }); continue; }
    snap.workflows.push(scanWorkflow(name, raw.stdout, branch));
  }

  snap.dependabotConfig = [".github/dependabot.yml", ".github/dependabot.yaml"].some((f) => api(`repos/${repo}/contents/${f}`, ["--jq", ".name"]).code === 0);

  const pr = api(`repos/${repo}/pulls?state=closed&per_page=20`, ["--jq", "[.[] | select(.merged_at != null)][0] | {number, sha: .merge_commit_sha, head: .head.sha}"]);
  const last = pr.code === 0 ? json(pr) : null;
  if (last?.head) {
    const runs = api(`repos/${repo}/commits/${last.head}/check-runs?per_page=100`, ["--jq", "[.check_runs[].name]"]);
    snap.lastMergedPr = { number: last.number, checks: (runs.code === 0 ? json(runs) : null) || [] };
  }

  return { snapshot: snap, unreadable };
}

function pick(o, keys) { return Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]])); }

export function scanWorkflow(name, text, branch) {
  const lines = text.split("\n");
  const onPushToDefault = /(^|\n)\s*push:/.test(text) && (new RegExp(`branches:[^\\n]*\\b${branch}\\b`).test(text) || new RegExp(`-\\s*["']?${branch}["']?\\s*$`, "m").test(text));
  const hits = [];
  lines.forEach((l, i) => { if (PUSHER.test(l)) hits.push({ line: i + 1, text: l.trim().slice(0, 120), commented: /^\s*#/.test(l) }); });
  const usesAppToken = hits.some((h) => /app-token/.test(h.text));
  const secrets = [...new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]).filter((n) => n !== "GITHUB_TOKEN"))];
  const pullRequestJobs = /(^|\n)\s*pull_request(_target)?:/.test(text) || /on:\s*\[[^\]]*pull_request/.test(text);
  return { name, onPushToDefault, pusherLines: hits, usesAppToken, secrets, pullRequestTrigger: pullRequestJobs };
}

const tierOf = (plan) => ({ free: "Free", pro: "Pro", team: "Team", business: "Team" })[plan] || (/enterprise/.test(plan) ? "Enterprise" : "Free");

// Each finding: { id, group, severity: high|medium|low, current, recommended, step? , note? }.
// `step` is a ready plan step (args with {repo}) when the fix is one catalog command.
export function compare(s) {
  const f = [];
  const add = (x) => f.push(x);
  const r = s.repo || {};
  const pub = s.visibility === "public";
  const tier = tierOf(s.planName);
  const paid = tier !== "Free";
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

  if (!s.vulnerabilityAlerts) add({ id: "vulnerability-alerts", group: "dependabot", severity: "high", current: "off", recommended: "on",
    step: ["api", "-X", "PUT", "repos/{repo}/vulnerability-alerts"] });
  if (!s.automatedSecurityFixes?.enabled) add({ id: "automated-security-fixes", group: "dependabot", severity: "high", current: s.automatedSecurityFixes?.paused ? "paused" : "off", recommended: "on",
    step: ["api", "-X", "PUT", "repos/{repo}/automated-security-fixes"], needs: s.vulnerabilityAlerts ? [] : ["vulnerability-alerts"] });
  if (!s.dependabotConfig) add({ id: "dependabot-version-updates", group: "dependabot", severity: "medium", current: "no .github/dependabot.yml", recommended: "a config per ecosystem",
    note: "needs a file — this skill does not commit files; report it" });

  if (pub || paid) {
    if (!on("secret_scanning")) add({ id: "secret-scanning", group: "security", severity: "high", current: "off", recommended: "on", step: ["repo", "edit", "{repo}", "--enable-secret-scanning"],
      note: pub ? undefined : "private: needs Secret Protection on Team/Enterprise" });
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
    if (rulesetsAllowed) add({ id: "protect-default-branch", group: "protection", severity: "high", current: "unprotected", recommended: "ruleset: deletion, non_fast_forward, pull_request, required checks" });
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

  if (!rulesetsAllowed) add({ id: "protection-not-available", group: "protection", severity: "low", current: `private on ${tier}`, recommended: "Pro or higher, or public", note: "rulesets and branch protection need Pro+ for private repositories" });
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

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));

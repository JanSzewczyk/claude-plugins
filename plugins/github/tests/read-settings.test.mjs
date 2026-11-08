// Offline tests for the comparison half of read-settings.mjs.
// Run: node --test plugins/github/tests/read-settings.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compare, scanWorkflow, pushesTo } from "../scripts/read-settings.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "../scripts/read-settings.mjs");

const good = () => ({
  visibility: "public", planName: "free", defaultBranch: "main",
  repo: {
    has_issues: true, has_wiki: false, allow_merge_commit: true, allow_squash_merge: true, allow_rebase_merge: true,
    delete_branch_on_merge: true, allow_auto_merge: true, allow_update_branch: true, squash_merge_commit_title: "PR_TITLE",
    security_and_analysis: { secret_scanning: { status: "enabled" }, secret_scanning_push_protection: { status: "enabled" } },
  },
  vulnerabilityAlerts: true, automatedSecurityFixes: { enabled: true }, privateVulnerabilityReporting: { enabled: true },
  codeScanningDefaultSetup: { state: "configured" }, actionsWorkflow: { default_workflow_permissions: "read", can_approve_pull_request_reviews: false },
  rulesets: [{ id: 1, target: "branch", enforcement: "active", conditions: { ref_name: { include: ["~DEFAULT_BRANCH"] } },
    bypass_actors: [{ actor_type: "Integration", actor_id: 15368, bypass_mode: "always" }],
    rules: [{ type: "deletion" }, { type: "non_fast_forward" }, { type: "pull_request" },
      { type: "required_status_checks", parameters: { required_status_checks: [{ context: "Build" }] } }] }],
  branchProtection: null, dependabotConfig: true,
  workflows: [scanWorkflow("release.yml", "on:\n  push:\n    branches: [main]\njobs:\n  r:\n    steps:\n      - run: npx semantic-release\n        env:\n          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}\n", "main")],
  lastMergedPr: { number: 7, checks: ["Build", "Lint"] },
});
const ids = (s) => compare(s).map((f) => f.id);

test("a well-configured repository has no findings", () => assert.deepEqual(ids(good()), []));

test("an unprotected public repository gets a high protect finding", () => {
  const s = good(); s.rulesets = [];
  const f = compare(s).find((x) => x.id === "protect-default-branch");
  assert.equal(f.severity, "high");
});

test("a release workflow without a GitHub Actions bypass is high, with file:line evidence", () => {
  const s = good(); s.rulesets[0].bypass_actors = [];
  const f = compare(s).find((x) => x.id === "release-bypass:release.yml");
  assert.equal(f.severity, "high");
  assert.match(f.note, /release\.yml:7 - run: npx semantic-release/);
});

test("a commented-out release step is not a pusher", () => {
  const s = good(); s.rulesets[0].bypass_actors = [];
  s.workflows = [scanWorkflow("release.yml", "on:\n  push:\n    branches: [main]\n#      - run: npm run semantic-release\n", "main")];
  assert.ok(!ids(s).some((x) => x.startsWith("release-bypass")));
});

test("a required check that never ran is high; no required checks at all is high", () => {
  const s = good(); s.rulesets[0].rules[3].parameters.required_status_checks = [{ context: "Old CI" }];
  assert.ok(ids(s).includes("required-check-never-ran:Old CI"));
  s.rulesets[0].rules.pop();
  assert.ok(ids(s).includes("required-status-checks"));
});

test("security updates need alerts first, push protection needs scanning first", () => {
  const s = good(); s.vulnerabilityAlerts = false; s.automatedSecurityFixes = { enabled: false };
  s.repo.security_and_analysis = {};
  const f = compare(s);
  assert.deepEqual(f.find((x) => x.id === "automated-security-fixes").needs, ["vulnerability-alerts"]);
  assert.deepEqual(f.find((x) => x.id === "push-protection").needs, ["secret-scanning"]);
});

test("a private repository on Free gets no security or protection fixes it cannot have", () => {
  const s = good(); s.visibility = "private"; s.rulesets = []; s.repo.security_and_analysis = {};
  const got = ids(s);
  assert.ok(!got.includes("secret-scanning") && !got.includes("protect-default-branch"));
  assert.ok(got.includes("protection-not-available"));
});

test("scanWorkflow collects secrets and the pull_request trigger", () => {
  const w = scanWorkflow("ci.yml", "on:\n  pull_request:\njobs:\n  t:\n    env:\n      A: ${{ secrets.TOKEN_A }}\n      G: ${{ secrets.GITHUB_TOKEN }}\n", "main");
  assert.deepEqual(w.secrets, ["TOKEN_A"]);
  assert.equal(w.pullRequestTrigger, true);
  assert.equal(w.onPushToDefault, false);
});

test("pushesTo: bare push, on: [push], a push branch filter, and pull_request-only filters", () => {
  assert.equal(pushesTo("on: push\n", "main"), true);
  assert.equal(pushesTo("on: [push, pull_request]\n", "main"), true);
  assert.equal(pushesTo("on:\n  push:\njobs: {}\n", "main"), true);
  assert.equal(pushesTo("on:\n  push:\n    branches: [main]\n", "main"), true);
  assert.equal(pushesTo("on:\n  push:\n    branches:\n      - main\n", "main"), true);
  assert.equal(pushesTo("on:\n  push:\n    branches: [develop]\n", "main"), false);
  assert.equal(pushesTo("on:\n  pull_request:\n    branches: [main]\n", "main"), false);
  assert.equal(pushesTo("on:\n  push:\n    tags: ['v*']\n    branches: ['**']\n", "main"), true);
});

test("pushesTo escapes the branch name", () => {
  assert.equal(pushesTo("on:\n  push:\n    branches: [release-1x0]\n", "release-1.0"), false);
  assert.equal(pushesTo("on:\n  push:\n    branches: [release-1.0]\n", "release-1.0"), true);
});

test("an unread setting (null) raises no finding; only a confirmed off does", () => {
  const s = good(); s.vulnerabilityAlerts = null; s.dependabotConfig = null;
  const got = ids(s);
  assert.ok(!got.includes("vulnerability-alerts") && !got.includes("dependabot-version-updates"));
  s.vulnerabilityAlerts = false; s.dependabotConfig = false;
  assert.ok(ids(s).includes("vulnerability-alerts") && ids(s).includes("dependabot-version-updates"));
});

test("an unknown tier keeps private-repo findings, with a note, and no false 'not available'", () => {
  const s = good(); s.visibility = "private"; s.planName = "unknown"; s.rulesets = []; s.repo.security_and_analysis = {};
  const f = compare(s);
  assert.ok(f.some((x) => x.id === "protect-default-branch"));
  assert.match(f.find((x) => x.id === "secret-scanning").note, /tier not visible/);
  assert.ok(!f.some((x) => x.id === "protection-not-available"));
});

function fakeGh(dir, script) {
  const bin = join(dir, "gh");
  writeFileSync(bin, `#!/usr/bin/env node\nconst a = process.argv.slice(2).join(" ");\n${script}\n`);
  chmodSync(bin, 0o755);
  return bin;
}

test("errors other than 404 land in unreadable instead of reading as off", () => {
  const dir = mkdtempSync(join(tmpdir(), "read-settings-"));
  const gh = fakeGh(dir, `
const repo = JSON.stringify({ visibility: "public", default_branch: "main", permissions: { admin: true }, owner: { login: "o", type: "User" } });
if (a === "api repos/o/r") { console.log(repo); process.exit(0); }
if (a.startsWith("api user")) { console.log("free"); process.exit(0); }
if (a.includes("vulnerability-alerts") || a.includes("protection") || a.includes(".github/workflows") || a.includes("dependabot")) { console.error("HTTP 403: Resource not accessible"); process.exit(1); }
if (a.includes("rulesets")) { process.exit(0); }
console.log("{}"); process.exit(0);`);
  const p = spawnSync("node", [SCRIPT, "o/r"], { encoding: "utf8", env: { ...process.env, GH_BIN: gh } });
  assert.equal(p.status, 0, p.stderr);
  const d = JSON.parse(p.stdout);
  const keys = d.unreadable.map((u) => u.key);
  for (const k of ["vulnerabilityAlerts", "branchProtection", "workflows", "dependabotConfig"]) assert.ok(keys.includes(k), k);
  const got = d.findings.map((f) => f.id);
  assert.ok(!got.includes("vulnerability-alerts") && !got.includes("dependabot-version-updates"));
});

test("an empty repository with no default branch stops with exit 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "read-settings-"));
  const gh = fakeGh(dir, `console.log(JSON.stringify({ visibility: "public", default_branch: null, permissions: { admin: true }, owner: { login: "o", type: "User" } }));`);
  const p = spawnSync("node", [SCRIPT, "o/r"], { encoding: "utf8", env: { ...process.env, GH_BIN: gh } });
  assert.equal(p.status, 1);
  assert.match(p.stderr, /no default branch/);
});

test("the script runs when invoked through a symlinked path with a space", () => {
  const dir = mkdtempSync(join(tmpdir(), "read settings "));
  const link = join(dir, "link.mjs");
  spawnSync("ln", ["-s", SCRIPT, link]);
  const p = spawnSync("node", [link], { encoding: "utf8" });
  assert.equal(p.status, 2, "usage error means main() ran");
});

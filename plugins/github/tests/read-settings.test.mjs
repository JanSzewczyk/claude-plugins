// Offline tests for the comparison half of read-settings.mjs.
// Run: node --test plugins/github/tests/read-settings.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, scanWorkflow } from "../scripts/read-settings.mjs";

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

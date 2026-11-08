// Offline tests for apply-plan.mjs. A fake gh (written to a temp dir) logs every call and
// fails the ones whose arguments contain FAKE_GH_FAIL.
// Run: node --test plugins/github/tests/apply-plan.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePlan, createArgs, orderSteps } from "../scripts/apply-plan.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "../scripts/apply-plan.mjs");

function fakeGh(dir) {
  const bin = join(dir, "gh");
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
let input = "";
try { input = fs.readFileSync(0, "utf8"); } catch {}
fs.appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify({ args, input }) + "\\n");
const fail = process.env.FAKE_GH_FAIL;
if (fail && args.join(" ").includes(fail)) { console.error("HTTP 403: not available"); process.exit(1); }
if (args.join(" ").includes("commits?per_page=1")) console.log("abc123");
else if (args[0] === "repo" && args[1] === "view") console.log('{"visibility":"PUBLIC"}');
else if (args[0] === "api") console.log("{}");
`);
  chmodSync(bin, 0o755);
  return bin;
}

function run(plan, { fail, dryRun, approve = true, tamper, out } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "apply-plan-"));
  const log = join(dir, "log.jsonl");
  const planFile = join(dir, "05-plan.json");
  writeFileSync(planFile, JSON.stringify(plan));
  const env = { ...process.env, GH_BIN: fakeGh(dir), FAKE_GH_LOG: log, FAKE_GH_FAIL: fail || "", APPLY_PLAN_WAIT_MS: "1" };
  if (approve && !dryRun) spawnSync("node", [SCRIPT, planFile, "--approve"], { encoding: "utf8", env });
  if (tamper) writeFileSync(planFile, JSON.stringify(tamper(plan)));
  const p = spawnSync("node", [SCRIPT, planFile, ...(dryRun ? ["--dry-run"] : []), "--out", out || join(dir, "out.json")], {
    encoding: "utf8", env,
  });
  const calls = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { code: p.status, report: p.stdout ? JSON.parse(p.stdout) : null, stderr: p.stderr, calls, dir };
}

const base = () => ({
  repo: { owner: "me", name: "demo", visibility: "public", description: "Demo service.", template: "me/tpl" },
  steps: [
    { id: "ruleset", group: "protection", args: ["api", "-X", "POST", "repos/{repo}/rulesets", "--input", "-"], body: { name: "default-branch" } },
    { id: "merge", group: "merge", args: ["repo", "edit", "{repo}", "--delete-branch-on-merge"] },
    { id: "alerts", group: "dependabot", args: ["api", "-X", "PUT", "repos/{repo}/vulnerability-alerts"] },
    { id: "fixes", group: "dependabot", needs: ["alerts"], args: ["api", "-X", "PUT", "repos/{repo}/automated-security-fixes"] },
  ],
});

test("validatePlan accepts a good plan", () => assert.deepEqual(validatePlan(base()), []));

test("validatePlan rejects forbidden commands", () => {
  for (const args of [["repo", "delete", "{repo}"], ["secret", "set", "X"], ["auth", "refresh"], ["api", "-X", "DELETE", "repos/{repo}"], ["api", "--method=DELETE", "x"]]) {
    const p = base();
    p.steps.push({ id: "bad", args });
    assert.ok(validatePlan(p).some((e) => e.includes("not allowed")), args.join(" "));
  }
});

test("validatePlan rejects a template combined with starter files, and unknown needs", () => {
  const p = base();
  p.repo.license = "mit";
  p.steps[3].needs = ["nope"];
  const errors = validatePlan(p);
  assert.ok(errors.some((e) => e.includes("template cannot be combined")));
  assert.ok(errors.some((e) => e.includes("unknown step")));
});

test("createArgs builds the empty-repo variant", () => {
  assert.deepEqual(createArgs({ owner: "o", name: "n", visibility: "private", gitignore: "Node", license: "mit", addReadme: true }),
    ["repo", "create", "o/n", "--private", "--gitignore", "Node", "--license", "mit", "--add-readme"]);
});

test("orderSteps moves protection last and keeps the rest in order", () => {
  assert.deepEqual(orderSteps(base().steps).map((s) => s.id), ["merge", "alerts", "fixes", "ruleset"]);
});

test("apply creates, waits, runs steps in order, sends the body on stdin, reads back", () => {
  const { code, report, calls } = run(base());
  assert.equal(code, 0);
  assert.equal(report.create.status, "ok");
  assert.equal(report.waitedForCommit, true);
  assert.deepEqual(report.steps.map((s) => [s.id, s.status]), [["merge", "ok"], ["alerts", "ok"], ["fixes", "ok"], ["ruleset", "ok"]]);
  assert.deepEqual(calls[0].args.slice(0, 4), ["repo", "create", "me/demo", "--public"]);
  const rs = calls.find((c) => c.args.includes("repos/me/demo/rulesets") && c.args.includes("POST"));
  assert.deepEqual(JSON.parse(rs.input), { name: "default-branch" });
  assert.ok(report.readBack.repository);
});

test("a failed step skips the steps that need it but not the others", () => {
  const { code, report } = run(base(), { fail: "vulnerability-alerts" });
  assert.equal(code, 0);
  const st = Object.fromEntries(report.steps.map((s) => [s.id, s.status]));
  assert.deepEqual(st, { merge: "ok", alerts: "failed", fixes: "skipped", ruleset: "ok" });
});

test("a failed create stops everything", () => {
  const { code, report, calls } = run(base(), { fail: "repo create" });
  assert.equal(code, 1);
  assert.equal(report.create.status, "failed");
  assert.equal(calls.length, 1);
});

test("dry run calls nothing", () => {
  const { code, report, calls } = run(base(), { dryRun: true });
  assert.equal(code, 0);
  assert.equal(calls.length, 0);
  assert.ok(report.steps.every((s) => s.status === "planned"));
});

test("an invalid plan exits 2 without calling gh", () => {
  const p = base();
  p.repo.visibility = "secret";
  const { code, calls } = run(p);
  assert.equal(code, 2);
  assert.equal(calls.length, 0);
});

test("apply without approval exits 2 and calls nothing", () => {
  const { code, calls, stderr } = run(base(), { approve: false });
  assert.equal(code, 2);
  assert.equal(calls.length, 0);
  assert.match(stderr, /no approval/);
});

test("a plan edited after approval exits 2 and calls nothing", () => {
  const { code, calls, stderr } = run(base(), { tamper: (p) => ({ ...p, repo: { ...p.repo, visibility: "private" } }) });
  assert.equal(code, 2);
  assert.equal(calls.length, 0);
  assert.match(stderr, /changed after it was approved/);
});

test("--approve writes the plan sha256 beside it", () => {
  const dir = mkdtempSync(join(tmpdir(), "apply-plan-"));
  const planFile = join(dir, "05-plan.json");
  writeFileSync(planFile, JSON.stringify(base()));
  const p = spawnSync("node", [SCRIPT, planFile, "--approve"], { encoding: "utf8" });
  assert.equal(p.status, 0);
  const a = JSON.parse(readFileSync(join(dir, "05-approved"), "utf8"));
  assert.match(a.sha256, /^[0-9a-f]{64}$/);
});

test("validatePlan rejects non-string args and a non-object body", () => {
  const p = base();
  p.steps.push({ id: "num", args: ["api", 5] });
  p.steps[0].body = "<placeholder>";
  const errors = validatePlan(p);
  assert.ok(errors.some((e) => e.includes("every arg must be a string")));
  assert.ok(errors.some((e) => e.includes("body must be a JSON object")));
});

test("an unwritable --out after a successful create exits 3 with the report on stdout", () => {
  const { code, report } = run(base(), { out: "/nonexistent-dir/out.json" });
  assert.equal(code, 3);
  assert.equal(report.create.status, "ok");
});

test("an existing repository skips create and the commit wait", () => {
  const p = base();
  p.repo = { owner: "me", name: "demo", existing: true };
  const { code, report, calls } = run(p);
  assert.equal(code, 0);
  assert.equal(report.create.status, "existing");
  assert.equal(report.waitedForCommit, null);
  assert.ok(!calls.some((c) => c.args[1] === "create"));
  assert.deepEqual(report.steps.map((s) => s.status), ["ok", "ok", "ok", "ok"]);
});

test("an existing repository rejects creation fields", () => {
  const p = base();
  p.repo = { owner: "me", name: "demo", existing: true, visibility: "public" };
  assert.ok(validatePlan(p).some((e) => e.includes("existing repository takes no creation fields")));
});

test("the approval file follows the plan's number", () => {
  const dir = mkdtempSync(join(tmpdir(), "apply-plan-"));
  const planFile = join(dir, "04-plan.json");
  writeFileSync(planFile, JSON.stringify(base()));
  spawnSync("node", [SCRIPT, planFile, "--approve"], { encoding: "utf8" });
  assert.ok(existsSync(join(dir, "04-approved")));
});

// Runs the planner against throwaway git repos: per-plugin tags, the documented manifest location,
// a tree with a single uncommitted edit. Each test is a way the plan used to say "nothing to
// release" or to write the wrong line.
//
// Usage: node --test plugins/plugin-dev/skills/plugin-release/tests/plan-release.test.mjs

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

const SCRIPT = resolve(import.meta.dirname, "../scripts/plan-release.mjs");

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "release-"));
  execFileSync("git", ["-C", root, "init", "-q"]);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

const git = (...args) => execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", ...args], { encoding: "utf8" });
function commit(message) {
  git("add", "-A");
  git("commit", "-qm", message);
}

function marketplace(plugins) {
  write(".claude-plugin/marketplace.json", { name: "m", owner: { name: "X" }, plugins });
}

function plugin(dir, name, manifest = "plugin.json") {
  write(`${dir}/${manifest}`, { name, version: "1.0.0" });
  write(`${dir}/skills/hello/SKILL.md`, "---\nname: hello\ndescription: Hi\n---\nHi\n");
}

function run(...args) {
  const out = spawnSync(process.execPath, [SCRIPT, root, "--json", ...args], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  return JSON.parse(out.stdout);
}

const planFor = (report, name) => report.plans.find((p) => p.plugin === name);

test("a single uncommitted edit is seen", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  commit("base");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  const plan = planFor(run("--since", "HEAD"), "foo");
  assert.deepEqual(plan?.touched, ["plugins/foo/skills/hello/SKILL.md"]);
  assert.equal(plan.bump, "patch");
});

test("uncommitted paths with spaces and renames stay intact", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  commit("base");
  write("plugins/foo/skills/new one/SKILL.md", "---\nname: x\n---\n");
  git("mv", "plugins/foo/skills/hello", "plugins/foo/skills/renamed");
  const plan = planFor(run("--since", "HEAD"), "foo");
  assert.equal(plan.bump, "major");
  assert.ok(plan.reasons.includes("new skill: new one"));
  assert.ok(plan.reasons.includes("skill removed or renamed: hello"));
});

test("each plugin compares against its own last tag", () => {
  marketplace([
    { name: "foo", source: "./plugins/foo" },
    { name: "bar", source: "./plugins/bar" },
  ]);
  plugin("plugins/foo", "foo");
  plugin("plugins/bar", "bar");
  commit("base");
  git("tag", "foo--v1.0.0");
  git("tag", "bar--v1.0.0");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  commit("foo change");
  write("plugins/bar/plugin.json", { name: "bar", version: "1.0.1" });
  commit("bar release");
  git("tag", "bar--v1.0.1");

  const report = run();
  assert.equal(planFor(report, "foo").since, "foo--v1.0.0");
  assert.equal(planFor(report, "foo").proposedVersion, "1.0.1");
  assert.equal(planFor(report, "bar"), undefined, "bar has nothing since its tag");
});

test("a plugin never tagged in a repo that tags is a first release, not a bump", () => {
  marketplace([
    { name: "foo", source: "./plugins/foo" },
    { name: "bar", source: "./plugins/bar" },
  ]);
  plugin("plugins/foo", "foo");
  plugin("plugins/bar", "bar");
  commit("base");
  git("tag", "foo--v1.0.0");
  const plan = planFor(run(), "bar");
  assert.equal(plan.firstRelease, true);
  assert.equal(plan.bump, "none");
  assert.equal(plan.proposedVersion, "1.0.0");
});

test("a repo with one plain tag still compares against it", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  commit("base");
  git("tag", "v1.0.0");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  commit("change");
  assert.equal(planFor(run(), "foo").since, "v1.0.0");
});

test("the manifest in .claude-plugin/ is planned and written", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo", ".claude-plugin/plugin.json");
  commit("base");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  commit("change");
  const plan = planFor(run("--since", "HEAD~1", "--apply"), "foo");
  assert.equal(plan.applied, true);
  assert.equal(JSON.parse(readFileSync(join(root, "plugins/foo/.claude-plugin/plugin.json"))).version, "1.0.1");
});

test("plugins are found through source, and a remote one is named as not planned", () => {
  marketplace([
    { name: "foo", source: "./packages/foo" },
    { name: "ext", source: { source: "github", repo: "o/r" } },
  ]);
  plugin("packages/foo", "foo");
  commit("base");
  appendFileSync(join(root, "packages/foo/skills/hello/SKILL.md"), "more\n");
  const report = run("--since", "HEAD");
  assert.equal(planFor(report, "foo").tagCommand, "claude plugin tag packages/foo");
  assert.equal(report.notPlanned[0].plugin, "ext");
});

test("--apply rewrites the plugin's version, not a dependency's, and keeps the formatting", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  const raw = '{\n  "name": "foo",\n  "dependencies": [{ "name": "z", "version": "^9.9.9" }],\n  "keywords": ["a", "b"],\n  "version": "1.0.0"\n}\n';
  write("plugins/foo/plugin.json", raw);
  commit("base");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  run("--since", "HEAD", "--apply");
  assert.equal(readFileSync(join(root, "plugins/foo/plugin.json"), "utf8"), raw.replace('"version": "1.0.0"', '"version": "1.0.1"'));
});

test("--apply keeps a version in the marketplace entry in step", () => {
  marketplace([
    { name: "bar", source: "./plugins/bar", version: "5.0.0" },
    { name: "foo", source: "./plugins/foo", version: "1.0.0" },
  ]);
  plugin("plugins/foo", "foo");
  plugin("plugins/bar", "bar");
  write("plugins/bar/plugin.json", { name: "bar" });
  commit("base");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  run("--since", "HEAD", "--apply");
  const written = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json")));
  assert.equal(written.plugins.find((p) => p.name === "foo").version, "1.0.1");
  assert.equal(written.plugins.find((p) => p.name === "bar").version, "5.0.0");
  assert.equal(JSON.parse(readFileSync(join(root, "plugins/foo/plugin.json"))).version, "1.0.1");
});

test("a plugin without a version says so instead of proposing a bump", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  write("plugins/foo/plugin.json", { name: "foo" });
  commit("base");
  appendFileSync(join(root, "plugins/foo/skills/hello/SKILL.md"), "more\n");
  const report = run("--since", "HEAD");
  assert.equal(report.plans.length, 0);
  assert.match(report.notPlanned[0].reason, /no version/);
});

test("only agents that carry their own version are flagged for a bump", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  write("plugins/foo/agents/plain.md", "---\nname: plain\ndescription: x\n---\n");
  write("plugins/foo/agents/versioned.md", "---\nname: versioned\nversion: 1.0.0\ndescription: x\n---\n");
  commit("base");
  appendFileSync(join(root, "plugins/foo/agents/plain.md"), "more\n");
  appendFileSync(join(root, "plugins/foo/agents/versioned.md"), "more\n");
  assert.deepEqual(planFor(run("--since", "HEAD"), "foo").agentsNeedingOwnBump, ["versioned"]);
});

test("an unknown --plugin fails instead of reporting nothing to release", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  commit("base");
  const out = spawnSync(process.execPath, [SCRIPT, root, "--plugin", "nope"], { encoding: "utf8" });
  assert.equal(out.status, 1);
  assert.match(out.stderr, /no plugin named "nope"/);
});

function runCheck(...args) {
  const out = spawnSync(process.execPath, [SCRIPT, root, "--json", "--check", ...args], { encoding: "utf8" });
  return { status: out.status, ...JSON.parse(out.stdout) };
}

test("--check fails on a changed plugin without a bump and passes once it is bumped", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo", ".claude-plugin/plugin.json");
  commit("base");
  write("plugins/foo/skills/second/SKILL.md", "---\nname: second\ndescription: Two\n---\nTwo\n");
  const missing = runCheck("--since", "HEAD");
  assert.equal(missing.status, 1);
  assert.equal(missing.missing[0].plugin, "foo");

  write("plugins/foo/.claude-plugin/plugin.json", { name: "foo", version: "1.0.1" });
  const small = runCheck("--since", "HEAD");
  assert.equal(small.status, 0);
  assert.equal(small.tooSmall[0].kind, "minor");
});

test("--check reads the old version from a manifest that moved into .claude-plugin/", () => {
  marketplace([{ name: "foo", source: "./plugins/foo" }]);
  plugin("plugins/foo", "foo");
  commit("base");
  mkdirSync(join(root, "plugins/foo/.claude-plugin"));
  git("mv", "plugins/foo/plugin.json", "plugins/foo/.claude-plugin/plugin.json");
  write("plugins/foo/.claude-plugin/plugin.json", { name: "foo", version: "1.0.1" });
  const report = runCheck("--since", "HEAD");
  assert.equal(report.status, 0);
  assert.deepEqual(report.missing, []);
});

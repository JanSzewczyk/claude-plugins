// Runs the marketplace audit against throwaway marketplaces shaped like other people's repos, because the
// script's own repo is the one layout that never exposes a hard-coded assumption. The last test
// checks the repository itself.
//
// Usage: node --test plugins/plugin-dev/skills/marketplace-creator/tests/check-marketplace.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");
const SCRIPT = resolve(import.meta.dirname, "../scripts/check-marketplace.mjs");

const ATTRIBUTION = {
  author: { name: "X", email: "x@x.io", url: "https://x.io" },
  homepage: "https://x.io",
  license: "MIT",
};

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "marketplace-audit-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

function marketplace(plugins, extra = {}) {
  write(".claude-plugin/marketplace.json", { $schema: "https://x.io/m.json", name: "m", owner: { name: "X" }, plugins, ...extra });
}

// A plugin as the documentation lays it out: manifest in .claude-plugin/, official frontmatter
// keys, an agents/ folder discovered by the default scan, a YAML list for skills:.
function plugin(dir, name = "foo") {
  write(`${dir}/.claude-plugin/plugin.json`, { $schema: "https://x.io/p.json", name, displayName: "Foo", keywords: ["a"], version: "1.0.0", ...ATTRIBUTION });
  write(`${dir}/skills/hello/SKILL.md`, "---\nname: hello\ndescription: Says hello\nlicense: MIT\ndisable-model-invocation: true\n---\nHi\n");
  write(`${dir}/agents/rev.md`, "---\nname: rev\ndescription: Reviews\nmodel: sonnet\nskills:\n  - hello\n---\nHi\n");
  write(`${dir}/README.md`, "# Foo\n\nUse hello, or the rev agent.\n");
}

function run(...args) {
  const out = spawnSync(process.execPath, [SCRIPT, root, "--json", "--no-native", ...args], { encoding: "utf8" });
  assert.equal(out.stderr, "", "the script must not crash");
  return { status: out.status, ...JSON.parse(out.stdout) };
}

const messages = (report) => report.issues.map((i) => i.message);

test("reads the manifest from .claude-plugin/ and audits the plugin", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  const report = run();
  assert.equal(report.status, 0, messages(report).join("\n"));
  assert.deepEqual(report.plugins.foo.skills, ["hello"]);
  assert.deepEqual(report.plugins.foo.agents, ["rev"]);
  assert.equal(report.plugins.foo.version, "1.0.0");
  assert.deepEqual(messages(report), []);
});

test("still reads a plugin.json beside skills/", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  renameSync(join(root, "plugins/foo/.claude-plugin/plugin.json"), join(root, "plugins/foo/plugin.json"));
  assert.equal(run().plugins.foo.version, "1.0.0");
});

test("a remote source is reported as not checked, not a crash", () => {
  marketplace([
    { name: "foo", source: "./plugins/foo", ...ATTRIBUTION },
    { name: "ext", source: { source: "github", repo: "o/r" } },
  ]);
  plugin("plugins/foo");
  const report = run();
  assert.equal(report.status, 0);
  assert.deepEqual(Object.keys(report.plugins), ["foo"]);
  assert.ok(report.skipped.some((s) => s.includes("ext")));
});

test("a dependency on a remote plugin of the same marketplace is not an unknown plugin", () => {
  marketplace([
    { name: "foo", source: "./plugins/foo", dependencies: [{ name: "ext", version: "^1.0.0" }], ...ATTRIBUTION },
    { name: "ext", source: { source: "github", repo: "o/r" } },
  ]);
  plugin("plugins/foo");
  assert.deepEqual(messages(run()), []);
});

test("plugins outside plugins/ are found through source, so a clean result is earned", () => {
  marketplace([{ name: "foo", source: "./packages/foo", ...ATTRIBUTION }]);
  plugin("packages/foo");
  write("packages/foo/agents/rev.md", "---\nname: rev\n---\nHi\n");
  const report = run();
  assert.deepEqual(Object.keys(report.plugins), ["foo"]);
  assert.equal(report.status, 1);
  assert.ok(messages(report).includes("agent frontmatter has no `description`"));
});

test("a plugin at the marketplace root and metadata.pluginRoot both resolve", () => {
  marketplace([{ name: "foo", source: "./", ...ATTRIBUTION }]);
  plugin(".");
  assert.deepEqual(Object.keys(run().plugins), ["foo"]);

  rmSync(join(root, ".claude-plugin"), { recursive: true, force: true });
  marketplace([{ name: "foo", source: "foo", ...ATTRIBUTION }], { metadata: { pluginRoot: "./packs" } });
  plugin("packs/foo");
  assert.deepEqual(Object.keys(run().plugins), ["foo"]);
});

test("an unregistered plugin is found next to the registered ones", () => {
  marketplace([{ name: "foo", source: "./packages/foo", ...ATTRIBUTION }]);
  plugin("packages/foo");
  plugin("packages/bar", "bar");
  write("packages/not-a-plugin/index.js", "");
  const report = run();
  assert.equal(report.status, 1);
  assert.deepEqual(messages(report), ["packages/bar/ exists but is not listed in marketplace.json"]);
});

test("an agents array replaces the scan, so an unlisted file is still an error", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  write("plugins/foo/.claude-plugin/plugin.json", {
    name: "foo",
    displayName: "Foo",
    keywords: ["a"],
    version: "1.0.0",
    agents: ["./agents/other.md"],
    ...ATTRIBUTION,
  });
  write("plugins/foo/agents/other.md", "---\nname: other\ndescription: Other\n---\nHi\n");
  const report = run();
  assert.equal(report.status, 1);
  assert.ok(messages(report).includes("agents/rev.md exists but is not listed in plugin.json"));
});

test("every YAML spelling of skills: is read as a list", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  for (const skills of ["skills: hello", "skills: [hello]", 'skills: ["hello"]', "skills:\n- hello", "skills: []"]) {
    write("plugins/foo/agents/rev.md", `---\nname: rev\ndescription: Reviews\n${skills}\n---\nHi\n`);
    assert.deepEqual(messages(run()), [], skills);
  }
});

test("doc tables are checked once the repo keeps them, whatever their column order", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  write("CLAUDE.md", "# Notes\n");
  assert.ok(run().skipped.includes("CLAUDE.md has no Plugins table"));

  write("CLAUDE.md", "| Plugin | Skills | Agents |\n| --- | --- | --- |\n| **foo** | hello, gone | rev |\n");
  write("README.md", "| Plugin | Skills |\n| --- | --- |\n| [**foo**](./plugins/foo/) | 3 |\n");
  const report = run();
  assert.equal(report.status, 1);
  assert.deepEqual(messages(report), [
    'Plugins table row "foo" lists "gone", which no longer exists',
    'row "foo" claims 3 skill(s) but the plugin has 1',
  ]);
});

test("conventions are opt-in and turn the house rules into errors", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  assert.equal(run().status, 0);

  write(".marketplace-creator.json", { conventions: true });
  const report = run();
  assert.equal(report.status, 1);
  const found = messages(report).join("\n");
  assert.match(found, /SKILL\.md frontmatter carries keys outside the skill contract: license, disable-model-invocation/);
  assert.match(found, /agent frontmatter is missing required keys/);
  assert.match(found, /agents\/rev\.md exists but is not listed/);
  assert.match(found, /the Plugins table has no row|README does not document/);
});

test("still reads the config under its old name, .marketplace-doctor.json", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  write(".marketplace-doctor.json", { conventions: true });
  assert.equal(run().conventions, true);
});

test("a marketplace with nothing local does not claim the docs agree", () => {
  marketplace([{ name: "ext", source: { source: "github", repo: "o/r" } }]);
  const out = spawnSync(process.execPath, [SCRIPT, root, "--no-native"], { encoding: "utf8" });
  assert.equal(out.status, 0);
  assert.match(out.stdout, /Nothing local to audit/);
  assert.doesNotMatch(out.stdout, /manifests and documentation agree/);
});

test("this repository passes with its own conventions on", () => {
  const out = spawnSync(process.execPath, [SCRIPT, REPO_ROOT, "--json", "--no-native"], { encoding: "utf8" });
  const report = JSON.parse(out.stdout);
  assert.equal(report.conventions, true);
  assert.equal(out.status, 0, messages(report).join("\n"));
});

test("flags a manifest without $schema, and --fix adds it without reformatting", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }], { $schema: "https://x.io/m.json" });
  plugin("plugins/foo");
  const manifest = join(root, "plugins/foo/.claude-plugin/plugin.json");
  writeFileSync(manifest, '{\n    "name": "foo",\n    "displayName": "Foo",\n    "keywords": ["a"],\n    "version": "1.0.0"\n}\n');
  assert.ok(messages(run()).some((m) => m.includes("$schema")));

  const fixed = run("--fix");
  assert.deepEqual(fixed.fixed, ["plugins/foo/.claude-plugin/plugin.json"]);
  assert.ok(!messages(fixed).some((m) => m.includes("$schema")));
  assert.equal(
    readFileSync(manifest, "utf8"),
    '{\n    "$schema": "https://www.schemastore.org/claude-code-plugin-manifest.json",\n    "name": "foo",\n    "displayName": "Foo",\n    "keywords": ["a"],\n    "version": "1.0.0"\n}\n'
  );
});

test("rejects a $schema that is not a URL", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }], { $schema: 42 });
  plugin("plugins/foo");
  const report = run();
  assert.equal(report.status, 1);
  assert.ok(messages(report).includes("`$schema` is not a URL or path"));
});

test("reports a plugin.json left in the plugin root, as an error with conventions", () => {
  marketplace([{ name: "foo", source: "./plugins/foo", ...ATTRIBUTION }]);
  plugin("plugins/foo");
  renameSync(join(root, "plugins/foo/.claude-plugin/plugin.json"), join(root, "plugins/foo/plugin.json"));
  const plain = run();
  assert.equal(plain.status, 0);
  assert.ok(messages(plain).includes("plugin.json sits in the plugin root"));

  write(".marketplace-creator.json", { conventions: true });
  assert.equal(run().status, 1);
});

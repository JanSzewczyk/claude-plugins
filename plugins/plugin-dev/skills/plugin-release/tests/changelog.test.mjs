// Runs changelog.mjs against throwaway git repos: boundaries are the commits that change `version`
// in the manifest, subjects of both commit styles are classified, and the heading drops the plugin
// name only for a single-plugin repository or the designated main plugin.
//
// Usage: node --test plugins/plugin-dev/skills/plugin-release/tests/changelog.test.mjs

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

const SCRIPT = resolve(import.meta.dirname, "../scripts/changelog.mjs");

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "changelog-"));
  execFileSync("git", ["-C", root, "init", "-q"]);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}
const commit = (message) => {
  const env = { ...process.env, GIT_COMMITTER_DATE: "2026-11-01T12:00:00", GIT_AUTHOR_DATE: "2026-11-01T12:00:00" };
  execFileSync("git", ["-C", root, "add", "-A"]);
  execFileSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", message], { env });
};
const run = (...args) => {
  const out = spawnSync(process.execPath, [SCRIPT, root, ...args], { encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
};

function marketplaceWithTwo() {
  write(".claude-plugin/marketplace.json", {
    name: "m",
    owner: { name: "X" },
    plugins: [
      { name: "foo", source: "./plugins/foo" },
      { name: "bar", source: "./plugins/bar" },
    ],
  });
  write("plugins/foo/.claude-plugin/plugin.json", { name: "foo", version: "1.0.0" });
  write("plugins/bar/.claude-plugin/plugin.json", { name: "bar", version: "1.0.0" });
  commit("chore: scaffold");
  write("plugins/foo/skills/a/SKILL.md", "a");
  commit("feat: add skill a (#1)");
  write("plugins/bar/skills/b/SKILL.md", "b");
  commit("Feature: Add skill b");
  write("plugins/foo/skills/a/SKILL.md", "a2");
  commit("fix: stop a from looping");
  write("plugins/foo/.claude-plugin/plugin.json", { name: "foo", version: "1.1.0" });
  commit("chore: bump foo to 1.1.0");
  write("plugins/foo/skills/a/SKILL.md", "a3");
  commit("Remove the legacy flag from a");
  write("plugins/foo/.claude-plugin/plugin.json", { name: "foo", version: "2.0.0" });
  commit("chore(release): foo 2.0.0");
}

test("backfill cuts one section per version at the commits that changed it, per plugin", () => {
  marketplaceWithTwo();
  const text = run("backfill", "--plugin", "foo");
  const headings = text.match(/^## .*$/gm);
  assert.deepEqual(headings, ["## [2.0.0 foo] — 2026-11-01", "## [1.1.0 foo] — 2026-11-01", "## [1.0.0 foo] — 2026-11-01"]);
  assert.match(text, /## \[1\.1\.0 foo\][\s\S]*- Stop a from looping[\s\S]*## \[1\.0\.0 foo\]/, "the fix lands in 1.1.0, before its boundary");
});

test("sections are classified from both commit styles and PR suffixes and bump commits are dropped", () => {
  marketplaceWithTwo();
  const text = run("backfill", "--plugin", "foo");
  assert.match(text, /### Removed\n\n- Remove the legacy flag from a/);
  assert.doesNotMatch(text, /bump foo/i);
  assert.doesNotMatch(text, /\(#1\)/);
});

test("--limit keeps the newest versions of each plugin", () => {
  marketplaceWithTwo();
  const text = run("backfill", "--limit", "1");
  assert.equal((text.match(/^## /gm) ?? []).length, 2, "one for foo, one for bar");
});

test("draft covers the commits since the previous release of that plugin only", () => {
  marketplaceWithTwo();
  const text = run("draft", "foo", "--date", "2026-11-16");
  assert.match(text, /^## \[2\.0\.0 foo\] — 2026-11-16/);
  assert.match(text, /Remove the legacy flag from a/);
  assert.doesNotMatch(text, /stop a from looping/);
});

test("the main plugin and a single-plugin repository get a heading without a name", () => {
  marketplaceWithTwo();
  assert.match(run("draft", "foo", "--main", "foo", "--date", "2026-11-16"), /^## \[2\.0\.0\] — 2026-11-16/);
});

test("sections reports the versions CHANGELOG.md already has, or that it does not exist", () => {
  marketplaceWithTwo();
  assert.equal(JSON.parse(run("sections")).exists, false);
  write("CHANGELOG.md", "# Changelog\n\n## [2.0.0 foo] — 2026-11-01\n\n## [1.0.0] — 2026-10-01\n");
  const { exists, sections } = JSON.parse(run("sections"));
  assert.equal(exists, true);
  assert.deepEqual(sections, [
    { version: "2.0.0", plugin: "foo", date: "2026-11-01" },
    { version: "1.0.0", plugin: null, date: "2026-10-01" },
  ]);
});

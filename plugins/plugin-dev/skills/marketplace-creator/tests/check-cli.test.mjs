// Runs check-cli.mjs against a stub `claude` on PATH, so the parsing and the thresholds are tested
// without the real CLI, an account or the network. The stub answers from STUB_* variables.
//
// Usage: node --test plugins/plugin-dev/skills/marketplace-creator/tests/check-cli.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";

const SCRIPT = resolve(import.meta.dirname, "../scripts/check-cli.mjs");

// Answers the six commands the script runs. Plugins named in STUB_BROKEN load and install with
// an error; STUB_TOKENS maps plugin name to its always-on figure; STUB_LOGGED_IN picks the mode.
const STUB = `#!/usr/bin/env node
const a = process.argv.slice(2);
const dirs = [];
while (a[0] === "--plugin-dir") { dirs.push(a[1]); a.splice(0, 2); }
const broken = (process.env.STUB_BROKEN || "").split(",");
const tokens = JSON.parse(process.env.STUB_TOKENS || "{}");
const name = (d) => d.split(/[\\\\/]/).pop();
const cmd = a.join(" ");
if (cmd === "--version") console.log("2.1.309 (Claude Code)");
else if (cmd === "auth status") console.log(JSON.stringify({ loggedIn: process.env.STUB_LOGGED_IN === "1" }));
else if (cmd === "plugin list --json" && dirs.length)
  console.log(JSON.stringify(dirs.map((d) => broken.includes(name(d))
    ? { id: "inline[0]", enabled: false, installPath: d, errors: ["Path not found: agents/x.md (agents)"] }
    : { id: name(d) + "@inline", version: "1.0.0", enabled: true, installPath: d })));
else if (cmd === "plugin list --json")
  console.log(JSON.stringify(["good", "big"].filter((n) => !broken.includes(n)).map((n) => ({ id: n + "@m", version: "1.0.0", enabled: true }))));
else if (a[0] === "plugin" && a[1] === "marketplace") console.log("✔ Successfully added marketplace: m");
else if (a[0] === "plugin" && a[1] === "install") {
  const n = a[2].split("@")[0];
  if (broken.includes(n)) { console.log("✘ Failed to install plugin: Source path does not exist"); process.exit(1); }
  console.log("✔ Successfully installed plugin: " + a[2]);
} else if (a[0] === "plugin" && a[1] === "details") console.log("Projected token cost\\n  Always-on:   ~" + (tokens[a[2]] ?? 100).toLocaleString("en-US") + " tok   added to every session");
else { console.error("stub: unexpected " + cmd); process.exit(2); }
`;

let root;
let bin;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-cli-"));
  bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "claude"), STUB);
  chmodSync(join(bin, "claude"), 0o755);
  const write = (rel, obj) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), JSON.stringify(obj));
  };
  write(".claude-plugin/marketplace.json", {
    name: "m",
    owner: { name: "X" },
    plugins: [
      { name: "good", source: "./plugins/good" },
      { name: "big", source: "./plugins/big" },
      { name: "far", source: { source: "github", repo: "x/far" } },
    ],
  });
  write("plugins/good/.claude-plugin/plugin.json", { name: "good" });
  write("plugins/big/.claude-plugin/plugin.json", { name: "big" });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(env, ...args) {
  const out = spawnSync(process.execPath, [SCRIPT, root, "--json", ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}`, GITHUB_ACTIONS: "", ...env },
  });
  assert.equal(out.stderr, "", "the script must not crash");
  return { status: out.status, ...JSON.parse(out.stdout) };
}

test("a clean marketplace passes all three checks and skips the remote entry", () => {
  const r = run({ STUB_LOGGED_IN: "1" });
  assert.equal(r.status, 0, JSON.stringify(r.issues));
  assert.deepEqual(r.checks.load.map((p) => p.loaded), [true, true]);
  assert.deepEqual(r.checks.install.map((p) => p.installed), [true, true]);
  assert.ok(r.skipped.some((s) => s.startsWith("far:")));
});

test("a plugin that loads with errors or fails to install is an error in each check", () => {
  const r = run({ STUB_LOGGED_IN: "1", STUB_BROKEN: "big" }, "--load", "--install");
  assert.equal(r.status, 1);
  assert.ok(r.issues.some((i) => i.check === "load" && i.plugin === "big" && i.message.includes("Path not found")));
  assert.ok(r.issues.some((i) => i.check === "install" && i.plugin === "big"));
  assert.equal(r.checks.budget, undefined, "only the named checks run");
});

test("signed in, the budget warns above 1,800 and fails at 2,000", () => {
  let r = run({ STUB_LOGGED_IN: "1", STUB_TOKENS: '{"big":1900}' }, "--budget");
  assert.equal(r.status, 0);
  assert.deepEqual(r.issues.map((i) => [i.severity, i.plugin]), [["warn", "big"]]);
  assert.equal(run({ STUB_LOGGED_IN: "1", STUB_TOKENS: '{"big":1900}' }, "--budget", "--strict").status, 1);
  r = run({ STUB_LOGGED_IN: "1", STUB_TOKENS: '{"big":2000}' }, "--budget");
  assert.equal(r.status, 1);
  assert.equal(r.checks.budget.plugins[0].plugin, "big", "largest first");
});

test("signed out, the limits scale down to the offline estimate", () => {
  const r = run({ STUB_LOGGED_IN: "0", STUB_TOKENS: '{"big":1600}' }, "--budget");
  assert.equal(r.checks.budget.counted, false);
  assert.equal(r.checks.budget.failAt, 1540);
  assert.equal(r.status, 1, "1,600 offline is over 2,000 counted");
  assert.ok(r.skipped.some((s) => s.startsWith("budget:")));
});

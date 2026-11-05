#!/usr/bin/env node
// Asks the Claude Code CLI itself what check-marketplace.mjs can only infer from files:
//
//   load     Does every plugin load? `claude --plugin-dir <each plugin> plugin list --json`
//            reports a missing component path, a broken hooks file or a corrupt manifest as an
//            error on the plugin, or drops the plugin entirely.
//   install  Does every plugin install from the marketplace? `claude plugin marketplace add`
//            plus `claude plugin install <plugin>@<marketplace>` for each entry, then
//            `claude plugin list --json` must show each one enabled. Catches what validate
//            misses: wrong source paths, reserved names, dependency ranges nothing satisfies.
//   budget   What does each plugin cost every session? `claude plugin details <plugin>` prints
//            the always-on tokens (skill and agent descriptions); warn and fail thresholds.
//
// Load and install run in a throwaway HOME and CLAUDE_CONFIG_DIR that is deleted afterwards, so
// the user's or the runner's own settings, installs and marketplaces are never read or written.
// Budget runs in the real environment, because only a signed-in CLI counts tokens through the
// API; signed out it falls back to an offline estimate that runs 25–40% low, so the thresholds
// are scaled down by --offline-factor and the report says which kind of number it shows.
//
// Usage: node check-cli.mjs [repo-root] [--load] [--install] [--budget] [--json] [--strict]
//          [--warn-at 1800] [--fail-at 2000] [--offline-factor 0.77]
// With no check named, all three run.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  if (i === -1) return fallback;
  const value = Number(argv[i + 1]);
  if (!Number.isFinite(value)) fail(`${name} needs a number`);
  return value;
};
const valueFlags = new Set(["--warn-at", "--fail-at", "--offline-factor"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !valueFlags.has(argv[i - 1]));
const root = resolve(positional[0] ?? process.cwd());
const asJson = flag("--json");
const strict = flag("--strict");
const named = ["--load", "--install", "--budget"].filter(flag);
const run = (check) => named.length === 0 || named.includes(`--${check}`);
const warnAt = option("--warn-at", 1800);
const failAt = option("--fail-at", 2000);
// Lowest counted/offline ratio measured across 15 plugins on 2026-11-05 was 1.31, so an offline
// figure above failAt * 0.77 is a counted figure above failAt: the scaled gate never fails a
// plugin a signed-in run would pass. It can still pass one that a signed-in run would fail.
const offlineFactor = option("--offline-factor", 0.77);
const MIN_VERSION = "2.1.265";

const issues = [];
const skipped = [];
const report = { root, claudeVersion: null, checks: {}, issues, skipped };
const note = (severity, check, plugin, message, detail) => issues.push({ severity, check, plugin, message, detail });

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function claude(args, env = process.env) {
  const r = spawnSync("claude", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300_000 });
  if (r.error?.code === "ENOENT") fail("claude CLI not on PATH — install it with `npm install -g @anthropic-ai/claude-code`");
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

const newer = (a, b) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

// ---- what to check ---------------------------------------------------------------------------

const catalogPath = join(root, ".claude-plugin", "marketplace.json");
let marketplace = null;
const plugins = []; // { name, dir }
if (existsSync(catalogPath)) {
  try {
    marketplace = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch (err) {
    fail(`${relative(root, catalogPath)} is not valid JSON: ${err.message}`);
  }
  for (const entry of marketplace.plugins ?? []) {
    if (typeof entry.source === "string" && entry.source.startsWith("./")) {
      plugins.push({ name: entry.name, dir: resolve(root, entry.source) });
    } else {
      skipped.push(`${entry.name}: remote source — load and budget need the files, install needs the network`);
    }
  }
} else if (existsSync(join(root, ".claude-plugin", "plugin.json"))) {
  const manifest = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  plugins.push({ name: manifest.name, dir: root });
} else {
  fail(`no .claude-plugin/marketplace.json or .claude-plugin/plugin.json under ${root}`);
}

const version = claude(["--version"]).out.match(/\d+\.\d+\.\d+/)?.[0] ?? "0.0.0";
report.claudeVersion = version;
if (!newer(version, MIN_VERSION)) fail(`claude ${version} is older than ${MIN_VERSION}, which these checks need`);

const pluginDirArgs = plugins.flatMap((p) => ["--plugin-dir", p.dir]);

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), "claude-plugin-check-"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: join(home, "config") };
  return { home, env, done: () => rmSync(home, { recursive: true, force: true }) };
}

function parseList(out) {
  try {
    return JSON.parse(out.slice(out.indexOf("[")));
  } catch {
    return null;
  }
}

// ---- load ------------------------------------------------------------------------------------

if (run("load")) {
  const box = sandbox();
  const { out } = claude([...pluginDirArgs, "plugin", "list", "--json"], box.env);
  box.done();
  const listed = parseList(out);
  const results = [];
  if (!listed) {
    note("error", "load", null, "`claude plugin list --json` did not return JSON", out);
  } else {
    for (const p of plugins) {
      const row = listed.find((r) => r.installPath && resolve(r.installPath) === p.dir);
      if (!row) {
        note("error", "load", p.name, "not listed at all — the CLI did not find a plugin in its directory");
        results.push({ plugin: p.name, loaded: false });
      } else if (row.errors?.length || !row.enabled) {
        for (const e of row.errors ?? ["not enabled"]) note("error", "load", p.name, e);
        results.push({ plugin: p.name, loaded: false, errors: row.errors ?? [] });
      } else {
        results.push({ plugin: p.name, loaded: true, version: row.version });
      }
    }
  }
  report.checks.load = results;
}

// ---- install ---------------------------------------------------------------------------------

if (run("install")) {
  const results = [];
  if (!marketplace) {
    skipped.push("install: a single-plugin repo has no marketplace to install from");
  } else {
    const box = sandbox();
    const added = claude(["plugin", "marketplace", "add", root], box.env);
    if (added.code !== 0 || added.out.includes("✘")) {
      note("error", "install", null, "`claude plugin marketplace add` failed", added.out);
    } else {
      for (const p of plugins) {
        const r = claude(["plugin", "install", `${p.name}@${marketplace.name}`], box.env);
        if (r.code !== 0 || r.out.includes("✘")) note("error", "install", p.name, "`claude plugin install` failed", r.out);
      }
      const listed = parseList(claude(["plugin", "list", "--json"], box.env).out) ?? [];
      for (const p of plugins) {
        const row = listed.find((r) => r.id === `${p.name}@${marketplace.name}`);
        const ok = row && row.enabled && !row.errors?.length;
        if (!ok && !issues.some((i) => i.check === "install" && i.plugin === p.name)) {
          note("error", "install", p.name, row ? (row.errors?.length ? `installed with errors: ${row.errors.join("; ")}` : "installed but not enabled") : "missing from `claude plugin list` after install");
        }
        results.push({ plugin: p.name, installed: Boolean(ok), version: row?.version ?? null });
      }
    }
    box.done();
  }
  report.checks.install = results;
}

// ---- budget ----------------------------------------------------------------------------------

if (run("budget")) {
  let status = {};
  try {
    status = JSON.parse(claude(["auth", "status"]).out);
  } catch {}
  const counted = status.loggedIn === true;
  const factor = counted ? 1 : offlineFactor;
  const warnLimit = Math.round(warnAt * factor);
  const failLimit = Math.round(failAt * factor);
  const results = [];
  for (const p of plugins) {
    if (!existsSync(p.dir)) continue; // load and install already report a missing directory
    const { out } = claude(["--plugin-dir", p.dir, "plugin", "details", p.name]);
    const m = out.match(/Always-on:\s*~?([\d.,]+)\s*(k)?\s*tok/i);
    if (!m) {
      note("error", "budget", p.name, "`claude plugin details` printed no Always-on line", out);
      continue;
    }
    const tokens = Math.round(Number(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1));
    results.push({ plugin: p.name, alwaysOn: tokens });
    const where = counted ? "" : ` (offline estimate; limit scaled ×${offlineFactor})`;
    if (tokens >= failLimit) note("error", "budget", p.name, `~${tokens} always-on tokens, at or over ${failLimit}${where}`);
    else if (tokens > warnLimit) note("warn", "budget", p.name, `~${tokens} always-on tokens, over ${warnLimit}${where}`);
  }
  results.sort((a, b) => b.alwaysOn - a.alwaysOn);
  report.checks.budget = { counted, warnAt: warnLimit, failAt: failLimit, plugins: results };
  if (!counted) skipped.push("budget: the CLI is signed out, so token figures are its offline estimate, not an API count");
}

// ---- report ----------------------------------------------------------------------------------

const errors = issues.filter((i) => i.severity === "error").length;
const warnings = issues.length - errors;

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Claude Code ${version} · ${plugins.length} plugin(s) · ${root}\n`);
  const mark = (check, plugin) => {
    const own = issues.filter((i) => i.check === check && i.plugin === plugin);
    return own.some((i) => i.severity === "error") ? "✗" : own.length ? "⚠" : "✓";
  };
  if (report.checks.load) {
    console.log("load");
    for (const r of report.checks.load) console.log(`  ${mark("load", r.plugin)} ${r.plugin}${r.version ? ` ${r.version}` : ""}`);
  }
  if (report.checks.install) {
    console.log("install");
    for (const r of report.checks.install) console.log(`  ${mark("install", r.plugin)} ${r.plugin}${r.version ? ` ${r.version}` : ""}`);
  }
  if (report.checks.budget) {
    const b = report.checks.budget;
    console.log(`budget (always-on tokens, ${b.counted ? "counted" : "offline estimate"}; warn > ${b.warnAt}, fail ≥ ${b.failAt})`);
    for (const r of b.plugins) console.log(`  ${mark("budget", r.plugin)} ${r.plugin.padEnd(24)} ~${r.alwaysOn}`);
  }
  if (issues.length) {
    console.log("\nissues");
    for (const i of issues) {
      console.log(`  ${i.severity === "error" ? "✗" : "⚠"} [${i.check}] ${i.plugin ?? "marketplace"}: ${i.message}`);
      if (i.detail) console.log(`      ${i.detail.split(/\r?\n/).slice(-6).join("\n      ")}`);
    }
  }
  if (skipped.length) {
    console.log("\nNot checked");
    for (const s of skipped) console.log(`  ⚪ ${s}`);
  }
  console.log(`\n${errors ? "✗" : "✓"} ${errors} errors  ⚠ ${warnings} warnings`);
  // On GitHub Actions, surface each issue as an annotation on the run and the pull request.
  if (process.env.GITHUB_ACTIONS === "true") {
    for (const i of issues) {
      const level = i.severity === "error" ? "error" : "warning";
      console.log(`::${level} title=${i.check}: ${i.plugin ?? "marketplace"}::${i.message.replace(/\r?\n/g, " ")}`);
    }
  }
}

process.exit(errors || (strict && warnings) ? 1 : 0);

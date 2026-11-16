#!/usr/bin/env node
// Drafts CHANGELOG.md sections from git history. Prints Markdown, never writes a file: the skill
// shows the draft and writes it only after the user agrees.
//
// Usage: node changelog.mjs <repo-root> draft <plugin> [--since <ref>] [--version <v>] [--date <d>] [--main <plugin>]
//        node changelog.mjs <repo-root> backfill [--plugin <name>] [--limit <n>] [--main <plugin>]
//        node changelog.mjs <repo-root> sections            (lists the versions CHANGELOG.md already has, as JSON)
//
// draft     the section for the version now in the manifest: commits that touched the plugin since
//           --since (default: the commit where the previous version was set, or the whole history).
// backfill  one section per version the manifest ever had, newest first, cut at the commits that
//           changed `version` in the manifest. Tags are not needed. --limit keeps the newest n
//           versions of each plugin.
//
// Heading: `## [<version> <plugin>] — <date>`; with --main <plugin>, or in a repository with one
// plugin, that plugin's heading is `## [<version>] — <date>`.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined;
};
const VALUE_FLAGS = new Set(["--since", "--version", "--date", "--main", "--plugin", "--limit"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const [rootArg, command, target] = positional;
if (!rootArg || !["draft", "backfill", "sections"].includes(command)) {
  console.error("usage: changelog.mjs <repo-root> <draft <plugin> | backfill | sections> [flags]");
  process.exit(2);
}
const root = resolve(rootArg);
const main = flagValue("--main");

function git(args, allowFail = false) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    if (allowFail) return "";
    console.error(`✗ git ${args.join(" ")}: ${String(error.stderr ?? error.message).trim()}`);
    process.exit(1);
  }
}
const lines = (text) => text.split("\n").filter(Boolean);

// ── plugins ────────────────────────────────────────────────────────────────────────────────────

function findPlugins() {
  const marketplacePath = join(root, ".claude-plugin/marketplace.json");
  if (existsSync(marketplacePath)) {
    const { plugins = [], metadata } = JSON.parse(readFileSync(marketplacePath, "utf8"));
    const base = metadata?.pluginRoot ?? "";
    return plugins
      .filter((p) => typeof p.source === "string")
      .map((p) => {
        const dir = join(base, p.source).replace(/^\.\//, "").replace(/\/$/, "");
        return { name: p.name, dir: dir === "." ? "" : dir };
      });
  }
  if (existsSync(join(root, ".claude-plugin/plugin.json"))) {
    const { name } = JSON.parse(readFileSync(join(root, ".claude-plugin/plugin.json"), "utf8"));
    return [{ name, dir: "" }];
  }
  console.error("✗ no .claude-plugin/marketplace.json or plugin.json: not a plugin repository");
  process.exit(1);
}

const plugins = findPlugins();
const single = plugins.length === 1;
const prefix = (dir) => (dir ? `${dir}/` : "");

function manifestVersionAt(dir, sha) {
  for (const rel of [`${prefix(dir)}.claude-plugin/plugin.json`, `${prefix(dir)}plugin.json`]) {
    const raw = git(["show", `${sha}:${rel}`], true);
    if (!raw) continue;
    try {
      const version = JSON.parse(raw).version;
      if (typeof version === "string") return version;
    } catch {
      // A manifest that did not parse at that commit has no readable version; try the next layout.
    }
  }
  return undefined;
}

// Commits (oldest first) at which the manifest's `version` changed.
function releaseBoundaries(plugin) {
  const manifests = [`${prefix(plugin.dir)}.claude-plugin/plugin.json`, `${prefix(plugin.dir)}plugin.json`];
  const shas = lines(git(["log", "--reverse", "--format=%H%x09%cs", "--", ...manifests], true));
  const boundaries = [];
  let previous;
  for (const row of shas) {
    const [sha, date] = row.split("\t");
    const version = manifestVersionAt(plugin.dir, sha);
    if (version && version !== previous) {
      boundaries.push({ sha, date, version });
      previous = version;
    }
  }
  return boundaries;
}

// ── commits → points ───────────────────────────────────────────────────────────────────────────

const SKIP = /^(merge\b|bump\b|release\b|(chore|docs)\(release\))/i;
const KINDS = [
  ["Removed", /^(remove|removed|delete|drop)\b/i],
  ["Added", /^(feat|feature)(\([^)]*\))?!?:|^(add|added|new)\b/i],
  ["Fixed", /^(fix|bugfix|hotfix)(\([^)]*\))?!?:|^(fix|fixed)\b/i],
];

function classify(subject) {
  const text = subject.replace(/\s+\(#\d+\)$/, "").trim();
  const point = text.replace(/^[A-Za-z]+(\([^)]*\))?!?:\s*/, "");
  if (!point || SKIP.test(text) || SKIP.test(point)) return undefined;
  const kind = KINDS.find(([, pattern]) => pattern.test(text))?.[0] ?? "Changed";
  return { kind, point: point.charAt(0).toUpperCase() + point.slice(1) };
}

function commitsTouching(dir, from, to) {
  const range = from ? `${from}..${to}` : to;
  const paths = dir ? ["--", dir] : [];
  return lines(git(["log", "--format=%s", range, ...paths], true));
}

function section({ plugin, version, date, subjects }) {
  const groups = { Added: [], Changed: [], Fixed: [], Removed: [] };
  for (const subject of subjects) {
    const entry = classify(subject);
    if (entry && !groups[entry.kind].includes(entry.point)) groups[entry.kind].push(entry.point);
  }
  const name = single || plugin.name === main ? "" : ` ${plugin.name}`;
  const out = [`## [${version}${name}] — ${date}`, ""];
  const filled = Object.entries(groups).filter(([, points]) => points.length);
  if (!filled.length) out.push("No notable changes recorded.", "");
  for (const [kind, points] of filled) out.push(`### ${kind}`, "", ...points.map((p) => `- ${p}`), "");
  return out.join("\n");
}

// ── commands ───────────────────────────────────────────────────────────────────────────────────

if (command === "sections") {
  const path = join(root, "CHANGELOG.md");
  const headings = existsSync(path)
    ? [...readFileSync(path, "utf8").matchAll(/^## \[(\S+)(?: (\S+))?\]\s*—\s*(\d{4}-\d{2}-\d{2})\s*$/gm)].map((m) => ({ version: m[1], plugin: m[2] ?? null, date: m[3] }))
    : null;
  console.log(JSON.stringify({ exists: headings !== null, sections: headings ?? [] }, null, 2));
  process.exit(0);
}

if (command === "draft") {
  const plugin = plugins.find((p) => p.name === target) ?? (single && !target ? plugins[0] : undefined);
  if (!plugin) {
    console.error(`✗ unknown plugin "${target ?? ""}". Known: ${plugins.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }
  const boundaries = releaseBoundaries(plugin);
  const version = flagValue("--version") ?? readCurrentVersion(plugin);
  const last = boundaries.at(-1);
  // The newest boundary is the release being drafted when it already carries `version`; the
  // previous one then closes the range. Otherwise the version is not committed yet and the newest
  // boundary is the previous release.
  const drafting = last && last.version === version;
  const from = flagValue("--since") ?? (drafting ? boundaries.at(-2)?.sha : last?.sha);
  const subjects = commitsTouching(plugin.dir, from, "HEAD");
  const date = flagValue("--date") ?? new Date().toISOString().slice(0, 10);
  process.stdout.write(`${section({ plugin, version, date, subjects })}\n`);
  process.exit(0);
}

function readCurrentVersion(plugin) {
  for (const rel of [`${prefix(plugin.dir)}.claude-plugin/plugin.json`, `${prefix(plugin.dir)}plugin.json`]) {
    const path = join(root, rel);
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")).version;
  }
  return undefined;
}

// backfill
const only = flagValue("--plugin");
const limit = Number(flagValue("--limit") ?? Infinity);
const out = [];
for (const plugin of plugins.filter((p) => !only || p.name === only)) {
  const boundaries = releaseBoundaries(plugin);
  boundaries.forEach((boundary, i) => {
    const subjects = commitsTouching(plugin.dir, boundaries[i - 1]?.sha, boundary.sha);
    out.push({ date: boundary.date, order: i, total: boundaries.length, text: section({ plugin, version: boundary.version, date: boundary.date, subjects }) });
  });
}
// Newest first; per plugin only the newest --limit versions.
const kept = out.filter((s) => s.total - s.order <= limit);
kept.sort((a, b) => (a.date === b.date ? b.order - a.order : a.date < b.date ? 1 : -1));
process.stdout.write(kept.map((s) => s.text).join("\n"));

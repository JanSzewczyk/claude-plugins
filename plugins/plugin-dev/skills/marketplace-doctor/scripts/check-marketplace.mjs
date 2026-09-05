#!/usr/bin/env node
// Checks a Claude Code marketplace repository for the drift that `claude plugin validate`
// does not look for: agreement between the three manifest layers and the hand-maintained
// documentation that enumerates the same capabilities in prose.
//
// `claude plugin validate` answers "is this manifest well-formed?". This script answers
// "does the repo still describe itself truthfully?" — the failure mode of a marketplace
// where every skill count, skills table and agents array is typed by hand.
//
// Usage: node check-marketplace.mjs [repo-root] [--json] [--strict] [--no-native]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const strict = argv.includes("--strict");
const skipNative = argv.includes("--no-native");
const root = resolve(argv.find((a) => !a.startsWith("--")) ?? process.cwd());

const issues = [];
const note = (severity, scope, file, message, hint) =>
  issues.push({ severity, scope, file: file ? relative(root, file).replace(/\\/g, "/") : null, message, hint });
const error = (...a) => note("error", ...a);
const warn = (...a) => note("warn", ...a);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    error("repo", path, `not valid JSON: ${err.message}`);
    return null;
  }
}

function dirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((n) => statSync(join(path, n)).isDirectory())
    .sort();
}

// Minimal top-level YAML frontmatter reader: returns ordered keys plus scalar values.
// Enough for the contracts this repo enforces (flat keys, no nested maps at the top level).
function frontmatter(path) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const keys = [];
  const values = {};
  let current = null;
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([A-Za-z][\w-]*):(.*)$/);
    if (km) {
      current = km[1];
      keys.push(current);
      values[current] = km[2].trim();
      continue;
    }
    // Indented continuation of the previous key — a folded scalar or a block list.
    if (current && /^\s+\S/.test(line)) values[current] = `${values[current]} ${line.trim()}`.trim();
  }
  return { keys, values, raw: m[1] };
}

// ---------------------------------------------------------------- layer 1: marketplace

const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(marketplacePath)) fail(`No .claude-plugin/marketplace.json under ${root} — is this a marketplace repo?`);

const marketplace = readJson(marketplacePath);
const pluginsDir = join(root, "plugins");
const onDisk = dirs(pluginsDir);
const entries = Array.isArray(marketplace?.plugins) ? marketplace.plugins : [];

const declared = new Set();
for (const entry of entries) {
  if (!entry?.name) {
    error("marketplace", marketplacePath, "a marketplace entry has no `name`");
    continue;
  }
  declared.add(entry.name);
  if (!entry.source) {
    error("marketplace", marketplacePath, `entry "${entry.name}" has no \`source\``);
    continue;
  }
  const sourceDir = resolve(root, entry.source);
  if (!existsSync(sourceDir)) {
    error("marketplace", marketplacePath, `entry "${entry.name}" points at a missing directory: ${entry.source}`);
  } else if (basename(sourceDir) !== entry.name) {
    warn(
      "marketplace",
      marketplacePath,
      `entry "${entry.name}" lives in directory "${basename(sourceDir)}"`,
      "the folder name becomes the plugin id in some surfaces — keep them identical"
    );
  }
}

for (const name of onDisk) {
  if (!declared.has(name)) {
    error(
      "marketplace",
      marketplacePath,
      `plugins/${name}/ exists but is not listed in marketplace.json`,
      "a new plugin must be added here — new skills/agents inside an existing plugin must not"
    );
  }
}

// ------------------------------------------------------- layer 2: per-plugin manifests

const AGENT_KEY_ORDER = [
  "name",
  "version",
  "lastUpdated",
  "author",
  "related-agents",
  "description",
  "tools",
  "model",
  "color",
  "permissionMode",
  "skills",
  "hooks",
];
const SKILL_KEY_ORDER = ["name", "description", "allowed-tools", "argument-hint"];

const inventory = new Map(); // plugin -> { skills, agents, version }

for (const name of onDisk) {
  const pluginDir = join(pluginsDir, name);
  const manifestPath = join(pluginDir, "plugin.json");
  if (!existsSync(manifestPath)) {
    error(name, pluginDir, "no plugin.json");
    continue;
  }
  const manifest = readJson(manifestPath);
  if (!manifest) continue;

  if (manifest.name !== name) {
    error(name, manifestPath, `plugin.json name is "${manifest.name}" but the directory is "${name}"`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) {
    error(name, manifestPath, `version "${manifest.version}" is not semver (x.y.z)`);
  }

  // agents: an explicit array, so both directions can drift
  const agentDir = join(pluginDir, "agents");
  const agentFiles = existsSync(agentDir)
    ? readdirSync(agentDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];
  const listed = Array.isArray(manifest.agents) ? manifest.agents : [];

  for (const rel of listed) {
    if (!existsSync(resolve(pluginDir, rel))) {
      error(name, manifestPath, `agents[] references a missing file: ${rel}`);
    }
  }
  for (const file of agentFiles) {
    if (!listed.some((rel) => basename(rel) === file)) {
      error(
        name,
        join(agentDir, file),
        `agents/${file} exists but is not listed in plugin.json`,
        "`agents` is an explicit array — unlisted agent files are never loaded"
      );
    }
  }

  const agentNames = [];
  for (const file of agentFiles) {
    const path = join(agentDir, file);
    const fm = frontmatter(path);
    if (!fm) {
      error(name, path, "agent has no YAML frontmatter");
      continue;
    }
    agentNames.push(fm.values.name ?? basename(file, ".md"));
    if (fm.values.name && fm.values.name !== basename(file, ".md")) {
      warn(name, path, `frontmatter name "${fm.values.name}" differs from the filename`);
    }
    const unknown = fm.keys.filter((k) => !AGENT_KEY_ORDER.includes(k));
    if (unknown.length) {
      error(name, path, `unrecognized agent frontmatter keys: ${unknown.join(", ")}`, "the agent contract is a closed set");
    }
    const known = fm.keys.filter((k) => AGENT_KEY_ORDER.includes(k));
    const expected = AGENT_KEY_ORDER.filter((k) => known.includes(k));
    if (known.join(",") !== expected.join(",")) {
      error(name, path, `agent frontmatter keys are out of order: ${known.join(", ")}`, `expected: ${expected.join(", ")}`);
    }
    const missing = AGENT_KEY_ORDER.filter((k) => k !== "hooks" && !known.includes(k));
    if (missing.length) {
      error(name, path, `agent frontmatter is missing required keys: ${missing.join(", ")}`);
    }
  }

  // skills: a directory glob, so the manifest cannot drift — but the SKILL.md contract can
  const skillsDir = join(pluginDir, "skills");
  const skillNames = dirs(skillsDir);
  if (skillNames.length && manifest.skills !== "./skills/") {
    warn(name, manifestPath, `skills is "${manifest.skills}" — this repo's convention is the "./skills/" glob`);
  }

  for (const skill of skillNames) {
    const skillPath = join(skillsDir, skill, "SKILL.md");
    if (!existsSync(skillPath)) {
      error(name, join(skillsDir, skill), "skill directory has no SKILL.md — it will never load");
      continue;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill)) {
      error(name, skillPath, `skill folder "${skill}" is not kebab-case — the folder name becomes the slash command`);
    }
    const fm = frontmatter(skillPath);
    if (!fm) {
      error(name, skillPath, "SKILL.md has no YAML frontmatter");
      continue;
    }
    if (fm.values.name !== skill) {
      error(name, skillPath, `frontmatter name "${fm.values.name}" does not match the folder "${skill}"`);
    }
    if (!fm.values.description) {
      error(name, skillPath, "SKILL.md has no description — the description is what routes the skill");
    }
    const unknown = fm.keys.filter((k) => !SKILL_KEY_ORDER.includes(k));
    if (unknown.length) {
      error(
        name,
        skillPath,
        `SKILL.md frontmatter carries keys outside the four-field contract: ${unknown.join(", ")}`,
        "allowed: name, description, allowed-tools, argument-hint"
      );
    }
    const known = fm.keys.filter((k) => SKILL_KEY_ORDER.includes(k));
    const expected = SKILL_KEY_ORDER.filter((k) => known.includes(k));
    if (known.join(",") !== expected.join(",")) {
      error(name, skillPath, `SKILL.md frontmatter keys are out of order: ${known.join(", ")}`, `expected: ${expected.join(", ")}`);
    }
  }

  inventory.set(name, { skills: skillNames, agents: agentNames, version: manifest.version });
}

// ------------------------------------------------------------- layer 3: documentation

function tableRowCells(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

const claudeMdPath = join(root, "CLAUDE.md");
if (existsSync(claudeMdPath)) {
  const lines = readFileSync(claudeMdPath, "utf8").split(/\r?\n/);
  for (const [name, inv] of inventory) {
    const row = lines.find((l) => l.trim().startsWith(`| **${name}**`));
    if (!row) {
      error("docs", claudeMdPath, `the Plugins table has no row for "${name}"`);
      continue;
    }
    const cells = tableRowCells(row);
    const listCell = (cell) =>
      !cell || cell === "—" || cell === "-"
        ? []
        : cell
            .split(",")
            .map((s) => s.trim().replace(/[`*]/g, ""))
            .filter(Boolean);
    const documentedAgents = listCell(cells[2]);
    const documentedSkills = listCell(cells[3]);

    for (const skill of inv.skills) {
      if (!documentedSkills.includes(skill)) {
        error("docs", claudeMdPath, `Plugins table row "${name}" does not list the skill "${skill}"`);
      }
    }
    for (const skill of documentedSkills) {
      if (!inv.skills.includes(skill)) {
        error("docs", claudeMdPath, `Plugins table row "${name}" lists "${skill}", which no longer exists`);
      }
    }
    for (const agent of inv.agents) {
      if (!documentedAgents.includes(agent)) {
        error("docs", claudeMdPath, `Plugins table row "${name}" does not list the agent "${agent}"`);
      }
    }
    for (const agent of documentedAgents) {
      if (!inv.agents.includes(agent)) {
        error("docs", claudeMdPath, `Plugins table row "${name}" lists agent "${agent}", which no longer exists`);
      }
    }
  }
} else {
  warn("docs", null, "no CLAUDE.md at the repo root — skipped the Plugins table check");
}

const rootReadmePath = join(root, "README.md");
if (existsSync(rootReadmePath)) {
  const lines = readFileSync(rootReadmePath, "utf8").split(/\r?\n/);
  for (const [name, inv] of inventory) {
    const row = lines.find((l) => l.trim().startsWith(`| [**${name}**]`));
    if (!row) {
      error("docs", rootReadmePath, `the plugin table has no row for "${name}"`);
      continue;
    }
    const cells = tableRowCells(row);
    const count = (cell) => (cell === "—" || cell === "-" ? 0 : Number(cell));
    const agents = count(cells[2]);
    const skills = count(cells[3]);
    if (Number.isNaN(agents) || agents !== inv.agents.length) {
      error("docs", rootReadmePath, `row "${name}" claims ${cells[2]} agent(s) but the plugin has ${inv.agents.length}`);
    }
    if (Number.isNaN(skills) || skills !== inv.skills.length) {
      error("docs", rootReadmePath, `row "${name}" claims ${cells[3]} skill(s) but the plugin has ${inv.skills.length}`);
    }
  }
} else {
  warn("docs", null, "no README.md at the repo root — skipped the plugin count check");
}

for (const [name, inv] of inventory) {
  const readmePath = join(pluginsDir, name, "README.md");
  if (!existsSync(readmePath)) {
    warn(name, join(pluginsDir, name), "plugin has no README.md");
    continue;
  }
  const text = readFileSync(readmePath, "utf8");
  const bolded = new Set([...text.matchAll(/\*\*([a-z0-9][\w-]*)\*\*/g)].map((m) => m[1]));
  for (const skill of inv.skills) {
    if (!bolded.has(skill)) {
      error(name, readmePath, `README does not document the skill "${skill}"`, "every skill needs a row in the plugin's skills table");
    }
  }
  for (const agent of inv.agents) {
    if (!bolded.has(agent)) {
      error(name, readmePath, `README does not document the agent "${agent}"`);
    }
  }
}

// ------------------------------------------------------ native manifest schema check

if (!skipNative) {
  const targets = [root, ...onDisk.map((n) => join(pluginsDir, n))];
  let ran = false;
  for (const target of targets) {
    try {
      execFileSync("claude", ["plugin", "validate", target, "--strict"], { stdio: "pipe", encoding: "utf8" });
      ran = true;
    } catch (err) {
      if (err.code === "ENOENT") break; // no claude CLI on PATH — nothing to add
      ran = true;
      const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
      error(
        target === root ? "marketplace" : basename(target),
        target,
        `claude plugin validate --strict failed:\n    ${out.split(/\r?\n/).join("\n    ")}`
      );
    }
  }
  if (!ran) {
    warn("repo", null, "claude CLI not on PATH — skipped the native `claude plugin validate` schema check");
  }
}

// ------------------------------------------------------------------------- reporting

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warn");
const failing = strict ? issues.length > 0 : errors.length > 0;

if (asJson) {
  console.log(
    JSON.stringify(
      {
        root,
        plugins: Object.fromEntries([...inventory].map(([n, i]) => [n, { version: i.version, skills: i.skills, agents: i.agents }])),
        issues,
        summary: { errors: errors.length, warnings: warnings.length, ok: !failing },
      },
      null,
      2
    )
  );
  process.exit(failing ? 1 : 0);
}

for (const scope of [...new Set(issues.map((i) => i.scope))]) {
  console.log(`\n${scope}`);
  for (const issue of issues.filter((i) => i.scope === scope)) {
    const mark = issue.severity === "error" ? "✗" : "⚠";
    console.log(`  ${mark} ${issue.message}${issue.file ? `\n      ${issue.file}` : ""}`);
    if (issue.hint) console.log(`      → ${issue.hint}`);
  }
}

const skillCount = [...inventory.values()].reduce((n, i) => n + i.skills.length, 0);
const agentCount = [...inventory.values()].reduce((n, i) => n + i.agents.length, 0);

console.log(`\n${inventory.size} plugins · ${agentCount} agents · ${skillCount} skills`);
console.log(
  errors.length || warnings.length
    ? `${errors.length} error(s), ${warnings.length} warning(s)`
    : "✓ manifests and documentation agree"
);

process.exit(failing ? 1 : 0);

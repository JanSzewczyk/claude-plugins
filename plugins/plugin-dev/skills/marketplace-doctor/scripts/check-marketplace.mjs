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

// ------------------------------------------------------------- attribution contract
// Every surface that lists a plugin (`/plugin`, the marketplace browser, a published listing)
// renders the author, homepage and license from the manifest it is reading — the marketplace
// entry for the browse view, plugin.json for the installed view. A manifest that omits them
// shows a plugin attributed to nobody, so both layers must carry the block, and agree.

const AUTHOR_KEYS = ["name", "email", "url"];

function checkAttribution(scope, file, subject, label) {
  const author = subject?.author;
  if (!author || typeof author !== "object" || Array.isArray(author)) {
    error(
      scope,
      file,
      `${label} has no \`author\` object`,
      "author.name is what every plugin surface displays — without it the plugin is attributed to nobody"
    );
    return;
  }
  if (!author.name) {
    error(scope, file, `${label} author has no \`name\``);
  }
  const soft = AUTHOR_KEYS.filter((k) => k !== "name" && !author[k]);
  if (soft.length) {
    warn(scope, file, `${label} author is missing: ${soft.join(", ")}`, "the contract is author: { name, email, url }");
  }
  const unknown = Object.keys(author).filter((k) => !AUTHOR_KEYS.includes(k));
  if (unknown.length) {
    warn(scope, file, `${label} author carries unrecognized keys: ${unknown.join(", ")}`, "allowed: name, email, url");
  }
  if (!subject.homepage) {
    warn(scope, file, `${label} has no \`homepage\``, "the listing links a plugin back to its repository from here");
  }
  if (!subject.license) {
    warn(scope, file, `${label} has no \`license\``, "an unlicensed plugin is legally unusable by whoever installs it");
  }
}

// ------------------------------------------------------------ display metadata contract
// The /plugin marketplace browser renders `displayName` in place of the raw kebab-case
// `name`, and matches `keywords` against search terms. Neither field is required by
// `claude plugin validate`, so a plugin that omits them still loads — it just shows up in
// the browser as a bare slug with no way to be found by topic.

function checkDisplayMetadata(scope, file, manifest) {
  if (!manifest.displayName || !manifest.displayName.trim()) {
    warn(
      scope,
      file,
      "plugin.json has no `displayName`",
      "without it the marketplace browser shows the raw kebab-case `name` instead of a readable title"
    );
  } else if (manifest.displayName === manifest.name) {
    warn(scope, file, "`displayName` is identical to `name`", "set a human-readable title, e.g. Title Case of the slug");
  }
  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    warn(
      scope,
      file,
      "plugin.json has no `keywords`",
      "keywords are what the marketplace browser's search matches against — without them the plugin is only found by its exact name"
    );
  }
}

// The marketplace owner is the attribution fallback for the repo as a whole.
if (marketplace) {
  if (!marketplace.owner?.name) {
    error("marketplace", marketplacePath, "marketplace has no `owner.name`");
  } else {
    const soft = AUTHOR_KEYS.filter((k) => k !== "name" && !marketplace.owner[k]);
    if (soft.length) {
      warn(
        "marketplace",
        marketplacePath,
        `marketplace owner is missing: ${soft.join(", ")}`,
        "the contract is owner: { name, email, url }"
      );
    }
  }
}

const declared = new Set();
for (const entry of entries) {
  if (!entry?.name) {
    error("marketplace", marketplacePath, "a marketplace entry has no `name`");
    continue;
  }
  declared.add(entry.name);
  checkAttribution("marketplace", marketplacePath, entry, `entry "${entry.name}"`);
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
  "skills",
];
// Agents shipped in a plugin ignore these keys (Claude Code drops them for security), so carrying
// them only suggests behaviour that never happens.
const IGNORED_AGENT_KEYS = ["permissionMode", "hooks", "mcpServers"];
// user-invocable: false is the documented "background knowledge" pattern: a skill agents preload
// through skills:, hidden from the / menu. The generated knowledge skills rely on it.
const SKILL_KEY_ORDER = ["name", "description", "allowed-tools", "argument-hint", "user-invocable"];

const inventory = new Map(); // plugin -> { skills, agents, version, dependencies }
const preloads = []; // { plugin, path, skills } for every agent with a skills: line

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

  checkAttribution(name, manifestPath, manifest, "plugin.json");
  checkDisplayMetadata(name, manifestPath, manifest);

  // The two layers are read by different surfaces, so they must agree — otherwise a plugin is
  // attributed to one author while browsing the marketplace and to another once installed.
  const entry = entries.find((e) => e?.name === name);
  if (entry?.author?.name && manifest.author?.name && entry.author.name !== manifest.author.name) {
    error(
      name,
      manifestPath,
      `author.name is "${manifest.author.name}" but marketplace.json says "${entry.author.name}"`,
      "the browse view reads the marketplace entry, the installed view reads plugin.json"
    );
  }
  if (entry?.license && manifest.license && entry.license !== manifest.license) {
    error(name, manifestPath, `license "${manifest.license}" disagrees with marketplace.json ("${entry.license}")`);
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
    if (fm.values.skills) {
      preloads.push({ plugin: name, path, skills: String(fm.values.skills).split(",").map((s) => s.trim()).filter(Boolean) });
    }
    if (fm.values.name && fm.values.name !== basename(file, ".md")) {
      warn(name, path, `frontmatter name "${fm.values.name}" differs from the filename`);
    }
    const ignored = fm.keys.filter((k) => IGNORED_AGENT_KEYS.includes(k));
    if (ignored.length) {
      error(
        name,
        path,
        `agent frontmatter carries keys that plugin agents ignore: ${ignored.join(", ")}`,
        "remove them; a hook that must run belongs in the plugin's hooks/hooks.json"
      );
    }
    const unknown = fm.keys.filter((k) => !AGENT_KEY_ORDER.includes(k) && !IGNORED_AGENT_KEYS.includes(k));
    if (unknown.length) {
      error(name, path, `unrecognized agent frontmatter keys: ${unknown.join(", ")}`, "the agent contract is a closed set");
    }
    const known = fm.keys.filter((k) => AGENT_KEY_ORDER.includes(k));
    const expected = AGENT_KEY_ORDER.filter((k) => known.includes(k));
    if (known.join(",") !== expected.join(",")) {
      error(name, path, `agent frontmatter keys are out of order: ${known.join(", ")}`, `expected: ${expected.join(", ")}`);
    }
    const missing = AGENT_KEY_ORDER.filter((k) => !known.includes(k));
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
        `SKILL.md frontmatter carries keys outside the skill contract: ${unknown.join(", ")}`,
        "allowed: name, description, allowed-tools, argument-hint, user-invocable"
      );
    }
    if (fm.keys.includes("user-invocable") && !["true", "false"].includes(String(fm.values["user-invocable"]))) {
      error(name, skillPath, `user-invocable is "${fm.values["user-invocable"]}"`, "it takes true or false");
    }
    const known = fm.keys.filter((k) => SKILL_KEY_ORDER.includes(k));
    const expected = SKILL_KEY_ORDER.filter((k) => known.includes(k));
    if (known.join(",") !== expected.join(",")) {
      error(name, skillPath, `SKILL.md frontmatter keys are out of order: ${known.join(", ")}`, `expected: ${expected.join(", ")}`);
    }
  }

  // The marketplace entry is the copy Claude Code reads and enforces; `claude plugin validate`
  // does not look at a plugin.json at the plugin root. Both carry the block, like attribution.
  if (JSON.stringify(entry?.dependencies ?? []) !== JSON.stringify(manifest.dependencies ?? [])) {
    error(
      name,
      manifestPath,
      "`dependencies` differs between plugin.json and the marketplace.json entry",
      "keep the two blocks identical; the marketplace entry is the one that is enforced"
    );
  }

  inventory.set(name, {
    skills: skillNames,
    agents: agentNames,
    version: manifest.version,
    dependencies: entry?.dependencies ?? manifest.dependencies ?? [],
  });
}

// ------------------------------------------------------------- dependencies contract
// An agent that preloads a skill from another plugin only gets it when that plugin is installed,
// so the dependency has to be declared. Claude Code installs dependencies automatically and
// checks a version range at load time against the dependency's plugin.json (relative-path
// sources) or against `<plugin>--v<version>` tags. `claude plugin validate` checks none of this
// beyond the shape of an entry.

// The range forms this repo uses: x.y.z, =x.y.z, ^x.y.z, ~x.y.z, >=x.y.z (missing parts are 0).
function satisfies(version, range) {
  const m = /^(\^|~|>=|=)?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range.trim());
  if (!m) return null;
  const [a, b, c] = version.split(".").map(Number);
  const [x, y, z] = [m[2], m[3] ?? 0, m[4] ?? 0].map(Number);
  const cmp = a - x || b - y || c - z;
  switch (m[1]) {
    case "^":
      return cmp >= 0 && (x > 0 ? a === x : y > 0 ? a === 0 && b === y : a === 0 && b === 0 && c === z);
    case "~":
      return cmp >= 0 && a === x && b === y;
    case ">=":
      return cmp >= 0;
    default:
      return cmp === 0;
  }
}

let tags = null;
try {
  tags = execFileSync("git", ["-C", root, "tag", "-l", "*--v*"], { encoding: "utf8", stdio: "pipe" }).split(/\r?\n/).filter(Boolean);
} catch {
  warn("repo", null, "not a git checkout — skipped the release-tag check for dependency ranges");
}

const skillOwner = new Map();
for (const [name, inv] of inventory) for (const skill of inv.skills) skillOwner.set(skill, name);

const edges = new Map(); // plugin -> Set of plugins it depends on in this marketplace
for (const [name, inv] of inventory) {
  const file = join(pluginsDir, name, "plugin.json");
  edges.set(name, new Set());
  for (const dep of Array.isArray(inv.dependencies) ? inv.dependencies : []) {
    const spec = typeof dep === "string" ? { name: dep.split("@")[0], marketplace: dep.split("@")[1] } : dep ?? {};
    if (spec.marketplace && spec.marketplace !== marketplace?.name) continue; // another marketplace: not ours to check
    if (!inventory.has(spec.name)) {
      error(name, file, `depends on "${spec.name}", which is not a plugin in this marketplace`);
      continue;
    }
    if (spec.name === name) {
      error(name, file, "depends on itself");
      continue;
    }
    edges.get(name).add(spec.name);
    if (!spec.version) continue;
    const current = inventory.get(spec.name).version;
    const ok = satisfies(current, spec.version);
    if (ok === null) {
      warn(name, file, `cannot evaluate the range "${spec.version}" for "${spec.name}"`, "use ^x.y.z, ~x.y.z, >=x.y.z or x.y.z");
      continue;
    }
    if (!ok) {
      error(
        name,
        file,
        `requires ${spec.name} ${spec.version}, but ${spec.name} is at ${current}`,
        "the plugin fails to load until the range and the dependency's version agree"
      );
    }
    if (tags && !tags.some((t) => t.startsWith(`${spec.name}--v`) && satisfies(t.slice(spec.name.length + 3), spec.version))) {
      warn(
        name,
        file,
        `no release tag of ${spec.name} satisfies ${spec.version}`,
        `tag the release with \`claude plugin tag plugins/${spec.name}\``
      );
    }
  }
}

for (const { plugin, path, skills } of preloads) {
  for (const skill of skills) {
    const [prefix, bare] = skill.includes(":") ? skill.split(":") : [null, skill];
    const owner = prefix ?? skillOwner.get(bare);
    if (!owner) {
      warn(plugin, path, `skills: preloads "${skill}", which no plugin in this marketplace provides`);
      continue;
    }
    if (owner !== plugin && !edges.get(plugin)?.has(owner)) {
      error(
        plugin,
        path,
        `skills: preloads "${skill}" from ${owner}, but ${plugin} does not depend on ${owner}`,
        `add { "name": "${owner}", "version": "^${inventory.get(owner)?.version}" } to dependencies in both manifests`
      );
    }
  }
}

// Every dependency installs automatically, so a cycle installs both plugins whichever one is
// picked, and the docs do not define how it resolves.
const reported = new Set();
function findCycle(start, node, trail) {
  for (const next of edges.get(node) ?? []) {
    if (next === start) return [...trail, start];
    if (!trail.includes(next)) {
      const cycle = findCycle(start, next, [...trail, next]);
      if (cycle) return cycle;
    }
  }
  return null;
}
for (const name of edges.keys()) {
  const cycle = findCycle(name, name, [name]);
  const key = cycle && [...new Set(cycle)].sort().join(",");
  if (cycle && !reported.has(key)) {
    reported.add(key);
    error(name, join(pluginsDir, name, "plugin.json"), `dependency cycle: ${cycle.join(" → ")}`, "drop the preload that closes the cycle");
  }
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

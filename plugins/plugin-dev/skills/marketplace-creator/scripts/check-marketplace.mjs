#!/usr/bin/env node
// Checks a Claude Code marketplace repository for the drift that `claude plugin validate`
// does not look for: agreement between the three manifest layers and the hand-maintained
// documentation that enumerates the same capabilities in prose.
//
// `claude plugin validate` answers "is this manifest well-formed?". This script answers
// "does the repo still describe itself truthfully?" — the failure mode of a marketplace
// where every skill count, skills table and agents array is typed by hand.
//
// Plugins come from the `source` of each marketplace entry, wherever they live. House rules that
// go beyond what Claude Code requires apply only when the repo opts in through
// .marketplace-creator.json: { "conventions": true } (.marketplace-doctor.json, the file's name
// before the skill was renamed, is still read when the new one is absent).
//
// Usage: node check-marketplace.mjs [repo-root] [--json] [--strict] [--no-native] [--fix]
//
// --fix is the one thing that writes: it inserts the missing `$schema` line into a manifest and
// touches nothing else in the file.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const strict = argv.includes("--strict");
const skipNative = argv.includes("--no-native");
const fix = argv.includes("--fix");
const root = resolve(argv.find((a) => !a.startsWith("--")) ?? process.cwd());

const issues = [];
const skipped = []; // what could not be audited, so a clean result does not overclaim
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
    .filter((n) => statSync(join(path, n), { throwIfNoEntry: false })?.isDirectory())
    .sort();
}

const unquote = (s) => s.replace(/^(["'])(.*)\1$/, "$2");

// Minimal top-level YAML frontmatter reader: returns ordered keys, scalar values and block lists.
// Enough for the contracts this repo enforces (flat keys, no nested maps at the top level).
function frontmatter(path) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const keys = [];
  const values = {};
  const items = {};
  let current = null;
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([A-Za-z][\w-]*):(.*)$/);
    if (km) {
      current = km[1];
      keys.push(current);
      values[current] = unquote(km[2].trim());
      items[current] = [];
      continue;
    }
    const item = line.match(/^\s*-\s+(.+)$/);
    if (current && item) {
      items[current].push(unquote(item[1].trim()));
      continue;
    }
    // Indented continuation of the previous key — a folded scalar.
    if (current && /^\s+\S/.test(line)) values[current] = `${values[current]} ${line.trim()}`.trim();
  }
  return { keys, values, items, raw: m[1] };
}

// A list key in any of its YAML spellings: a block list, [a, b], or the comma-separated a, b.
function listValue(fm, key) {
  if (fm.items[key]?.length) return fm.items[key];
  return String(fm.values[key] ?? "")
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => unquote(s.trim()))
    .filter(Boolean);
}

// ------------------------------------------------------------------ house conventions
// Claude Code requires far less than a well-kept marketplace may want: a closed frontmatter key
// set, attribution in both manifests, a named README row per skill. A repo opts in by committing
// this file; without it those checks stay quiet or drop to warnings, because in someone else's
// repo they would report the reader's taste as defects.

const configPath = [".marketplace-creator.json", ".marketplace-doctor.json"]
  .map((name) => join(root, name))
  .find((path) => existsSync(path));
const config = configPath ? (readJson(configPath) ?? {}) : {};
const conventions = config.conventions === true;
const convention = (...a) => (conventions ? error : warn)(...a);

// ---------------------------------------------------------------- layer 1: marketplace

const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(marketplacePath)) fail(`No .claude-plugin/marketplace.json under ${root} — is this a marketplace repo?`);

const marketplace = readJson(marketplacePath);
const entries = Array.isArray(marketplace?.plugins) ? marketplace.plugins : [];

if (marketplace && entries.length === 0) {
  error("marketplace", marketplacePath, "marketplace.json lists no plugins");
}

// ------------------------------------------------------------- attribution contract
// Every surface that lists a plugin (`/plugin`, the marketplace browser, a published listing)
// renders the author, homepage and license from the manifest it is reading — the marketplace
// entry for the browse view, plugin.json for the installed view. A manifest that omits them
// shows a plugin attributed to nobody. Without conventions, either layer carrying the field is
// enough; with them, both must.

const AUTHOR_KEYS = ["name", "email", "url"];

function checkAttribution(scope, file, subject, label) {
  const author = subject?.author;
  if (!author || typeof author !== "object" || Array.isArray(author)) {
    convention(
      scope,
      file,
      `${label} has no \`author\` object`,
      "author.name is what every plugin surface displays — without it the plugin is attributed to nobody"
    );
    return;
  }
  if (!author.name) {
    convention(scope, file, `${label} author has no \`name\``);
  }
  if (conventions) {
    const soft = AUTHOR_KEYS.filter((k) => k !== "name" && !author[k]);
    if (soft.length) {
      warn(scope, file, `${label} author is missing: ${soft.join(", ")}`, "the contract is author: { name, email, url }");
    }
    const unknown = Object.keys(author).filter((k) => !AUTHOR_KEYS.includes(k));
    if (unknown.length) {
      warn(scope, file, `${label} author carries unrecognized keys: ${unknown.join(", ")}`, "allowed: name, email, url");
    }
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

// ------------------------------------------------------------------ $schema contract
// A `$schema` URL makes editors validate and autocomplete a manifest as it is typed. Claude Code
// ignores the key at load time, so a manifest without it still works — it just loses that help.
// The schemas are published on SchemaStore; Claude Code's docs name the key but no URL.

const SCHEMAS = {
  marketplace: "https://www.schemastore.org/claude-code-marketplace.json",
  plugin: "https://www.schemastore.org/claude-code-plugin-manifest.json",
};
const fixed = []; // files --fix wrote, so the report can say what changed

// Inserts `"$schema"` as the first key by text, so the rest of the file keeps its formatting.
function insertSchema(path, url) {
  const text = readFileSync(path, "utf8");
  const m = text.match(/^(\uFEFF?\s*\{)(\r?\n)([ \t]*)(?=\S)/);
  if (!m || text[m[0].length] === "}") return false;
  writeFileSync(path, `${m[1]}${m[2]}${m[3]}"$schema": "${url}",${m[2]}${m[3]}${text.slice(m[0].length)}`);
  return true;
}

function checkSchema(scope, file, manifest, kind) {
  const value = manifest.$schema;
  if (value !== undefined) {
    if (typeof value !== "string" || !/^(https?:\/\/|\.{0,2}\/)\S+$/.test(value.trim())) {
      error(scope, file, "`$schema` is not a URL or path", `use "${SCHEMAS[kind]}"`);
    }
    return;
  }
  if (fix && insertSchema(file, SCHEMAS[kind])) {
    fixed.push(relative(root, file).replace(/\\/g, "/"));
    return;
  }
  convention(
    scope,
    file,
    `${kind === "plugin" ? "plugin.json" : "marketplace.json"} has no \`$schema\``,
    `add "$schema": "${SCHEMAS[kind]}" as the first key, or run with --fix — editors validate and autocomplete the manifest from it`
  );
}

// The marketplace owner is the attribution fallback for the repo as a whole.
if (marketplace) {
  checkSchema("marketplace", marketplacePath, marketplace, "marketplace");
  if (!marketplace.owner?.name) {
    error("marketplace", marketplacePath, "marketplace has no `owner.name`");
  } else if (conventions) {
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

// A relative source resolves from the marketplace root; metadata.pluginRoot is prepended to the
// short form ("formatter" rather than "./plugins/formatter").
function localSourceDir(source) {
  const base = marketplace?.metadata?.pluginRoot;
  return resolve(root, base && !source.startsWith(".") ? join(base, source) : source);
}

const declared = new Set();
const local = []; // { name, dir, entry } for every plugin that lives in this repo
const remote = []; // entries with a github, url, git-subdir, npm... source: nothing on disk to read
for (const entry of entries) {
  if (!entry?.name) {
    error("marketplace", marketplacePath, "a marketplace entry has no `name`");
    continue;
  }
  declared.add(entry.name);
  if (conventions) checkAttribution("marketplace", marketplacePath, entry, `entry "${entry.name}"`);
  if (!entry.source) {
    error("marketplace", marketplacePath, `entry "${entry.name}" has no \`source\``);
    continue;
  }
  if (typeof entry.source !== "string") {
    remote.push(entry.name);
    continue;
  }
  const sourceDir = localSourceDir(entry.source);
  if (!existsSync(sourceDir)) {
    error("marketplace", marketplacePath, `entry "${entry.name}" points at a missing directory: ${entry.source}`);
    continue;
  }
  if (conventions && sourceDir !== root && basename(sourceDir) !== entry.name) {
    warn(
      "marketplace",
      marketplacePath,
      `entry "${entry.name}" lives in directory "${basename(sourceDir)}"`,
      "the folder name becomes the plugin id in some surfaces — keep them identical"
    );
  }
  local.push({ name: entry.name, dir: sourceDir, entry });
}

if (remote.length) {
  skipped.push(`marketplace entries with a remote source (${remote.length}): ${remote.slice(0, 5).join(", ")}${remote.length > 5 ? ", …" : ""}`);
}

// A plugin nobody registered sits next to the ones that are, or under the conventional plugins/.
const looksLikePlugin = (dir) =>
  ["plugin.json", ".claude-plugin/plugin.json", "skills", "agents", "commands"].some((p) => existsSync(join(dir, p)));
const localDirs = new Set(local.map((p) => p.dir));
const parents = new Set([join(root, "plugins"), ...[...localDirs].filter((d) => d !== root).map((d) => dirname(d))]);

for (const parent of parents) {
  for (const name of dirs(parent)) {
    const dir = join(parent, name);
    if (name.startsWith(".") || localDirs.has(dir) || !looksLikePlugin(dir)) continue;
    error(
      "marketplace",
      marketplacePath,
      `${relative(root, dir)}/ exists but is not listed in marketplace.json`,
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
const IGNORED_AGENT_KEYS = ["permissionMode", "hooks", "mcpServers", "initialPrompt"];
// user-invocable: false is the documented "background knowledge" pattern: a skill agents preload
// through skills:, hidden from the / menu. The generated knowledge skills rely on it.
const SKILL_KEY_ORDER = ["name", "description", "allowed-tools", "argument-hint", "user-invocable"];
// Every key Claude Code reads in SKILL.md frontmatter. Anything else is silently ignored, which is
// how a typo such as `allowed_tools` goes unnoticed.
const OFFICIAL_SKILL_KEYS = [
  "name", "description", "when_to_use", "argument-hint", "arguments", "disable-model-invocation",
  "user-invocable", "allowed-tools", "disallowed-tools", "model", "effort", "context", "agent",
  "background", "hooks", "paths", "shell", "metadata", "license", "compatibility",
];
// The skill listing cuts description + when_to_use here; the cut part never reaches the router.
const SKILL_LISTING_LIMIT = 1536;
// Claude Code's guidance: past this, move detail into references/.
const SKILL_LINE_LIMIT = 500;

const depSpec = (dep) =>
  typeof dep === "string" ? { name: dep.split("@")[0], marketplace: dep.split("@")[1] } : (dep ?? {});
const depKey = (deps) =>
  JSON.stringify(
    (Array.isArray(deps) ? deps : [])
      .map(depSpec)
      .map((d) => [d.name, d.version ?? null, d.marketplace ?? null])
      .sort()
  );

// Claude Code reads the manifest from .claude-plugin/; a plugin.json beside skills/ is the older
// layout some marketplaces still use with `claude plugin tag`. It is read, and reported by
// convention as misplaced.
function findManifest(dir) {
  return [join(dir, ".claude-plugin", "plugin.json"), join(dir, "plugin.json")].find((p) => existsSync(p)) ?? null;
}

// The default skills/ scan, plus whatever `skills` in the manifest adds to it. A listed folder is
// either one skill or a parent of skills.
function skillDirs(pluginDir, manifest, file, name) {
  const found = new Map();
  const add = (parent) => {
    if (existsSync(join(parent, "SKILL.md"))) found.set(parent, basename(parent));
    else for (const skill of dirs(parent)) found.set(join(parent, skill), skill);
  };
  add(join(pluginDir, "skills"));
  const extra = typeof manifest.skills === "string" ? [manifest.skills] : Array.isArray(manifest.skills) ? manifest.skills : [];
  for (const rel of extra) {
    const path = resolve(pluginDir, rel);
    if (!existsSync(path)) error(name, file, `skills references a missing path: ${rel}`);
    else add(path);
  }
  return [...found].map(([path, skill]) => ({ path, skill })).sort((a, b) => a.skill.localeCompare(b.skill));
}

const inventory = new Map(); // plugin -> { dir, skills, agents, version, dependencies }
const preloads = []; // { plugin, path, skills } for every agent with a skills: line

for (const { name, dir: pluginDir, entry } of local) {
  const manifestPath = findManifest(pluginDir);
  if (!manifestPath) {
    convention(name, pluginDir, "no plugin.json", "looked in .claude-plugin/ and the plugin root; without it the plugin runs on the marketplace entry alone");
    if (conventions) continue;
  }
  const manifest = manifestPath ? readJson(manifestPath) : {};
  if (!manifest) continue;
  const file = manifestPath ?? pluginDir;
  for (const component of ["skills", "agents", "commands", "hooks", "output-styles"]) {
    if (existsSync(join(pluginDir, ".claude-plugin", component))) {
      error(name, join(pluginDir, ".claude-plugin", component), `${component}/ sits inside .claude-plugin/ and never loads`, "only plugin.json belongs in .claude-plugin/; move the folder to the plugin root");
    }
  }
  if (pluginDir !== root && existsSync(join(pluginDir, "CLAUDE.md"))) {
    warn(name, join(pluginDir, "CLAUDE.md"), "CLAUDE.md in a plugin is never loaded as context", "put instructions the plugin needs into a skill");
  }
  if (manifestPath === join(pluginDir, "plugin.json")) {
    convention(
      name,
      file,
      "plugin.json sits in the plugin root",
      "Claude Code reads the manifest from .claude-plugin/plugin.json — move it with `git mv` (paths inside stay relative to the plugin)"
    );
  }

  if (manifest.name && manifest.name !== name) {
    error(name, file, `plugin.json name is "${manifest.name}" but marketplace.json lists it as "${name}"`);
  }
  const version = manifest.version ?? entry.version;
  if (version === undefined) {
    convention(name, file, "no `version` in plugin.json or the marketplace entry", "without one, installs follow the git commit and `claude plugin tag` has nothing to tag");
  } else if (!/^\d+\.\d+\.\d+(?:[-+][\w.+-]+)?$/.test(version)) {
    error(name, file, `version "${version}" is not semver (x.y.z)`);
  }
  if (manifest.version && entry.version && manifest.version !== entry.version) {
    error(name, file, `version "${manifest.version}" disagrees with marketplace.json ("${entry.version}")`, "plugin.json wins at install time and `claude plugin tag` refuses the mismatch");
  }

  if (conventions) {
    checkAttribution(name, file, manifest, "plugin.json");
  } else {
    const pick = (k) => manifest[k] ?? entry[k];
    checkAttribution(name, file, { author: pick("author"), homepage: pick("homepage"), license: pick("license") }, name);
  }
  checkDisplayMetadata(name, file, manifest);
  if (manifestPath) checkSchema(name, file, manifest, "plugin");

  // The two layers are read by different surfaces, so they must agree — otherwise a plugin is
  // attributed to one author while browsing the marketplace and to another once installed.
  if (entry.author?.name && manifest.author?.name && entry.author.name !== manifest.author.name) {
    error(
      name,
      file,
      `author.name is "${manifest.author.name}" but marketplace.json says "${entry.author.name}"`,
      "the browse view reads the marketplace entry, the installed view reads plugin.json"
    );
  }
  if (entry.license && manifest.license && entry.license !== manifest.license) {
    error(name, file, `license "${manifest.license}" disagrees with marketplace.json ("${entry.license}")`);
  }

  // agents: an `agents` value replaces the default agents/ scan, so once it exists both directions
  // can drift. Without one the folder is scanned, and only conventions ask for the explicit list.
  const agentDir = join(pluginDir, "agents");
  const agentFiles = existsSync(agentDir)
    ? readdirSync(agentDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];
  const listed = typeof manifest.agents === "string" ? [manifest.agents] : Array.isArray(manifest.agents) ? manifest.agents : null;

  for (const rel of listed ?? []) {
    if (!existsSync(resolve(pluginDir, rel))) {
      error(name, file, `agents[] references a missing file: ${rel}`);
    }
  }
  if (listed || conventions) {
    for (const agentFile of agentFiles) {
      if (!(listed ?? []).some((rel) => basename(rel) === agentFile)) {
        error(
          name,
          join(agentDir, agentFile),
          `agents/${agentFile} exists but is not listed in plugin.json`,
          listed
            ? "`agents` replaces the default agents/ scan — unlisted agent files are never loaded"
            : "this repo's convention is an explicit `agents` array"
        );
      }
    }
  }

  const agentPaths = new Set(agentFiles.map((f) => join(agentDir, f)));
  for (const rel of listed ?? []) {
    const path = resolve(pluginDir, rel);
    if (existsSync(path) && path.endsWith(".md")) agentPaths.add(path);
  }

  const agentNames = [];
  for (const path of [...agentPaths].sort()) {
    const fm = frontmatter(path);
    if (!fm) {
      error(name, path, "agent has no YAML frontmatter");
      continue;
    }
    agentNames.push(fm.values.name ?? basename(path, ".md"));
    const skills = listValue(fm, "skills");
    if (skills.length) preloads.push({ plugin: name, path, skills });
    if (fm.values.name && fm.values.name !== basename(path, ".md")) {
      warn(name, path, `frontmatter name "${fm.values.name}" differs from the filename`);
    }
    for (const key of ["name", "description"]) {
      if (!fm.values[key]) error(name, path, `agent frontmatter has no \`${key}\``);
    }
    const ignored = fm.keys.filter((k) => IGNORED_AGENT_KEYS.includes(k));
    if (ignored.length) {
      convention(
        name,
        path,
        `agent frontmatter carries keys that plugin agents ignore: ${ignored.join(", ")}`,
        "remove them; a hook that must run belongs in the plugin's hooks/hooks.json"
      );
    }
    if (!conventions) continue;
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

  // skills: a directory scan, so the manifest cannot drift — but the SKILL.md contract can
  const skills = skillDirs(pluginDir, manifest, file, name);
  if (conventions && skills.length && manifest.skills !== "./skills/") {
    warn(name, file, `skills is "${manifest.skills}" — this repo's convention is the "./skills/" glob`);
  }

  for (const { path: skillDir, skill } of skills) {
    const skillPath = join(skillDir, "SKILL.md");
    if (!existsSync(skillPath)) {
      convention(name, skillDir, "skill directory has no SKILL.md — it will never load");
      continue;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill)) {
      convention(name, skillPath, `skill folder "${skill}" is not kebab-case — the folder name becomes the slash command`);
    }
    const fm = frontmatter(skillPath);
    if (!fm) {
      convention(name, skillPath, "SKILL.md has no YAML frontmatter");
      continue;
    }
    if (conventions ? fm.values.name !== skill : fm.values.name && fm.values.name !== skill) {
      convention(name, skillPath, `frontmatter name "${fm.values.name}" does not match the folder "${skill}"`);
    }
    if (!fm.values.description) {
      convention(name, skillPath, "SKILL.md has no description — the description is what routes the skill");
    }
    const listing = `${fm.values.description ?? ""} ${fm.values.when_to_use ?? ""}`.replace(/^[>|][-+]?\s*/, "").trim();
    if (listing.length > SKILL_LISTING_LIMIT) {
      warn(
        name,
        skillPath,
        `description is ${listing.length} characters; the skill listing cuts it at ${SKILL_LISTING_LIMIT}`,
        "the cut part never reaches the router — move detail into the body"
      );
    }
    const lines = readFileSync(skillPath, "utf8").split(/\r?\n/).length;
    if (lines > SKILL_LINE_LIMIT) {
      warn(name, skillPath, `SKILL.md is ${lines} lines`, `keep it under ${SKILL_LINE_LIMIT}; move reference material into references/`);
    }
    if (!conventions) {
      const unknownKeys = fm.keys.filter((k) => !OFFICIAL_SKILL_KEYS.includes(k));
      if (unknownKeys.length) {
        warn(name, skillPath, `SKILL.md frontmatter carries keys Claude Code does not read: ${unknownKeys.join(", ")}`, "they are silently ignored — check for a typo");
      }
    }
    if (fm.keys.includes("user-invocable") && !["true", "false"].includes(String(fm.values["user-invocable"]))) {
      error(name, skillPath, `user-invocable is "${fm.values["user-invocable"]}"`, "it takes true or false");
    }
    if (!conventions) continue;
    const unknown = fm.keys.filter((k) => !SKILL_KEY_ORDER.includes(k));
    if (unknown.length) {
      error(
        name,
        skillPath,
        `SKILL.md frontmatter carries keys outside the skill contract: ${unknown.join(", ")}`,
        "allowed: name, description, allowed-tools, argument-hint, user-invocable"
      );
    }
    const known = fm.keys.filter((k) => SKILL_KEY_ORDER.includes(k));
    const expected = SKILL_KEY_ORDER.filter((k) => known.includes(k));
    if (known.join(",") !== expected.join(",")) {
      error(name, skillPath, `SKILL.md frontmatter keys are out of order: ${known.join(", ")}`, `expected: ${expected.join(", ")}`);
    }
  }

  // The marketplace entry is the copy Claude Code enforces. Conventions keep the block in both
  // layers, like attribution; otherwise one layer is fine, and only a real disagreement counts.
  const inBoth = entry.dependencies && manifest.dependencies;
  if ((conventions || inBoth) && depKey(entry.dependencies) !== depKey(manifest.dependencies)) {
    error(
      name,
      file,
      "`dependencies` differs between plugin.json and the marketplace.json entry",
      "keep the two blocks identical; the marketplace entry is the one that is enforced"
    );
  }

  inventory.set(name, {
    dir: pluginDir,
    file,
    skills: skills.map((s) => s.skill),
    agents: agentNames,
    version,
    dependencies: entry.dependencies ?? manifest.dependencies ?? [],
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
  const [a, b, c] = version.split(/[-+]/)[0].split(".").map(Number);
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
  skipped.push("release tags for dependency ranges: not a git checkout");
}

const skillOwner = new Map();
for (const [name, inv] of inventory) for (const skill of inv.skills) skillOwner.set(skill, name);

const edges = new Map(); // plugin -> Set of plugins it depends on
for (const [name, inv] of inventory) {
  const file = inv.file;
  edges.set(name, new Set());
  for (const dep of Array.isArray(inv.dependencies) ? inv.dependencies : []) {
    const spec = depSpec(dep);
    if (spec.marketplace && spec.marketplace !== marketplace?.name) {
      edges.get(name).add(spec.name); // another marketplace: declared, but not ours to check
      continue;
    }
    if (!declared.has(spec.name)) {
      error(name, file, `depends on "${spec.name}", which is not a plugin in this marketplace`);
      continue;
    }
    if (spec.name === name) {
      error(name, file, "depends on itself");
      continue;
    }
    edges.get(name).add(spec.name);
    const target = inventory.get(spec.name);
    if (!spec.version || !target?.version) continue; // a remote plugin's version is not on disk
    const current = target.version;
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
    // Only a repo that releases through <plugin>--v<version> tags can be missing one.
    if (tags?.length && !tags.some((t) => t.startsWith(`${spec.name}--v`) && satisfies(t.slice(spec.name.length + 3), spec.version))) {
      warn(
        name,
        file,
        `no release tag of ${spec.name} satisfies ${spec.version}`,
        `tag the release with \`claude plugin tag ${relative(root, target.dir)}\``
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
        `add { "name": "${owner}", "version": "^${inventory.get(owner)?.version ?? "x.y.z"}" } to dependencies in both manifests`
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
    error(name, inventory.get(name).file, `dependency cycle: ${cycle.join(" → ")}`, "drop the preload that closes the cycle");
  }
}

// ------------------------------------------------------------- layer 3: documentation
// The tables are only comparable when the repo keeps them: a row for any plugin means the file
// maintains the table, and from then on a missing row is drift. Columns are found by their header.

function tableRowCells(line) {
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function columnsAbove(lines, rowIndex) {
  let top = rowIndex;
  while (top > 0 && lines[top - 1].trim().startsWith("|")) top -= 1;
  const header = tableRowCells(lines[top]).map((c) => c.toLowerCase());
  return { agents: header.findIndex((c) => /^agents?$/.test(c)), skills: header.findIndex((c) => /^skills?$/.test(c)) };
}

function pluginRows(lines, prefixes) {
  const rowOf = (name) => lines.findIndex((l) => prefixes(name).some((p) => l.trim().startsWith(p)));
  return { rowOf, maintained: conventions || [...inventory.keys()].some((name) => rowOf(name) !== -1) };
}

const claudeMdPath = join(root, "CLAUDE.md");
if (existsSync(claudeMdPath)) {
  const lines = readFileSync(claudeMdPath, "utf8").split(/\r?\n/);
  const { rowOf, maintained } = pluginRows(lines, (name) => [`| **${name}**`]);
  if (!maintained) skipped.push("CLAUDE.md has no Plugins table");
  for (const [name, inv] of maintained ? inventory : []) {
    const rowIndex = rowOf(name);
    if (rowIndex === -1) {
      error("docs", claudeMdPath, `the Plugins table has no row for "${name}"`);
      continue;
    }
    const cells = tableRowCells(lines[rowIndex]);
    const columns = columnsAbove(lines, rowIndex);
    const listCell = (cell) =>
      !cell || cell === "—" || cell === "-"
        ? []
        : cell
            .split(",")
            .map((s) => s.trim().replace(/[`*]/g, ""))
            .filter(Boolean);

    if (columns.skills !== -1) {
      const documentedSkills = listCell(cells[columns.skills]);
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
    }
    if (columns.agents !== -1) {
      const documentedAgents = listCell(cells[columns.agents]);
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
  }
} else {
  skipped.push("no CLAUDE.md at the repo root");
}

const rootReadmePath = join(root, "README.md");
if (existsSync(rootReadmePath)) {
  const lines = readFileSync(rootReadmePath, "utf8").split(/\r?\n/);
  const { rowOf, maintained } = pluginRows(lines, (name) => [`| [**${name}**]`, `| **${name}**`]);
  if (!maintained) skipped.push("the root README has no plugin table");
  for (const [name, inv] of maintained ? inventory : []) {
    const rowIndex = rowOf(name);
    if (rowIndex === -1) {
      error("docs", rootReadmePath, `the plugin table has no row for "${name}"`);
      continue;
    }
    const cells = tableRowCells(lines[rowIndex]);
    const columns = columnsAbove(lines, rowIndex);
    const count = (cell) => (cell === "—" || cell === "-" ? 0 : Number(cell));
    // A cell that is not a number is a list of names or a note, not a count that can go stale.
    const stale = (column, actual) => {
      if (column === -1) return false;
      const claimed = count(cells[column]);
      return Number.isNaN(claimed) ? conventions : claimed !== actual;
    };
    if (stale(columns.agents, inv.agents.length)) {
      error("docs", rootReadmePath, `row "${name}" claims ${cells[columns.agents]} agent(s) but the plugin has ${inv.agents.length}`);
    }
    if (stale(columns.skills, inv.skills.length)) {
      error("docs", rootReadmePath, `row "${name}" claims ${cells[columns.skills]} skill(s) but the plugin has ${inv.skills.length}`);
    }
  }
} else {
  skipped.push("no README.md at the repo root");
}

for (const [name, inv] of inventory) {
  const readmePath = join(inv.dir, "README.md");
  if (!existsSync(readmePath)) {
    warn(name, inv.dir, "plugin has no README.md");
    continue;
  }
  const text = readFileSync(readmePath, "utf8");
  const bolded = new Set([...text.matchAll(/\*\*([a-z0-9][\w-]*)\*\*/g)].map((m) => m[1]));
  // With conventions the name sits in bold in a table; otherwise any mention documents it.
  const documented = (unit) =>
    conventions ? bolded.has(unit) : new RegExp(`(^|[^\\w-])${unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\w-])`).test(text);
  for (const skill of inv.skills) {
    if (!documented(skill)) {
      convention(name, readmePath, `README does not document the skill "${skill}"`, "every skill needs a row in the plugin's skills table");
    }
  }
  for (const agent of inv.agents) {
    if (!documented(agent)) {
      convention(name, readmePath, `README does not document the agent "${agent}"`);
    }
  }
}

// ------------------------------------------------------ native manifest schema check

if (!skipNative) {
  // --strict turns the validator's own style warnings into failures, which is a choice a repo
  // makes for itself, through conventions or this script's --strict.
  const nativeArgs = conventions || strict ? ["--strict"] : [];
  const targets = [...new Set([root, ...[...inventory.values()].map((inv) => inv.dir)])];
  const pluginAt = new Map([...inventory].map(([name, inv]) => [inv.dir, name]));
  let ran = false;
  for (const target of targets) {
    try {
      execFileSync("claude", ["plugin", "validate", target, ...nativeArgs], { stdio: "pipe", encoding: "utf8" });
      ran = true;
    } catch (err) {
      if (err.code === "ENOENT") break; // no claude CLI on PATH — nothing to add
      ran = true;
      const out = `${err.stdout ?? ""}${err.stderr ?? ""}`.trim();
      error(
        target === root ? "marketplace" : pluginAt.get(target),
        target,
        `claude plugin validate ${nativeArgs.join(" ")} failed:\n    ${out.split(/\r?\n/).join("\n    ")}`
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
        conventions,
        plugins: Object.fromEntries(
          [...inventory].map(([n, i]) => [n, { dir: relative(root, i.dir) || ".", version: i.version, skills: i.skills, agents: i.agents }])
        ),
        issues,
        fixed,
        skipped,
        summary: { errors: errors.length, warnings: warnings.length, ok: !failing },
      },
      null,
      2
    )
  );
  process.exit(failing ? 1 : 0);
}

// Colour only on a terminal that wants it; piped output and CI logs stay plain text.
const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = (t) => paint(32, t);
const red = (t) => paint(31, t);
const yellow = (t) => paint(33, t);
const dim = (t) => paint(2, t);
const bold = (t) => paint(1, t);
const markOf = { error: red("✗"), warn: yellow("⚠"), ok: green("✓") };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const skillCount = [...inventory.values()].reduce((n, i) => n + i.skills.length, 0);
const agentCount = [...inventory.values()].reduce((n, i) => n + i.agents.length, 0);

const title = ` marketplace audit · ${basename(root)} `;
console.log(`\n${dim("╭" + "─".repeat(title.length) + "╮")}`);
console.log(`${dim("│")}${bold(title)}${dim("│")}`);
console.log(dim("╰" + "─".repeat(title.length) + "╯"));
console.log(`  ${plural(inventory.size, "plugin")} · ${plural(agentCount, "agent")} · ${plural(skillCount, "skill")}`);

// One row per plugin, then one per non-plugin scope that raised something (repo, marketplace).
const severityOf = (scope) => {
  const own = issues.filter((i) => i.scope === scope);
  return own.some((i) => i.severity === "error") ? "error" : own.length ? "warn" : "ok";
};
const rows = [...inventory.keys(), ...[...new Set(issues.map((i) => i.scope))].filter((s) => !inventory.has(s))];
if (rows.length) {
  const width = Math.max(...rows.map((r) => r.length));
  const detailOf = (scope) =>
    inventory.has(scope)
      ? `v${inventory.get(scope).version ?? "?"} · ${plural(inventory.get(scope).skills.length, "skill")} · ${plural(inventory.get(scope).agents.length, "agent")}`
      : "";
  const detailWidth = Math.max(...rows.map((r) => detailOf(r).length));
  console.log(`\n${bold("Checklist")}`);
  for (const scope of rows) {
    const own = issues.filter((i) => i.scope === scope);
    const errs = own.filter((i) => i.severity === "error").length;
    const warns = own.length - errs;
    const detail = detailOf(scope).padEnd(detailWidth);
    const counts = [errs && red(plural(errs, "error")), warns && yellow(plural(warns, "warning"))].filter(Boolean).join(", ");
    console.log(`  ${markOf[severityOf(scope)]} ${scope.padEnd(width)}  ${counts ? `${dim(detail)}  ${counts}` : dim(detail.trimEnd())}`);
  }
}

for (const scope of [...new Set(issues.map((i) => i.scope))]) {
  console.log(`\n${bold(scope)} ${dim(`(${issues.filter((i) => i.scope === scope).length})`)}`);
  for (const issue of issues.filter((i) => i.scope === scope)) {
    console.log(`  ${markOf[issue.severity]} ${issue.message}`);
    if (issue.file) console.log(`      ${dim(issue.file)}`);
    if (issue.hint) console.log(`      ${dim("→")} ${issue.hint}`);
  }
}

if (fixed.length) {
  console.log(`\nAdded \`$schema\` to ${plural(fixed.length, "file")}:`);
  for (const f of fixed) console.log(`  ${green("+")} ${f}`);
}

if (skipped.length) {
  console.log(`\n${bold("Not checked")}`);
  for (const reason of skipped) console.log(`  ${dim("-")} ${reason}`);
}

console.log(dim(`\n${"─".repeat(48)}`));
console.log(
  errors.length || warnings.length
    ? `${errors.length ? red(`✗ ${plural(errors.length, "error")}`) : green("✓ 0 errors")}  ${warnings.length ? yellow(`⚠ ${plural(warnings.length, "warning")}`) : green("✓ 0 warnings")}`
    : inventory.size
      ? green("✓ manifests and documentation agree")
      : "Nothing local to audit"
);

process.exit(failing ? 1 : 0);

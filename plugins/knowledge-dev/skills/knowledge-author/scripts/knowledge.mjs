#!/usr/bin/env node
// Builds the shared knowledge base into the skills that consume it, and proves the result is current.
//
// Notes live in <root>/knowledge/, one decision per file; knowledge/README.md is the authoring
// contract this script enforces. The path is the note's id, and a `principles` folder in the path
// makes it a principle; a `guides` folder makes a guide, the long form that explains a decision and
// points at the rules it produced (D27). knowledge/targets.json says which notes each skill receives. An installed
// plugin is copied into a cache and cannot read anything outside its own directory, so every
// target gets its own rendered copy. Rendering drops everything only tooling needs (frontmatter,
// sources) and keeps what the model acts on:
//
//   skill-index      writes the selected notes to <skill>/references/rules.md and rewrites the block
//                    between <!-- BEGIN:knowledge --> and <!-- END:knowledge --> in its SKILL.md
//                    with a one-line-per-rule index
//   knowledge-skill  generates a whole background-knowledge skill (user-invocable: false) for agents
//                    to preload: notes at or above `inline` impact in the SKILL.md itself, the rest in
//                    references/rules.md
//
// Every generated artifact carries a stamp: a hash of its notes and its target. `check` rebuilds in
// memory and byte-compares, and the stamp tells a stale copy from one edited by hand.
// Zero dependencies; Node 22+.
//
// The reasons behind every choice here are in ../references/decisions.md; the D-numbers in the
// comments below point to it. Change a behaviour only together with its decision.
//
// Usage: node knowledge.mjs <command> [--root <dir>] [args]
//   new <id>             scaffold a note from knowledge/_template.md
//   validate             check every note against the authoring contract
//   build                write every target
//   check                exit 1 if anything generated differs from a fresh build
//   coverage [--strict]  principles whose `expects` has no implementation yet
//   lint [--links] [--strict]  warnings validate cannot give: orphans, near-duplicates, budgets; --links probes sources
//   similar <text>       the notes closest to a sentence, to read before writing a new one
//   neighbors [ids|--changed] [--json]  per note, what a reviewer must read next to it: similar, same folder, linked

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// Every key has a consumer; id and type come from the path (D4, D7).
export const KEY_ORDER = ["title", "summary", "impact", "applies", "implements", "expects", "decides", "sources"];
const LIST_KEYS = new Set(["applies", "expects", "decides", "sources"]);
const REQUIRED_KEYS = ["title", "summary", "impact"];
export const IMPACTS = ["critical", "high", "medium", "low"];
const FACETS = ["languages", "frameworks", "libraries"];
const SECTION_ORDER = ["Rule", "Why", "Incorrect", "Correct", "Exceptions"];
// A guide is the long form (D27): the verdict in Decision, the reasoning in the sections after it.
export const GUIDE_SECTIONS = ["Decision", "Options", "Layouts", "Evolution"];
const SECTIONS_BY_TYPE = { principle: SECTION_ORDER, rule: SECTION_ORDER, guide: GUIDE_SECTIONS };
const REQUIRED_SECTIONS = { principle: ["Rule", "Why"], rule: ["Rule", "Why", "Incorrect", "Correct"], guide: ["Decision", "Options", "Evolution"] };
const PROFILES = ["full", "lean", "compact"];
const LAYOUTS = ["single", "per-rule"];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = /\{\{TODO/; // not the bare word, which samples may contain (D18)
const BEGIN = "<!-- BEGIN:knowledge -->";
const END = "<!-- END:knowledge -->";
const RULES_FILE = "references/rules.md";
const RULES_DIR = "references/rules";
const GUIDES_DIR = "references/guides";

const toPosix = (p) => p.split(sep).join("/");
const libraryName = (value) => value.split("@")[0];
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
export const typeOf = (id) => {
  const segments = id.split("/");
  return segments.includes("guides") ? "guide" : segments.includes("principles") ? "principle" : "rule";
};

export class KnowledgeError extends Error {
  constructor(message, { file, hint } = {}) {
    super(message);
    this.file = file;
    this.hint = hint;
  }
}

// ------------------------------------------------------------------ reading

// The frontmatter dialect shared with the repo's other scripts: flat `key: value` lines, lists
// written inline as `[a, b]`, optional quotes. Anything else is reported, never guessed at (D8).
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { error: "no frontmatter: the file must open with `---` on line 1" };
  const data = {};
  const keys = [];
  const errors = [];
  match[1].split("\n").forEach((line, i) => {
    if (line.trim() === "") return;
    const kv = line.match(/^([a-z][\w-]*):(?: (.*))?$/);
    if (!kv) {
      errors.push(`frontmatter line ${i + 2} is outside the dialect: "${line}"`);
      return;
    }
    const [, key, raw = ""] = kv;
    if (key in data) errors.push(`key "${key}" appears twice`);
    keys.push(key);
    data[key] = parseValue(raw.trim(), key, errors);
  });
  return { data, keys, errors, body: text.slice(match[0].length) };
}

function parseValue(raw, key, errors) {
  const unquote = (s) => s.trim().replace(/^(["'])(.*)\1$/, "$2");
  if (!raw.startsWith("[")) return unquote(raw);
  if (!raw.endsWith("]")) {
    errors.push(`"${key}" opens a list with [ but never closes it`);
    return [];
  }
  return raw.slice(1, -1).split(",").map(unquote).filter(Boolean);
}

// `## Heading` blocks outside fenced code, so a `## comment` inside a sample is never a section.
function parseSections(body) {
  const sections = new Map();
  let current = null;
  let fenced = false;
  for (const line of body.split("\n")) {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^## (.+)$/);
    if (heading) {
      current = heading[1].trim();
      sections.set(current, []);
    } else if (current) {
      sections.get(current).push(line);
    }
  }
  return new Map([...sections].map(([name, lines]) => [name, lines.join("\n").trim()]));
}

// `applies` is one list (D6); the vocabularies in knowledge.config.json are disjoint, so each value
// resolves to exactly one facet.
export function loadConfig(root) {
  const file = join(root, "knowledge", "knowledge.config.json");
  if (!existsSync(file)) throw new KnowledgeError("knowledge/knowledge.config.json is missing", { hint: "it holds the facet vocabulary and the size budgets" });
  const config = JSON.parse(readFileSync(file, "utf8"));
  const facetOf = new Map();
  for (const facet of FACETS) {
    for (const value of config[facet] ?? []) {
      if (facetOf.has(value)) {
        throw new KnowledgeError(`"${value}" is listed under both ${facetOf.get(value)} and ${facet} in knowledge.config.json`, {
          file: "knowledge/knowledge.config.json",
          hint: "`applies` resolves each value to one facet, so the vocabularies must not overlap",
        });
      }
      facetOf.set(value, facet);
    }
  }
  return { ...config, facetOf };
}

export function loadTargets(root) {
  const file = join(root, "knowledge", "targets.json");
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")).targets ?? [];
}

export function loadNotes(root, config = loadConfig(root)) {
  const dir = join(root, "knowledge");
  return readdirSync(dir, { recursive: true })
    .map(toPosix)
    .filter((rel) => rel.endsWith(".md") && !basename(rel).startsWith("_") && basename(rel) !== "README.md")
    .sort()
    .map((rel) => {
      const text = readFileSync(join(dir, rel), "utf8").replace(/\r\n/g, "\n");
      const parsed = parseFrontmatter(text);
      const id = rel.slice(0, -".md".length);
      const data = parsed.data ?? {};
      const facets = Object.fromEntries(FACETS.map((f) => [f, []]));
      for (const value of Array.isArray(data.applies) ? data.applies : []) {
        const facet = config.facetOf.get(libraryName(value));
        if (facet) facets[facet].push(facet === "libraries" ? libraryName(value) : value);
      }
      return {
        id,
        rel: `knowledge/${rel}`,
        type: typeOf(id),
        hash: sha(text),
        facets,
        sections: parseSections(parsed.body ?? ""),
        ...parsed,
        data,
      };
    });
}

// ------------------------------------------------------------------ validate

export function validateNotes(notes, config) {
  const issues = [];
  const byId = new Map(notes.map((n) => [n.id, n]));
  const budgets = config.budgets ?? {};

  for (const note of notes) {
    const at = (message, hint) => issues.push({ file: note.rel, message, hint });
    if (note.error) {
      at(note.error);
      continue;
    }
    note.errors.forEach((e) => at(e, "see the Frontmatter section of knowledge/README.md"));
    const d = note.data;

    const unknown = note.keys.filter((k) => !KEY_ORDER.includes(k));
    if (unknown.length) at(`unknown key(s): ${unknown.join(", ")}`, `allowed: ${KEY_ORDER.join(", ")}. The path is the id and the folder gives the type`);
    const known = note.keys.filter((k) => KEY_ORDER.includes(k));
    const ordered = [...known].sort((a, b) => KEY_ORDER.indexOf(a) - KEY_ORDER.indexOf(b));
    if (known.join() !== ordered.join()) at(`keys out of order: ${known.join(", ")}`, `expected: ${ordered.join(", ")}`);
    for (const key of REQUIRED_KEYS) if (!d[key]) at(`missing required key "${key}"`);

    for (const [key, value] of Object.entries(d)) {
      if (LIST_KEYS.has(key) && !Array.isArray(value)) at(`"${key}" must be a list: ${key}: [a, b]`);
      if (!LIST_KEYS.has(key) && Array.isArray(value)) at(`"${key}" must be a single value, not a list`);
      if (PLACEHOLDER.test(String(value))) at(`"${key}" still has a {{TODO}} placeholder`, "finish the note before building it");
    }
    if (PLACEHOLDER.test(note.body)) at("the body still has a {{TODO}} placeholder", "finish the note before building it");

    const badSegment = note.id.split("/").find((s) => !KEBAB.test(s));
    if (badSegment) at(`path segment "${badSegment}" is not lowercase kebab-case`);
    if (d.impact && !IMPACTS.includes(d.impact)) at(`impact "${d.impact}" is not one of ${IMPACTS.join(", ")}`);
    if (typeof d.title === "string" && d.title.length > (budgets.title ?? 90)) at(`title is ${d.title.length} characters, the budget is ${budgets.title ?? 90}`);
    if (typeof d.summary === "string" && d.summary.length > (budgets.summary ?? 120)) at(`summary is ${d.summary.length} characters, the budget is ${budgets.summary ?? 120}`, "the summary is the only text an index row shows");

    for (const value of Array.isArray(d.applies) ? d.applies : []) {
      if (!config.facetOf.has(libraryName(value))) at(`applies value "${libraryName(value)}" is not in knowledge.config.json`, "add it to languages, frameworks or libraries there first, so the vocabulary stays controlled");
    }
    for (const source of Array.isArray(d.sources) ? d.sources : []) if (!source.startsWith("https://")) at(`source "${source}" is not an https:// link`);
    if (note.type !== "principle" && note.facets.libraries.length && !(d.sources ?? []).length) at(`a ${note.type} about a library needs at least one source`, "link the docs page you checked it against");
    if (note.type !== "guide" && d.decides) at("only a guide can list `decides`", "guides live in a guides/ folder");

    if (note.type === "principle") {
      if (note.facets.languages.length || note.facets.frameworks.length) at("a principle applies to no single language or framework", "move the concrete part into a rule outside principles/ that `implements` this one");
      if (d.implements) at("only a rule can implement a principle");
      for (const e of d.expects ?? []) {
        const facet = config.facetOf.get(e);
        if (facet !== "languages" && facet !== "frameworks") at(`expects "${e}", which is neither a language nor a framework in knowledge.config.json`);
      }
    } else if (note.type === "guide") {
      if (d.implements || d.expects) at("a guide has no `implements` or `expects`", "it points at the rules it produced with `decides`");
      if (!(d.decides ?? []).length) at("a guide must list the notes it decided in `decides`", "a guide with no rules behind it is an essay; write the rules first, then list them");
      for (const id of d.decides ?? []) {
        const target = byId.get(id);
        if (!target) at(`decides "${id}", which does not exist`, "fix the path or remove it");
        else if (target.type === "guide") at(`decides "${id}", which is a guide`, "a guide decides principles and rules");
      }
    } else {
      if (d.expects) at("only a principle can list `expects`", "principles live in a principles/ folder");
      if (d.implements) {
        const target = byId.get(d.implements);
        if (!target) at(`implements "${d.implements}", which does not exist`, "fix the path or remove the key");
        else if (target.type !== "principle") at(`implements "${d.implements}", which is a rule, not a principle`);
      }
    }

    for (const name of note.sections.keys()) {
      const allowed = SECTIONS_BY_TYPE[note.type];
      if (!allowed.includes(name)) at(`unknown section "## ${name}"`, `a ${note.type} has ${allowed.map((s) => `## ${s}`).join(", ")}; anything else would be dropped when rendered`);
    }
    for (const required of REQUIRED_SECTIONS[note.type]) {
      if (!note.sections.get(required)) at(`missing section "## ${required}"`, `a ${note.type} needs ${REQUIRED_SECTIONS[note.type].map((s) => `## ${s}`).join(", ")}`);
    }
  }
  return issues;
}

// ------------------------------------------------------------------ selecting

function globToRegExp(glob) {
  const escape = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${glob.split("**").map((part) => part.split("*").map(escape).join("[^/]*")).join(".*")}$`);
}

// A note matches a facet filter when it names none of that facet (it applies everywhere) or when
// it names at least one of the wanted values. That is how a principle reaches every language (D5).
function matchesWhere(note, where = {}) {
  return Object.entries(where).every(([facet, wanted]) => {
    const have = note.facets[facet] ?? [];
    return have.length === 0 || have.some((v) => wanted.includes(v));
  });
}

const byImpactThenId = (a, b) =>
  IMPACTS.indexOf(a.data.impact) - IMPACTS.indexOf(b.data.impact) || a.id.localeCompare(b.id);

export function selectNotes(notes, target) {
  const include = (target.include ?? ["**"]).map(globToRegExp);
  const exclude = (target.exclude ?? []).map(globToRegExp);
  return notes
    .filter((n) => include.some((r) => r.test(n.id)) && !exclude.some((r) => r.test(n.id)))
    .filter((n) => matchesWhere(n, target.where))
    .sort(byImpactThenId);
}

// ------------------------------------------------------------------ rendering

export const flatName = (id) => `${id.replaceAll("/", "--")}.md`;
export const slug = (title) => title.toLowerCase().replace(/[^a-z0-9 _-]/g, "").trim().replace(/ /g, "-");
const escapeCell = (s) => String(s).replaceAll("|", "\\|");
const scopeOf = (n) => (n.data.applies ?? []).join(", ") || "any";
const firstSentence = (text) => text.replace(/\s+/g, " ").match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

const stampFor = (notes, target) => {
  const digest = sha(`${JSON.stringify(target)}\n${notes.map((n) => `${n.id} ${n.hash}`).sort().join("\n")}`);
  return `<!-- generated by knowledge.mjs from ${notes.length} note(s) (sha256 ${digest}); edit the notes in knowledge/, then run build -->`;
};

// What the model reads: title, impact and scope, then the sections as labelled paragraphs. No
// frontmatter, no sources: those serve the author and the build, not the reader (D13, D16).
//   full     Rule, Why, Incorrect, Correct, Exceptions
//   lean     Rule, Why, Correct, Exceptions; Incorrect only for critical
//   compact  Rule, the first sentence of Why, Correct, Exceptions; Incorrect only for critical
//
// A guide shows its Decision like a rule's Rule. When the target also asks for the longer sections
// (`guides`), they go to references/guides/ and the entry names that file, so a skill pays for the
// reasoning only when a task needs it (D27).
export const guideExtras = (note, guides = ["Decision"]) => GUIDE_SECTIONS.filter((name) => name !== "Decision" && guides.includes(name) && note.sections.get(name));
export const guideFile = (note) => `${GUIDES_DIR}/${flatName(note.id)}`;

export function renderNote(note, { level = 2, profile = "full", guides } = {}) {
  const s = note.sections;
  const parts = [`${"#".repeat(level)} ${note.data.title}`, "", `_${note.data.impact} · ${scopeOf(note)}_`];
  if (note.type === "guide") {
    parts.push("", `**Decision.** ${s.get("Decision")}`);
    if (guideExtras(note, guides).length) parts.push("", `**Read in full:** \`${guideFile(note)}\``);
    return parts.join("\n");
  }
  const add = (label, text) => {
    if (!text) return;
    parts.push("", /^(```|~~~)/.test(text) ? `**${label}:**\n\n${text}` : `**${label}.** ${text}`);
  };
  add("Rule", s.get("Rule"));
  add("Why", profile === "compact" && s.get("Why") ? firstSentence(s.get("Why")) : s.get("Why"));
  if (profile === "full" || note.data.impact === "critical") add("Incorrect", s.get("Incorrect"));
  add("Correct", s.get("Correct"));
  add("Exceptions", s.get("Exceptions"));
  return parts.join("\n");
}

// The longer sections of a guide, for the targets that ask for them.
function renderGuideFile(note, target) {
  const names = guideExtras(note, target.guides);
  return `${[
    `# ${note.data.title}`,
    "",
    stampFor([note], target),
    "",
    `_${note.data.impact} · ${scopeOf(note)}_`,
    "",
    `**Decision.** ${note.sections.get("Decision")}`,
    ...names.flatMap((name) => ["", `## ${name}`, "", note.sections.get(name)]),
  ].join("\n").trimEnd()}\n`;
}

function indexTable(notes, linkOf) {
  const rows = notes.map(
    (n) => `| ${n.data.impact} | [${escapeCell(n.data.title)}](${linkOf(n)}) — ${escapeCell(n.data.summary)} | ${escapeCell(scopeOf(n))} |`,
  );
  return ["| Impact | Rule | Applies to |", "| --- | --- | --- |", ...rows].join("\n");
}

function renderRulesFile(title, notes, target, profile) {
  return `${[
    `# ${title}`,
    "",
    stampFor(notes, target),
    "",
    ...notes.map((n) => `- [${n.data.title}](#${slug(n.data.title)}) · ${n.data.impact}`),
    ...notes.flatMap((n) => ["", renderNote(n, { level: 2, profile, guides: target.guides })]),
  ].join("\n").trimEnd()}\n`;
}

const linkerFor = (layout) =>
  layout === "per-rule" ? (n) => `${RULES_DIR}/${flatName(n.id)}` : (n) => `${RULES_FILE}#${slug(n.data.title)}`;

// Reference files for the notes a target does not inline: one compiled file, or one per note (D14).
function renderReferences(dir, title, notes, target, layout, profile) {
  const files = new Map();
  if (!notes.length) return files;
  if (layout === "per-rule") {
    for (const n of notes) {
      files.set(join(dir, RULES_DIR, flatName(n.id)), `${stampFor([n], target)}\n\n${renderNote(n, { level: 1, profile, guides: target.guides })}\n`);
    }
  } else {
    files.set(join(dir, RULES_FILE), renderRulesFile(title, notes, target, profile));
  }
  return files;
}

function renderSkillIndex(root, target, notes, layout) {
  const skillMd = join(root, target.skill, "SKILL.md");
  const rel = toPosix(relative(root, skillMd));
  if (!existsSync(skillMd)) throw new KnowledgeError(`${rel} does not exist`, { file: rel, hint: "a skill-index target fills a hand-written SKILL.md; create the skill first" });
  const text = readFileSync(skillMd, "utf8").replace(/\r\n/g, "\n");
  const begin = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (begin < 0 || end < begin) {
    throw new KnowledgeError(`${rel} has no ${BEGIN} … ${END} block`, {
      file: rel,
      hint: "add both markers, each on its own line, where the rule index belongs; the build never appends on its own",
    });
  }
  const block = [BEGIN, stampFor(notes, target), "", indexTable(notes, linkerFor(layout)), "", END].join("\n");
  return text.slice(0, begin) + block + text.slice(end + END.length);
}

function renderKnowledgeSkill(target, inlined, linked, layout, config) {
  const name = basename(target.skill);
  const budgets = config.budgets ?? {};
  if (!KEBAB.test(name) || name.length > 64) throw new KnowledgeError(`skill name "${name}" must be kebab-case and at most 64 characters`, { file: target.skill });
  const description = target.description ?? "";
  if (!description) throw new KnowledgeError(`${target.skill} has no description in targets.json`, { file: "knowledge/targets.json", hint: "the description is the only part of a skill loaded before it fires" });
  if (description.length > (budgets.description ?? 1024)) {
    throw new KnowledgeError(`${target.skill}: description is ${description.length} characters, the limit is ${budgets.description ?? 1024}`, { file: "knowledge/targets.json" });
  }
  // Full by default: in the A/B (poc/ab) it was the only profile with no miss, for ~20% more tokens (D16).
  const profile = target.profile ?? "full";
  const parts = [
    "---",
    `name: ${name}`,
    `description: ${JSON.stringify(description)}`,
    "user-invocable: false",
    "---",
    "",
    stampFor([...inlined, ...linked], target),
    "",
    `# ${target.title ?? name}`,
    ...(target.intro ? ["", target.intro] : []),
  ];
  if (inlined.length) {
    parts.push("", `## Always apply (${IMPACTS.slice(0, IMPACTS.indexOf(target.inline ?? "high") + 1).join(", ")})`);
    for (const n of inlined) parts.push("", renderNote(n, { level: 3, profile, guides: target.guides }));
  }
  if (linked.length) {
    parts.push("", "## Read when the task touches it", "", indexTable(linked, linkerFor(layout)));
  }
  const content = `${parts.join("\n").trimEnd()}\n`;
  const lines = content.split("\n").length;
  const maxLines = target.maxLines ?? budgets.knowledgeSkillLines ?? 300;
  if (lines > maxLines) {
    throw new KnowledgeError(`${target.skill}/SKILL.md would be ${lines} lines, the budget is ${maxLines}`, {
      file: "knowledge/targets.json",
      hint: "agents preload this file whole: set `inline` to a stricter impact, use profile compact, or narrow `include`",
    });
  }
  return content;
}

// Every file a fresh build would write, plus every file the build owns (to find leftovers).
export function plan(root) {
  const config = loadConfig(root);
  const notes = loadNotes(root, config);
  const issues = validateNotes(notes, config);
  if (issues.length) return { issues, outputs: new Map(), owned: [] };

  const outputs = new Map();
  const owned = [];
  for (const target of loadTargets(root)) {
    const where = { file: "knowledge/targets.json" };
    const layout = target.layout ?? "single";
    if (!LAYOUTS.includes(layout)) throw new KnowledgeError(`${target.skill}: layout "${layout}" is not one of ${LAYOUTS.join(", ")}`, where);
    if (target.profile && !PROFILES.includes(target.profile)) throw new KnowledgeError(`${target.skill}: profile "${target.profile}" is not one of ${PROFILES.join(", ")}`, where);
    const selected = selectNotes(notes, target);
    if (!selected.length) throw new KnowledgeError(`${target.skill} selects no notes`, { ...where, hint: "check `include` and `where`" });
    const guideNames = target.guides ?? ["Decision"];
    const unknownGuide = guideNames.find((name) => !GUIDE_SECTIONS.includes(name));
    if (unknownGuide || !guideNames.includes("Decision")) {
      throw new KnowledgeError(`${target.skill}: guides ${JSON.stringify(guideNames)} must name sections of ${GUIDE_SECTIONS.join(", ")} and include Decision`, where);
    }
    const slugs = new Map();
    for (const n of selected) {
      const key = layout === "per-rule" ? flatName(n.id) : slug(n.data.title);
      if (slugs.has(key)) throw new KnowledgeError(`${n.id} and ${slugs.get(key)} would both render as "${key}" in ${target.skill}`, { hint: "retitle one of them" });
      slugs.set(key, n.id);
    }

    const dir = join(root, target.skill);
    owned.push(join(dir, RULES_FILE), ...filesIn(join(dir, RULES_DIR)), ...filesIn(join(dir, GUIDES_DIR)));
    for (const n of selected.filter((g) => g.type === "guide" && guideExtras(g, target.guides).length)) {
      outputs.set(join(dir, guideFile(n)), renderGuideFile(n, target));
    }
    const title = target.title ? `${target.title}: full text` : `Rules for ${basename(target.skill)}`;
    if (target.kind === "skill-index") {
      for (const [file, content] of renderReferences(dir, title, selected, target, layout, target.profile ?? "full")) outputs.set(file, content);
      outputs.set(join(dir, "SKILL.md"), renderSkillIndex(root, target, selected, layout));
    } else if (target.kind === "knowledge-skill") {
      const inlineUpTo = IMPACTS.indexOf(target.inline ?? "high");
      const inlined = selected.filter((n) => IMPACTS.indexOf(n.data.impact) <= inlineUpTo);
      const linked = selected.filter((n) => !inlined.includes(n));
      for (const [file, content] of renderReferences(dir, title, linked, target, layout, "full")) outputs.set(file, content);
      outputs.set(join(dir, "SKILL.md"), renderKnowledgeSkill(target, inlined, linked, layout, config));
    } else {
      throw new KnowledgeError(`unknown target kind "${target.kind}" for ${target.skill}`, { ...where, hint: "use skill-index or knowledge-skill" });
    }
  }
  return { issues, outputs, owned };
}

function filesIn(dir) {
  return existsSync(dir) ? readdirSync(dir).map((f) => join(dir, f)) : [];
}

export function build(root) {
  const { issues, outputs, owned } = plan(root);
  if (issues.length) return { issues, written: [], removed: [] };
  const written = [];
  for (const [file, content] of outputs) {
    if (existsSync(file) && readFileSync(file, "utf8") === content) continue;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
    written.push(file);
  }
  const removed = owned.filter((f) => existsSync(f) && !outputs.has(f));
  for (const file of removed) {
    rmSync(file);
    const dir = dirname(file);
    if (basename(dir) === "rules" && existsSync(dir) && readdirSync(dir).length === 0) rmdirSync(dir);
  }
  return { issues, written, removed };
}

// Invalid notes and drift are reported apart: the first means "fix a note", the second "rebuild" (D17).
export function check(root) {
  const { issues, outputs, owned } = plan(root);
  if (issues.length) return { issues, problems: [] };
  const problems = [];
  const at = (file, message) => problems.push({ file: toPosix(relative(root, file)), message, hint: "run knowledge.mjs build; to change a rule, edit its note in knowledge/" });
  const stampOf = (s) => s.match(/sha256 ([0-9a-f]{12})/)?.[1];
  for (const [file, expected] of outputs) {
    if (!existsSync(file)) {
      at(file, "missing: the build has not been run since this note or target was added");
      continue;
    }
    const actual = readFileSync(file, "utf8");
    if (actual === expected) continue;
    at(file, stampOf(actual) === stampOf(expected)
      ? "edited by hand: the notes did not change, the generated text did"
      : "stale: a note or the target changed since the last build");
  }
  for (const file of owned) {
    if (existsSync(file) && !outputs.has(file)) at(file, "left behind: no note or layout produces this file any more");
  }
  return { issues, problems };
}

export function coverage(root) {
  const notes = loadNotes(root);
  const rows = [];
  for (const principle of notes.filter((n) => n.type === "principle" && (n.data.expects ?? []).length)) {
    const impls = notes.filter((n) => n.data.implements === principle.id);
    for (const expected of principle.data.expects) {
      const by = impls.filter((n) => [...n.facets.languages, ...n.facets.frameworks].includes(expected));
      rows.push({ principle: principle.id, expected, implementedBy: by.map((n) => n.id) });
    }
  }
  return rows;
}

// ------------------------------------------------------------------ lint

// Findings `validate` cannot make: it checks one note against the contract, lint looks across the
// base. Every finding is a warning, because each is a judgement call; `--strict` makes them fail.
// Deterministic and offline by default, so a hook can run it after every edit. The checks that need
// a model (semantic duplicates, contradictions) belong to a reviewer, not here (D1, D25).
const NEAR_DUPLICATE = 0.7; // word overlap of two titles, or of two summaries
const BUDGET_NEAR = 0.9; // warn from this share of a knowledge skill's line budget

const words = (text) => new Set(String(text ?? "").toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
function overlap(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size < 3) return 0; // too few words to say anything
  let shared = 0;
  for (const w of small) if (large.has(w)) shared += 1;
  return shared / small.size;
}

// ------------------------------------------------------------------ similar and neighbors

// What a note says, as words: title, summary and Rule. Why and the examples are left out, because
// they repeat vocabulary (the language, the library) that every note in a folder shares.
const ruleText = (note) => [note.data.title, note.data.summary, note.sections?.get("Rule") ?? note.sections?.get("Decision")].join(" ");
const noteWords = (note) => words(ruleText(note));
const FILLER = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "when", "not", "are", "use", "only", "every", "each", "any", "all", "its", "than", "then", "also", "instead", "never", "always"]);
const content = (set) => new Set([...set].filter((w) => !FILLER.has(w)));
// How much of the query the note covers, blended with Dice so a long note that merely mentions the
// words does not outrank a short note that is about them. A one-line query is short next to a
// note, so plain Dice would always rate it low.
function closeness(query, note) {
  const [a, b] = [content(query), content(note)];
  if (a.size < 3 || b.size < 3) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return (shared / a.size + (2 * shared) / (a.size + b.size)) / 2;
}
export const LIKELY_DUPLICATE = 0.5;
const RELATED = 0.2;

// The notes closest to a query. Lexical on purpose: it narrows 100+ notes to a handful a reviewer
// can read, and it is the same offline script the hook uses (D26). Judging them is the reviewer's job.
export function similar(root, query, { exclude = [], limit = 5 } = {}) {
  const notes = loadNotes(root, loadConfig(root));
  const q = words(query);
  return notes
    .filter((n) => !exclude.includes(n.id))
    .map((n) => ({ id: n.id, title: n.data.title, applies: n.data.applies ?? [], score: Math.round(closeness(q, noteWords(n)) * 100) / 100 }))
    .filter((r) => r.score >= RELATED)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

// Notes that changed or were added under knowledge/, from git; empty outside a repository.
export function changedNoteIds(root) {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const tracked = git(["diff", "--name-only", "HEAD", "--", "knowledge"]);
  const fresh = git(["ls-files", "--others", "--exclude-standard", "--", "knowledge"]);
  return [...(tracked.stdout ?? "").split("\n"), ...(fresh.stdout ?? "").split("\n")]
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/^knowledge\//, "").replace(/\.md$/, ""))
    .filter((id) => !id.startsWith("_") && id !== "README" && !id.endsWith("/README"))
    .sort();
}

// For each note: what a reviewer has to read next to it to judge duplicates and contradictions.
// Same-folder siblings come first because notes about one library or one stack contradict each
// other, not notes about unrelated topics.
export function neighbors(root, ids) {
  const notes = loadNotes(root, loadConfig(root));
  const byId = new Map(notes.map((n) => [n.id, n]));
  return ids.map((id) => {
    const note = byId.get(id);
    if (!note) return { id, missing: true };
    const folder = id.split("/").slice(0, -1).join("/");
    const linked = notes.filter((n) => n.data.implements === id || n.id === note.data.implements || (note.data.decides ?? []).includes(n.id) || (n.data.decides ?? []).includes(id)).map((n) => n.id);
    const siblings = notes.filter((n) => n.id !== id && n.id.startsWith(`${folder}/`) && n.id.split("/").length === id.split("/").length).map((n) => n.id);
    const lexical = similar(root, ruleText(note), { exclude: [id] });
    return {
      id,
      title: note.data.title,
      applies: note.data.applies ?? [],
      sources: note.data.sources ?? [],
      likelyDuplicates: lexical.filter((r) => r.score >= LIKELY_DUPLICATE).map((r) => r.id),
      similar: lexical,
      sameFolder: siblings,
      linked,
    };
  });
}

export async function lint(root, { links = false, fetchImpl = globalThis.fetch } = {}) {
  const config = loadConfig(root);
  const notes = loadNotes(root, config);
  const targets = loadTargets(root);
  const budgets = config.budgets ?? {};
  const findings = [];
  const warn = (note, message, hint) => findings.push({ file: note?.rel, message, hint });

  // 1. A note no target receives never reaches a skill or an agent.
  const received = new Set(targets.flatMap((t) => selectNotes(notes, t).map((n) => n.id)));
  for (const n of notes) {
    if (!received.has(n.id)) warn(n, "no target in targets.json receives this note", "add it to a target's `include`, or delete it");
  }

  // 2. Near-duplicates: two notes that say nearly the same thing in their title or summary.
  for (let i = 0; i < notes.length; i += 1) {
    for (let j = i + 1; j < notes.length; j += 1) {
      const [a, b] = [notes[i], notes[j]];
      // The same decision for two languages is a parallel, not a duplicate (D6).
      if (a.facets.languages.length && b.facets.languages.length && !a.facets.languages.some((l) => b.facets.languages.includes(l))) continue;
      const title = overlap(words(a.data.title), words(b.data.title));
      const summary = overlap(words(a.data.summary), words(b.data.summary));
      if (title >= NEAR_DUPLICATE || summary >= NEAR_DUPLICATE) {
        warn(a, `looks like ${b.id} (${title >= NEAR_DUPLICATE ? "title" : "summary"} overlaps ${Math.round(Math.max(title, summary) * 100)}%)`, "merge them, or make the difference explicit in the titles");
      }
    }
  }

  // 3. A principle that expects implementations and has none is an unbacked promise. One without
  // `expects` may stand alone (a reporting principle has no language to implement it in).
  const implemented = new Set(notes.map((n) => n.data.implements).filter(Boolean));
  for (const n of notes) {
    if (n.type === "principle" && (n.data.expects ?? []).length && !implemented.has(n.id)) warn(n, "no rule implements this principle", "write a rule with `implements`, or fold the principle into one");
  }

  // 4. Budgets: a knowledge skill near its line limit stops building on the next rule. (Titles and
  // summaries are not warned about: validate already fails them over the limit.)
  for (const target of targets.filter((t) => t.kind === "knowledge-skill")) {
    const file = join(root, target.skill, "SKILL.md");
    if (!existsSync(file)) continue;
    const lines = readFileSync(file, "utf8").split("\n").length;
    const max = target.maxLines ?? budgets.knowledgeSkillLines ?? 300;
    if (lines >= max * BUDGET_NEAR) findings.push({ file: "knowledge/targets.json", message: `${target.skill} is ${lines} of ${max} lines`, hint: "set `inline` to a stricter impact, or narrow `include`, before it stops building" });
  }

  // 5. Dead sources: only on request, because it needs the network.
  if (links) {
    const seen = new Map();
    for (const n of notes) {
      for (const url of Array.isArray(n.data.sources) ? n.data.sources : []) {
        if (!seen.has(url)) seen.set(url, probe(url, fetchImpl));
        const problem = await seen.get(url);
        if (problem) warn(n, `source ${url} ${problem}`, "update the link or drop the source");
      }
    }
  }
  return findings;
}

// Resolves to a problem description, or null when the URL answers. A network error is a
// finding too: from here the source cannot be reached either way.
async function probe(url, fetchImpl) {
  try {
    const response = await fetchImpl(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000) });
    return response.ok ? null : `answers ${response.status}`;
  } catch (error) {
    return `cannot be reached (${error.cause?.code ?? error.name})`;
  }
}

// ------------------------------------------------------------------ new

export function scaffold(root, id) {
  if (!id) throw new KnowledgeError("new needs a path, e.g. testing/storybook/portal-content-via-screen");
  const bad = id.split("/").find((s) => !KEBAB.test(s));
  if (bad) throw new KnowledgeError(`path segment "${bad}" is not lowercase kebab-case`);
  const file = join(root, "knowledge", `${id}.md`);
  if (existsSync(file)) throw new KnowledgeError(`knowledge/${id}.md already exists`, { hint: "edit the existing note instead of adding a near-duplicate" });

  // `applies` values the folder names already state, so the author adds only what the path can't say.
  const config = loadConfig(root);
  const type = typeOf(id);
  const principle = type === "principle";
  const applies = id.split("/").filter((s) => {
    const facet = config.facetOf.get(s);
    return facet && (!principle || facet === "libraries");
  });
  const template = type === "guide" ? "_template-guide.md" : "_template.md";
  const content = readFileSync(join(root, "knowledge", template), "utf8").replace("{{applies}}", applies.join(", "));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

// The first look at what already exists is free before the note is written and expensive after:
// the slug and the `--about` sentence are all there is to compare (D26).
export function closestTo(root, id, about = "") {
  const query = `${id.split("/").pop().replace(/-/g, " ")} ${about}`;
  const near = similar(root, query, { exclude: [id] });
  const folder = id.split("/").slice(0, -1).join("/");
  const dir = join(root, "knowledge", folder);
  const siblings = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md") && f !== `${id.split("/").pop()}.md`).map((f) => `${folder}/${f.slice(0, -3)}`) : [];
  return { near, siblings };
}

// ------------------------------------------------------------------ CLI

function report(issues) {
  for (const { file, message, hint } of issues) {
    console.error(`  ✗ ${message}`);
    if (file) console.error(`      ${file}`);
    if (hint) console.error(`      → ${hint}`);
  }
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string", default: process.cwd() },
      strict: { type: "boolean", default: false },
      links: { type: "boolean", default: false },
      about: { type: "string", default: "" },
      changed: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
  });
  const [command, ...rest] = positionals;
  const root = resolve(values.root);
  const show = (f) => toPosix(relative(root, f));

  switch (command) {
    case "new": {
      const file = scaffold(root, rest[0]);
      const { near, siblings } = closestTo(root, rest[0], values.about);
      console.log(`✓ created ${show(file)} (${typeOf(rest[0])})`);
      if (near.length) {
        console.log("  closest existing notes (read them before writing; merge into one if it is the same decision):");
        for (const r of near) console.log(`    ${r.score >= LIKELY_DUPLICATE ? "!" : " "} ${r.id} (${Math.round(r.score * 100)}%) ${r.title}`);
      }
      if (siblings.length) console.log(`  same folder: ${siblings.join(", ")}`);
      if (!values.about) console.log("  tip: pass --about \"<the decision in one sentence>\" for a closer comparison");
      console.log("  next: replace every {{TODO}}, then run `validate` and `build`");
      return 0;
    }
    case "validate": {
      const config = loadConfig(root);
      const notes = loadNotes(root, config);
      const issues = validateNotes(notes, config);
      if (issues.length) {
        report(issues);
        console.error(`\n${issues.length} problem(s) in ${notes.length} notes`);
        return 1;
      }
      console.log(`✓ ${notes.length} notes follow the authoring contract`);
      return 0;
    }
    case "build": {
      const { issues, written, removed } = build(root);
      if (issues.length) {
        report(issues);
        console.error("\nnothing written: fix the notes first");
        return 1;
      }
      written.forEach((f) => console.log(`  wrote   ${show(f)}`));
      removed.forEach((f) => console.log(`  removed ${show(f)}`));
      console.log(`✓ build complete: ${written.length} written, ${removed.length} removed`);
      return 0;
    }
    case "check": {
      const { issues, problems } = check(root);
      if (issues.length) {
        report(issues);
        console.error(`\n${issues.length} problem(s) in the notes: fix them before anything can be built`);
        return 1;
      }
      if (problems.length) {
        report(problems);
        console.error(`\n${problems.length} generated file(s) out of date`);
        return 1;
      }
      console.log("✓ every generated file matches its notes");
      return 0;
    }
    case "coverage": {
      const rows = coverage(root);
      let gaps = 0;
      for (const { principle, expected, implementedBy } of rows) {
        if (implementedBy.length) console.log(`  ✓ ${principle} [${expected}] ← ${implementedBy.join(", ")}`);
        else {
          gaps += 1;
          console.log(`  ✗ ${principle} [${expected}] has no implementation yet`);
        }
      }
      console.log(`\n${rows.length - gaps}/${rows.length} expected implementations exist`);
      return values.strict && gaps ? 1 : 0;
    }
    case "lint": {
      const findings = await lint(root, { links: values.links });
      for (const { file, message, hint } of findings) {
        console.log(`  ! ${message}`);
        if (file) console.log(`      ${file}`);
        if (hint) console.log(`      → ${hint}`);
      }
      console.log(findings.length ? `\n${findings.length} finding(s)` : "✓ no findings");
      return values.strict && findings.length ? 1 : 0;
    }
    case "similar": {
      const rows = similar(root, rest.join(" "));
      if (values.json) console.log(JSON.stringify(rows, null, 2));
      else if (!rows.length) console.log("✓ nothing close: no existing note overlaps this");
      else for (const r of rows) console.log(`  ${r.score >= LIKELY_DUPLICATE ? "!" : " "} ${r.id} (${Math.round(r.score * 100)}%) ${r.title}`);
      return 0;
    }
    case "neighbors": {
      const ids = values.changed ? changedNoteIds(root) : rest.map((r) => r.replace(/^knowledge\//, "").replace(/\.md$/, ""));
      if (!ids.length) {
        console.log(values.json ? "[]" : "✓ no changed notes to review");
        return 0;
      }
      const rows = neighbors(root, ids);
      if (values.json) console.log(JSON.stringify(rows, null, 2));
      else {
        for (const r of rows) {
          if (r.missing) {
            console.log(`  ✗ ${r.id}: no such note`);
            continue;
          }
          console.log(`  ${r.id}${r.likelyDuplicates.length ? `  ! likely duplicate of ${r.likelyDuplicates.join(", ")}` : ""}`);
          if (r.similar.length) console.log(`      similar:     ${r.similar.map((s) => `${s.id} (${Math.round(s.score * 100)}%)`).join(", ")}`);
          if (r.sameFolder.length) console.log(`      same folder: ${r.sameFolder.join(", ")}`);
          if (r.linked.length) console.log(`      linked:      ${r.linked.join(", ")}`);
        }
        console.log(`\n${rows.length} note(s) to review`);
      }
      return 0;
    }
    default:
      console.error("usage: knowledge.mjs <new|validate|build|check|coverage|lint|similar|neighbors> [--root <dir>]");
      return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof KnowledgeError)) throw error;
    report([{ file: error.file, message: error.message, hint: error.hint }]);
    process.exitCode = 1;
  }
}

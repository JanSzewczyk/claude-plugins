#!/usr/bin/env node
// Checks one skill directory for the authoring defects that are facts about bytes on disk:
// the frontmatter contract, the progressive-disclosure budget, the link graph, and a small
// set of prose signals that survive being measured.
//
// `marketplace-doctor` answers "does the repo still describe itself truthfully?" across every
// manifest and README. This script answers "is this one skill well built?" — and it stops where
// judgement begins. Anything that needs a reader rather than a regex is emitted as a metric
// instead of an issue, for the audit's probe layer to weigh.
//
// Usage: node check-skill.mjs <skill-dir> [--json] [--strict]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, posix, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const strict = argv.includes("--strict");
const target = resolve(argv.find((a) => !a.startsWith("--")) ?? process.cwd());

const issues = [];
const note = (severity, scope, file, message, hint) =>
  issues.push({ severity, scope, file: file ? relative(root, file).replace(/\\/g, "/") : null, message, hint });
const error = (...a) => note("error", ...a);
const warn = (...a) => note("warn", ...a);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// Walk up for a display root, so paths read sensibly whether the skill lives in a marketplace
// repo or on its own under ~/.claude/skills/. Falls back to the skill directory itself.
function findRoot(from) {
  let dir = from;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, ".claude-plugin")) || existsSync(join(dir, ".git"))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return from;
}

const root = findRoot(target);

// Minimal top-level YAML frontmatter reader: returns ordered keys plus scalar values.
// Enough for the contracts this repo enforces (flat keys, no nested maps at the top level).
function frontmatter(text) {
  const m = text.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
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
  // A folded or literal scalar opens with > or | — the marker is not part of the value.
  for (const k of keys) values[k] = values[k].replace(/^[>|][-+]?\s*/, "").trim();
  return { keys, values, raw: m[1], lines: m[1].split(/\r?\n/).length + 2 };
}

// Blanks out fenced blocks and inline code spans while preserving line numbering, so every
// prose regex below sees only prose. Without this the script flags its own references/checks.md,
// which quotes each of these messages verbatim.
function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      out.push({ n: i + 1, text: "" });
      return;
    }
    out.push({ n: i + 1, text: fenced ? "" : line.replace(/`[^`]*`/g, " ") });
  });
  return out;
}

const unquoted = (s) => s.replace(/"[^"]*"/g, " ").replace(/[„“][^”"]*[”"]/g, " ").replace(/'[^']*'/g, " ");
const approxTokens = (s) => Math.round(s.length / 4);

// ---------------------------------------------------------------- the target

if (!statSync(target, { throwIfNoEntry: false })?.isDirectory()) fail(`${target} is not a directory`);

const skillPath = join(target, "SKILL.md");
if (!existsSync(skillPath)) fail(`No SKILL.md in ${target} — is this a skill directory?`);

const folder = basename(target);
const rawSkill = readFileSync(skillPath, "utf8");
const fm = frontmatter(rawSkill);
const body = fm ? rawSkill.split(/\r?\n/).slice(fm.lines).join("\n") : rawSkill;
const bodyOffset = fm ? fm.lines : 0;
const bodyLines = body.split(/\r?\n/).length;

function listDir(name) {
  const dir = join(target, name);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isFile())
    .sort()
    .map((f) => `${name}/${f}`);
}

const bundled = {
  references: listDir("references"),
  scripts: listDir("scripts"),
  assets: listDir("assets"),
  templates: listDir("templates"),
};
const allBundled = [...bundled.references, ...bundled.scripts, ...bundled.assets, ...bundled.templates];
const markdownFiles = ["SKILL.md", ...allBundled.filter((f) => f.endsWith(".md"))];
const textOf = new Map(markdownFiles.map((f) => [f, readFileSync(join(target, f), "utf8")]));

// ------------------------------------------------------- the frontmatter contract

const SKILL_KEY_ORDER = ["name", "description", "allowed-tools", "argument-hint"];
const PERSON_PHRASES = ["I can", "I will", "I'll", "You can", "You should", "Use me"];
const TRIGGER_MARKERS = /\b(use (this )?(skill )?when|use whenever|whenever|trigger|invoke (it|this) when|not for|after |before )/i;

if (!fm) {
  error("frontmatter", skillPath, "SKILL.md has no YAML frontmatter", "the file must open with `---` on line 1 — otherwise the whole file, markers included, is treated as skill content");
} else {
  const { keys, values } = fm;

  const unknown = keys.filter((k) => !SKILL_KEY_ORDER.includes(k));
  if (unknown.length) {
    error("frontmatter", skillPath, `frontmatter carries keys outside the four-field contract: ${unknown.join(", ")}`, `allowed: ${SKILL_KEY_ORDER.join(", ")}`);
  }
  const known = keys.filter((k) => SKILL_KEY_ORDER.includes(k));
  const ordered = [...known].sort((a, b) => SKILL_KEY_ORDER.indexOf(a) - SKILL_KEY_ORDER.indexOf(b));
  if (known.join() !== ordered.join()) {
    error("frontmatter", skillPath, `frontmatter keys are out of order: ${known.join(", ")}`, `expected order: ${ordered.join(", ")}`);
  }

  const name = values.name ?? "";
  if (!name) {
    error("frontmatter", skillPath, "frontmatter has no name");
  } else {
    if (name !== folder) {
      error("frontmatter", skillPath, `frontmatter name "${name}" does not match the folder "${folder}"`, "the folder name is what becomes the slash command — rename whichever one is wrong");
    }
    if (name.length > 64) error("frontmatter", skillPath, `name "${name}" is ${name.length} characters — the limit is 64`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      error("frontmatter", skillPath, `name "${name}" is not lowercase kebab-case`, "lowercase letters, digits and single hyphens only — no leading, trailing or consecutive hyphens");
    }
    for (const reserved of ["anthropic", "claude"]) {
      if (name.includes(reserved)) error("frontmatter", skillPath, `name "${name}" contains the reserved word "${reserved}"`);
    }
  }

  const description = values.description ?? "";
  if (!description) {
    error("frontmatter", skillPath, "SKILL.md has no description — the description is the only thing loaded until the skill fires");
  } else {
    if (description.length > 1024) error("frontmatter", skillPath, `description is ${description.length} characters — the limit is 1024`);
    const person = PERSON_PHRASES.find((p) => new RegExp(`\\b${p.replace(/'/g, "['’]")}\\b`, "i").test(description));
    if (person) {
      error("frontmatter", skillPath, `description is written in the first or second person: "${person}"`, "the description is injected into the system prompt — third person only, or discovery suffers");
    }
    // Two weak signals ANDed: no trigger marker *and* short enough that it cannot be implying one.
    if (!TRIGGER_MARKERS.test(description) && description.length < 300) {
      warn("frontmatter", skillPath, "description never says when to use the skill", "Claude under-triggers by default — name the contexts and the phrasings a user would actually type");
    }
  }

  if (!keys.includes("argument-hint") && /\$ARGUMENTS|\$\{?ARGUMENTS|\$[1-9]\b/.test(body)) {
    warn("frontmatter", skillPath, "frontmatter has no `argument-hint` but the body documents an argument", "add argument-hint so the slash-command menu shows what to pass");
  }
}

// ---------------------------------------------- progressive disclosure budget

const bodyTokens = approxTokens(body);
if (bodyLines > 500) {
  warn("budget", skillPath, `SKILL.md body is ${bodyLines} lines — the budget is 500`, "move the detail into references/ and point at it — bundled files cost nothing until they are read");
}
if (bodyTokens > 5000) {
  warn("budget", skillPath, `SKILL.md body is roughly ${bodyTokens} tokens — the budget is 5000`, "the body stays in context for the rest of the session once the skill fires");
}

const headings = [];
proseLines(body).forEach(({ n, text }) => {
  const m = text.match(/^(#{1,6})\s+(.*\S)\s*$/);
  if (m) headings.push({ level: m[1].length, title: m[2], line: n + bodyOffset, index: n });
});

if (!headings.some((h) => h.level === 1)) {
  warn("budget", skillPath, "SKILL.md has no H1 title", "one H1 naming the skill orients whoever opens the file");
}

const bodyArr = body.split(/\r?\n/);
headings.forEach((h, i) => {
  const next = headings[i + 1];
  // A heading whose next heading is deeper is a parent of subsections, not an empty one.
  if (next && next.level > h.level) return;
  const slice = bodyArr.slice(h.index, next ? next.index - 1 : bodyArr.length);
  if (!slice.some((l) => l.trim())) {
    warn("budget", skillPath, `heading "${h.title}" has no content before the next heading`, "a heading with nothing under it costs tokens and promises something the file does not deliver");
  }
});

const seenHeadings = new Map();
for (const h of headings) {
  const key = `${h.level}:${h.title.toLowerCase()}`;
  if (seenHeadings.has(key)) {
    warn("budget", skillPath, `duplicate heading "${h.title}" at lines ${seenHeadings.get(key)} and ${h.line}`, "two sections with one name means a reader cannot tell which one the instructions meant");
  } else seenHeadings.set(key, h.line);
}

// ------------------------------------------------------------------ the link graph

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function linksIn(file) {
  const text = textOf.get(file) ?? "";
  const out = [];
  for (const m of text.matchAll(LINK)) {
    const raw = m[1];
    if (/^(https?:|mailto:|#)/.test(raw)) continue;
    // Skip anything that is not a relative path to a real file: template placeholders
    // (`{author-url}`), illustrative targets (`[label](url)`), and query strings.
    if (/[{}<>?&]/.test(raw) || !/[/.]/.test(raw)) continue;
    const cleaned = raw.replace(/#.*$/, "");
    if (!cleaned) continue;
    // Resolve against the linking file's own directory, so references/x.md -> ../assets/y.ts
    // lands inside the skill while SKILL.md -> ../other-skill/z.md escapes it.
    const resolved = posix.normalize(posix.join(posix.dirname(file), cleaned));
    out.push({ raw, resolved, outside: resolved.startsWith(".."), line: text.slice(0, m.index).split(/\r?\n/).length });
  }
  return out;
}

// A bundled file counts as reached when it is linked *or* named in the referring file — a script
// invoked as `node scripts/x.mjs` in a fenced block is reached, even though it is not a link, and
// so is a reference cited by its bare filename.
const mentions = (file, path$) => {
  const text = textOf.get(file) ?? "";
  return text.includes(path$) || text.includes(basename(path$));
};

for (const file of markdownFiles) {
  for (const link of linksIn(file)) {
    if (link.outside) continue; // points out of the skill — not ours to resolve
    if (!existsSync(join(target, link.resolved))) {
      error("links", join(target, file), `link target does not exist: ${link.raw}`, `${file}:${link.line} — fix the path or delete the link`);
    }
  }
}

const reachedFrom = (file) => allBundled.filter((b) => mentions(file, b) || linksIn(file).some((l) => l.resolved === b));
const firstHop = new Set(reachedFrom("SKILL.md"));
const secondHop = new Map();
for (const file of markdownFiles) {
  if (file === "SKILL.md" || !firstHop.has(file)) continue;
  for (const b of reachedFrom(file)) if (!firstHop.has(b) && b !== file) secondHop.set(b, file);
}

for (const [b, via] of secondHop) {
  error("links", join(target, b), `${b} is only reachable through ${via} — two hops from SKILL.md`, "Claude previews nested files with partial reads — link it directly from SKILL.md instead");
}
for (const b of allBundled) {
  if (!firstHop.has(b) && !secondHop.has(b)) {
    warn("links", join(target, b), `${b} is not linked from SKILL.md or from any file SKILL.md links`, "either link it where it is needed, or delete it — nothing reads it today");
  }
}

// Sideways edges between reference files: the shape that produces the two-hop read even when
// the target is also linked directly.
for (const file of markdownFiles) {
  if (!file.startsWith("references/")) continue;
  for (const l of linksIn(file)) {
    if (l.resolved.startsWith("references/") && l.resolved !== file) {
      warn("links", join(target, file), `${file} links sideways to ${l.resolved}`, "reference files should be readable cold — repeat the one fact, or move both under SKILL.md");
    }
  }
}

for (const { text } of proseLines(rawSkill)) {
  const m = text.match(/(?:^|\s)((?:\.{0,2}[\w-]+\\)+[\w.-]+)/);
  if (m && !/^\d/.test(m[1])) {
    error("links", skillPath, `path uses backslashes: ${m[1]}`, "forward slashes work everywhere; backslash paths break on Unix");
  }
}

const NONDESCRIPT = /^(doc|docs|file|notes?|misc|stuff|temp|tmp|data|info|other|new|untitled)\d*\.(md|mjs|js|json|txt)$/i;
for (const b of allBundled) {
  const base = basename(b);
  if (NONDESCRIPT.test(base)) {
    warn("links", join(target, b), `filename "${base}" does not say what it contains`, "Claude navigates the directory like a filesystem — name the file after its content");
  }
}

for (const file of markdownFiles) {
  if (file === "SKILL.md") continue;
  const lines = (textOf.get(file) ?? "").split(/\r?\n/);
  // The guidance is 100 lines; the trigger is 200. A preview reads roughly the first hundred
  // lines, so past 200 the reader sees under half the file and a contents list starts carrying
  // real weight. Below that it mostly adds a maintenance burden for a file you can see anyway.
  if (lines.length <= 200) continue;
  const head = lines.slice(0, 30);
  const hasToc = /contents|in this file|table of contents/i.test(head.join("\n")) || head.filter((l) => /^\s*([-*]|\d+\.)\s+\S/.test(l)).length >= 3;
  if (!hasToc) {
    warn("links", join(target, file), `${file} is ${lines.length} lines with no table of contents`, "a preview reads the top of the file — past 200 lines a contents list is what makes the rest visible");
  }
}

// The pointer blockquote near the top is an index. A target listed there *and* linked again in
// the body is listed twice: the blurb belongs at the point of use, not in a header block.
{
  const lines = body.split(/\r?\n/);
  const headEnd = Math.min(lines.length, 30);
  const quoted = new Map();
  for (let i = 0; i < headEnd; i++) {
    if (!/^\s*>/.test(lines[i])) continue;
    for (const m of lines[i].matchAll(LINK)) quoted.set(m[1].replace(/^\.\//, "").replace(/#.*$/, ""), i + 1 + bodyOffset);
  }
  for (let i = headEnd; i < lines.length; i++) {
    for (const m of lines[i].matchAll(LINK)) {
      const t = m[1].replace(/^\.\//, "").replace(/#.*$/, "");
      if (quoted.has(t)) {
        warn("links", skillPath, `the reference block lists ${t}, which the body already links at line ${i + 1 + bodyOffset}`, "keep the link where the reader needs it and drop the header entry, or keep the block as the only index");
        quoted.delete(t);
      }
    }
  }
}

// --------------------------------------------------------------- prose signals

const SHOUT = /(?<![\w-])(MUST|ALWAYS|NEVER|CRITICAL|IMPORTANT|MANDATORY|REQUIRED|DO NOT)(?![\w-])/g;
const TIME_SENSITIVE = /\b(as of \d{4}|at the time of writing|currently|recently|for now|latest version|new in v?\d)\b/i;
const PL_WORDS = ["nie", "jest", "oraz", "aby", "się", "żeby", "który", "która", "tylko", "przez", "można", "należy", "jako", "wtedy"];
const PL_RE = new RegExp(`(?<!\\p{L})(${PL_WORDS.join("|")})(?!\\p{L})`, "giu");
const DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g;

let shoutTotal = 0;
let languageSuspects = 0;

for (const file of markdownFiles) {
  const text = textOf.get(file) ?? "";
  const lines = proseLines(text);
  const shouts = lines.reduce((n, l) => n + (l.text.match(SHOUT)?.length ?? 0), 0);
  shoutTotal += shouts;
  const per50 = lines.length ? +((shouts / lines.length) * 50).toFixed(1) : 0;
  // Density is the signal. Naming individual lines is the cry-wolf failure — the probe layer
  // decides which instances are unearned.
  if (shouts >= 3 && per50 > 1) {
    warn("prose", join(target, file), `${shouts} all-caps imperatives in ${file} — ${per50} per 50 lines`, "state why instead; density is the signal, not any single line");
  }

  for (const { n, text: line } of lines) {
    const m = line.match(TIME_SENSITIVE);
    if (m) {
      warn("prose", join(target, file), `time-sensitive phrasing at ${file}:${n}: "${m[0]}"`, 'a skill has no idea what day it is — move superseded guidance into a collapsed "Old patterns" section');
    }
    const bare = unquoted(line);
    const hits = bare.match(PL_RE)?.length ?? 0;
    const marks = bare.match(DIACRITICS)?.length ?? 0;
    if (hits >= 2 || marks >= 3) {
      languageSuspects++;
      warn("prose", join(target, file), `${file}:${n} looks like Polish, not English: "${line.trim().slice(0, 70)}"`, "one language per skill — check whether this is a quoted user phrasing or a domain proper noun before rewriting");
    }
  }
}

const paragraphs = new Map();
for (const file of markdownFiles) {
  const lines = proseLines(textOf.get(file) ?? "");
  let buf = [];
  let start = 0;
  const flush = () => {
    const key = buf.join(" ").replace(/\s+/g, " ").trim();
    if (key.length >= 80) {
      if (paragraphs.has(key)) {
        const prev = paragraphs.get(key);
        warn("prose", join(target, file), `${file} line ${start} repeats a paragraph from ${prev.file} line ${prev.line}`, "say it once and link to it — the duplicate pays context twice for one idea");
      } else paragraphs.set(key, { file, line: start });
    }
    buf = [];
  };
  for (const { n, text } of lines) {
    if (text.trim()) {
      if (!buf.length) start = n;
      buf.push(text.trim());
    } else if (buf.length) flush();
  }
  if (buf.length) flush();
}

const SYNONYM_GROUPS = [
  ["endpoint", "url", "route"],
  ["folder", "directory"],
  ["skill", "plugin", "command"],
  ["test", "spec"],
];
const allProse = markdownFiles.map((f) => proseLines(textOf.get(f) ?? "").map((l) => l.text).join("\n")).join("\n");
const synonymGroups = Object.fromEntries(
  SYNONYM_GROUPS.map((g) => [g.join("|"), g.map((w) => (allProse.match(new RegExp(`(?<!\\w)${w}s?(?!\\w)`, "gi")) ?? []).length)])
);

// -------------------------------------------------------------- bundled scripts

const BUILTIN = /^(node:|[./])/;
const magicNumbers = [];

for (const s of bundled.scripts) {
  const text = readFileSync(join(target, s), "utf8");
  const lines = text.split(/\r?\n/);

  if (!lines[0]?.startsWith("#!")) {
    warn("scripts", join(target, s), `${s} has no shebang`, "without it the file cannot be executed directly, only handed to an interpreter");
  }
  for (const m of text.matchAll(/^\s*(?:import\s[^'"]*from\s*|import\s*)['"]([^'"]+)['"]/gm)) {
    if (!BUILTIN.test(m[1])) {
      warn("scripts", join(target, s), `${s} imports "${m[1]}", which is not a Node builtin`, "a skill script cannot assume an install step ran — use builtins, or say in SKILL.md what to install");
    }
  }

  const named = markdownFiles.some((f) => mentions(f, s));
  const invoked = markdownFiles.some((f) =>
    (textOf.get(f) ?? "").split(/\r?\n/).some((l) => l.includes(basename(s)) && /\b(node|python3?|bash|sh|npx|uv)\b|^\s*\.\//.test(l))
  );
  const readAsReference = markdownFiles.some((f) =>
    (textOf.get(f) ?? "").split(/\r?\n/).some((l) => l.includes(basename(s)) && /\b(read|see|reference|algorithm)\b/i.test(l))
  );
  if (named && !invoked && !readAsReference) {
    warn("scripts", join(target, s), `SKILL.md never says whether to run or read ${s}`, 'write "Run `<cmd>`" or "See <file> for the algorithm" — execution is usually what you want, and it costs no context');
  }

  lines.forEach((line, i) => {
    if (/^\s*(\/\/|#|\*)/.test(line)) return;
    for (const m of line.matchAll(/(?<![\w.])(\d{2,})(?![\w.])/g)) {
      const value = Number(m[1]);
      if ([10, 100, 1000, 500, 1024, 64].includes(value)) continue;
      const documented = /\/\/|#/.test(line) || /^\s*(\/\/|#)/.test(lines[i - 1] ?? "");
      if (!documented) magicNumbers.push({ file: s, line: i + 1, value });
    }
  });
}

// ------------------------------------------------------------------- reporting

const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warn");
const failing = strict ? issues.length > 0 : errors.length > 0;

const description = fm?.values?.description ?? "";
const metrics = {
  bodyLines,
  bodyTokensApprox: bodyTokens,
  descriptionChars: description.length,
  descriptionSentences: (description.match(/[.!?](\s|$)/g) ?? []).length,
  headings: headings.length,
  links: {
    internal: markdownFiles.reduce((n, f) => n + linksIn(f).length, 0),
    external: markdownFiles.reduce((n, f) => n + [...(textOf.get(f) ?? "").matchAll(/\]\((https?:[^)\s]+)\)/g)].length, 0),
    firstHop: [...firstHop],
    secondHop: Object.fromEntries(secondHop),
  },
  shouting: { count: shoutTotal, per50Lines: bodyLines ? +((shoutTotal / bodyLines) * 50).toFixed(1) : 0 },
  languageSuspects,
  synonymGroups,
  magicNumbers,
  referenceFiles: bundled.references.map((f) => {
    const lines = (textOf.get(f) ?? readFileSync(join(target, f), "utf8")).split(/\r?\n/).length;
    return { file: f, lines, linkedFromSkill: firstHop.has(f), linksOut: markdownFiles.includes(f) ? linksIn(f).map((l) => l.resolved) : [] };
  }),
};

if (asJson) {
  console.log(
    JSON.stringify(
      {
        skill: target.replace(/\\/g, "/"),
        root: root.replace(/\\/g, "/"),
        name: fm?.values?.name ?? folder,
        files: { skill: relative(root, skillPath).replace(/\\/g, "/"), ...bundled },
        metrics,
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

console.log(`\n${1 + allBundled.length} files · ${bodyLines} body lines · ${bodyTokens} ≈tokens · ${bundled.references.length} references`);
console.log(
  errors.length || warnings.length
    ? `${errors.length} error(s), ${warnings.length} warning(s)`
    : "✓ nothing mechanical to fix"
);

process.exit(failing ? 1 : 0);

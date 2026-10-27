#!/usr/bin/env node
// Parses Knip's JSON reporter output and ranks dead-code candidates by removal-confidence,
// so the analysis starts from a deterministic graph walk instead of a guess. Does the
// mechanical half of the job: flatten Knip's per-file issue groups, drop noise, weight by
// path category, confidence-per-issue-type, and churn. Semantic judgement (is this candidate
// actually dead, or a false positive?) is the caller's job — see ../references/false-positives.md.
// Usage: node rank-dead-code.mjs <knip-report.json> [--path <scope>] [--top <n>] [--since <git-date>] [--json]

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const positional = process.argv.slice(2).find((a) => !a.startsWith("--"));
const reportArg = positional ?? flag("--report", null);
const pathScope = flag("--path", null);
const topN = Number(flag("--top", "20"));
const since = flag("--since", "6 months ago");
const asJson = process.argv.includes("--json");

if (!reportArg) {
  fail(
    "No Knip report given. Generate one first, then point this script at it:\n" +
      "  npx knip --reporter json > knip-report.json\n" +
      "  node rank-dead-code.mjs knip-report.json"
  );
}

function findProjectRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const root = findProjectRoot(process.cwd());
const reportPath = resolve(reportArg);

if (!existsSync(reportPath)) {
  fail(`Report not found at ${reportPath}. Generate it with: npx knip --reporter json > knip-report.json`);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, "utf8"));
} catch (err) {
  fail(`Could not parse ${reportPath} as JSON: ${err.message}`);
}

const issues = Array.isArray(report.issues) ? report.issues : [];
if (issues.length === 0) {
  console.log("Knip reported no issues. Nothing to rank — either the repo is clean or Knip");
  console.log("isn't scanning what you expect (check its entry/project globs).");
  process.exit(0);
}

// Files whose "dead code" is structural noise, not a real removal candidate. Knip's own
// framework plugins should already exclude most of these; this is a defensive second pass
// for repos where Knip isn't fully configured yet.
const NOISE = [
  /\.d\.ts$/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.stories\.[cm]?[jt]sx?$/,
  /[\\/](__mocks__|__fixtures__|node_modules|\.next|dist|build|coverage|storybook-static)[\\/]/,
  /[\\/]generated[\\/]/,
  /[\\/]migrations[\\/]/
];

// Filenames Next.js/Remix/etc. invoke by convention, not by import — flag for a second look
// rather than silently trusting Knip's plugin coverage, since a misconfigured or missing
// framework plugin will report these as false positives.
const FRAMEWORK_CONVENTION = /[\\/](page|layout|route|middleware|loading|error|not-found|template|default|instrumentation|sitemap|robots|opengraph-image|twitter-image|icon|apple-icon)\.[cm]?[jt]sx?$/;

// Confidence per issue type: a whole unused file (nothing in the graph reaches it at all)
// is the strongest signal; an unused enum/class member is often part of an intentionally
// complete value set (status enums, config schemas) and easiest to be wrong about.
const ISSUE_TYPES = {
  files: { confidence: "high", label: "unused file", volume: 5 },
  dependencies: { confidence: "high", label: "unused dependency", volume: 4 },
  unlisted: { confidence: "medium", label: "unlisted dependency", volume: 2 },
  devDependencies: { confidence: "medium", label: "unused devDependency", volume: 2 },
  exports: { confidence: "medium", label: "unused export", volume: 3 },
  nsExports: { confidence: "medium", label: "unused namespace export", volume: 3 },
  duplicates: { confidence: "medium", label: "duplicate export", volume: 2 },
  types: { confidence: "medium-low", label: "unused type", volume: 1 },
  nsTypes: { confidence: "medium-low", label: "unused namespace type", volume: 1 },
  classMembers: { confidence: "low", label: "unused class member", volume: 1 },
  enumMembers: { confidence: "low", label: "unused enum member", volume: 1 },
  binaries: { confidence: "medium", label: "unused binary", volume: 1 },
  unresolved: { confidence: "n/a — bug", label: "unresolved import (broken, not dead)", volume: 0 }
};

// Path shape is a proxy for how carefully a candidate needs verification, not for whether
// it's dead — auth/money code gets read closely regardless of what Knip says.
const CATEGORIES = [
  { weight: 3.0, label: "auth/session", re: /[\\/](auth|session|permission|rbac|middleware)[\\/.]/i },
  { weight: 3.0, label: "money", re: /[\\/](payment|billing|invoice|checkout|subscription|pricing)[\\/.]/i },
  { weight: 2.0, label: "server action / route", re: /[\\/]actions?[\\/]|[\\/]route\.[cm]?[jt]s$|[\\/]api[\\/]/i },
  { weight: 1.5, label: "domain logic", re: /[\\/](services?|domain|lib|utils?|helpers?|hooks?)[\\/]/i },
  { weight: 1.0, label: "ui", re: /[\\/](components?|app|features?)[\\/]/i },
  { weight: 0.7, label: "config/scaffolding", re: /[\\/](config|scripts?)[\\/.]/i }
];

function categorize(relPath) {
  const hit = CATEGORIES.find((c) => c.re.test(`${sep}${relPath}`.replace(/\//g, sep)));
  return hit ? { weight: hit.weight, label: hit.label } : { weight: 1.0, label: "other" };
}

// Recently touched code is more likely to be mid-migration scaffolding (a false positive);
// long-untouched dead code is more likely genuinely abandoned. This is the inverse emphasis
// from a coverage-risk ranking, where recent churn raises urgency — here it raises caution.
function churnFor(relPath) {
  try {
    const out = execFileSync("git", ["log", `--since=${since}`, "--format=%H", "--", relPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.split("\n").filter(Boolean).length;
  } catch {
    return 0; // not a git repo, or file untracked
  }
}

const findings = [];

for (const entry of issues) {
  const relPath = entry.file ?? "(unknown)";
  if (NOISE.some((re) => re.test(relPath))) continue;
  if (pathScope && !relPath.replace(/\\/g, "/").includes(pathScope.replace(/\\/g, "/"))) continue;

  const category = categorize(relPath);
  const churn = churnFor(relPath);
  const isFrameworkFile = FRAMEWORK_CONVENTION.test(relPath);

  for (const [issueType, meta] of Object.entries(ISSUE_TYPES)) {
    const items = entry[issueType];
    if (!Array.isArray(items) || items.length === 0) continue;

    const churnMultiplier = 1 + Math.min(churn, 10) / 10; // recent churn -> handle with more care
    const score = category.weight * meta.volume * churnMultiplier;

    findings.push({
      file: relPath,
      issueType,
      issueLabel: meta.label,
      confidence: isFrameworkFile ? "review — framework convention file" : meta.confidence,
      category: category.label,
      score: Math.round(score * 10) / 10,
      churn,
      symbols: items.map((i) => ({
        name: i.name ?? i.namespace ?? "(file)",
        line: i.line ?? null
      }))
    });
  }
}

// High confidence first, then score within each tier — the report should lead with what's
// safest to act on, not just what's structurally biggest.
const CONFIDENCE_ORDER = { high: 0, medium: 1, "medium-low": 2, low: 3 };
findings.sort((a, b) => {
  const aOrder = CONFIDENCE_ORDER[a.confidence] ?? 4;
  const bOrder = CONFIDENCE_ORDER[b.confidence] ?? 4;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return b.score - a.score;
});

const top = findings.slice(0, topN);

if (asJson) {
  console.log(JSON.stringify({ reportPath, since, totalFindings: findings.length, findings: top }, null, 2));
  process.exit(0);
}

if (top.length === 0) {
  console.log("No dead-code candidates found outside of ignored/noise files. Nothing to rank.");
  process.exit(0);
}

console.log(`Knip report: ${relative(root, reportPath).split(sep).join("/")}`);
if (pathScope) console.log(`Scoped to paths containing: ${pathScope}`);
console.log(`${findings.length} candidate(s); showing top ${top.length} by confidence then score.\n`);

for (const [i, x] of top.entries()) {
  console.log(`${i + 1}. ${x.file}  [${x.issueLabel}]  confidence: ${x.confidence}  score ${x.score}`);
  console.log(`   category: ${x.category} | ${x.churn} commit(s) since ${since}`);
  if (x.symbols.length && !(x.symbols.length === 1 && x.symbols[0].name === "(file)")) {
    const names = x.symbols.map((s) => (s.line ? `${s.name}:${s.line}` : s.name)).join(", ");
    console.log(`   symbols: ${names}`);
  }
  console.log("");
}

console.log("Confidence reflects issue type (whole file > export > type > enum/class member),");
console.log("not certainty. A file flagged 'review — framework convention file' matched a");
console.log("Next.js/Remix-style filename Knip's plugin may or may not have excluded — open it.");
console.log("This orders candidates; it does not judge them. Read references/false-positives.md");
console.log("and verify each one before reporting it as dead.");

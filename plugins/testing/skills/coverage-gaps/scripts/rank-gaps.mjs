#!/usr/bin/env node
// Parses an Istanbul/Vitest coverage report and ranks uncovered code by risk, so the
// analysis starts from evidence instead of a guess. Does the deterministic half of the
// job: extract uncovered statements/branches/functions, drop noise files, weight by path
// category and git churn. Semantic judgement (does this gap actually matter?) is the
// caller's job — see ../references/risk-model.md.
// Usage: node rank-gaps.mjs [--coverage <path>] [--top <n>] [--since <git-date>] [--json]

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

const coverageArg = flag("--coverage", null);
const topN = Number(flag("--top", "15"));
const since = flag("--since", "6 months ago");
const asJson = process.argv.includes("--json");

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

const CANDIDATES = [
  "coverage/coverage-final.json",
  "coverage/unit/coverage-final.json",
  ".coverage/coverage-final.json"
];

const coveragePath = coverageArg
  ? resolve(coverageArg)
  : CANDIDATES.map((c) => join(root, c)).find((p) => existsSync(p));

if (!coveragePath || !existsSync(coveragePath)) {
  fail(
    `No coverage report found. Looked for: ${CANDIDATES.join(", ")}.\n` +
      `  Generate one with: npm run test:unit -- --coverage --coverage.reporter=json\n` +
      `  Or point at an existing report: --coverage <path/to/coverage-final.json>`
  );
}

let report;
try {
  report = JSON.parse(readFileSync(coveragePath, "utf8"));
} catch (err) {
  fail(`Could not parse ${coveragePath} as JSON: ${err.message}`);
}

// Files whose uncovered lines are almost never worth a test. Reporting them buries the
// real findings, so they are dropped before ranking rather than merely down-weighted.
const NOISE = [
  /\.d\.ts$/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.stories\.[cm]?[jt]sx?$/,
  /\.config\.[cm]?[jt]s$/,
  /[\\/](__mocks__|__fixtures__|node_modules|\.next|dist|build|coverage|storybook-static)[\\/]/,
  /[\\/]generated[\\/]/,
  /[\\/]migrations[\\/]/
];

// Vitest's v8 provider decorates its Istanbul output with two artefacts that are not real
// code: a placeholder "(empty-report)" function for files where nothing executed, and one
// synthetic branch per function body. Left in, they invent gaps at line 1 of every untested
// file and double-report an uncovered function as an uncovered branch. Strip them so the
// ranking reflects the source, not the reporter.
function normalizeV8(data) {
  const fnMap = { ...(data.fnMap ?? {}) };
  const f = { ...(data.f ?? {}) };
  const branchMap = { ...(data.branchMap ?? {}) };
  const b = { ...(data.b ?? {}) };

  const at = (loc) => `${loc?.start?.line}:${loc?.start?.column}`;
  const fnLocs = new Set();

  for (const [id, meta] of Object.entries(fnMap)) {
    fnLocs.add(at(meta?.loc ?? meta?.decl));
    if (meta?.name === "(empty-report)") {
      delete fnMap[id];
      delete f[id];
    }
  }

  for (const [id, meta] of Object.entries(branchMap)) {
    if (fnLocs.has(at(meta?.loc))) {
      delete branchMap[id];
      delete b[id];
    }
  }

  return { ...data, fnMap, f, branchMap, b };
}

// Coverage reports are routinely produced somewhere else — CI, a container, another
// checkout — so the recorded paths don't exist locally. Re-anchor by finding the longest
// trailing segment that does exist here; without this, paths aren't clickable and every
// `git log` lookup silently returns zero, quietly disabling the churn signal.
function anchorToRepo(filePath) {
  const rel = relative(root, filePath);
  if (rel && !rel.startsWith("..")) return rel.split(sep).join("/");

  const parts = filePath.split(/[\\/]/).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join("/");
    if (existsSync(join(root, candidate))) return candidate;
  }
  return filePath.split(/[\\/]/).join("/");
}

// A barrel is structurally recognisable: an index file that declares no functions and no
// branches is pure re-export, so its "0% coverage" measures nothing. Checking shape rather
// than filename avoids dropping an index.ts that actually holds logic.
function isBarrel(relPath, data) {
  if (!/[\\/]?index\.[cm]?[jt]sx?$/.test(relPath)) return false;
  return Object.keys(data.fnMap ?? {}).length === 0 && Object.keys(data.branchMap ?? {}).length === 0;
}

// Path shape is a decent proxy for blast radius: a broken server action costs more than a
// broken presentational component. Weights are deliberately coarse — they order the list,
// they don't decide it.
const CATEGORIES = [
  { weight: 3.0, label: "auth/session", re: /[\\/](auth|session|permission|rbac|middleware)[\\/.]/i },
  { weight: 3.0, label: "money", re: /[\\/](payment|billing|invoice|checkout|subscription|pricing)[\\/.]/i },
  { weight: 2.5, label: "server action", re: /[\\/]actions?[\\/]/i },
  { weight: 2.5, label: "route handler", re: /[\\/]route\.[cm]?[jt]s$|[\\/]api[\\/]/i },
  { weight: 2.0, label: "data access", re: /[\\/](db|database|queries|repositories|prisma|drizzle)[\\/.]/i },
  { weight: 2.0, label: "validation", re: /[\\/](schemas?|validation|validators?)[\\/.]/i },
  { weight: 1.5, label: "domain logic", re: /[\\/](services?|domain|lib|utils?|helpers?|hooks?)[\\/]/i },
  { weight: 1.0, label: "ui", re: /[\\/](components?|app|features?)[\\/]/i }
];

function categorize(relPath) {
  const hit = CATEGORIES.find((c) => c.re.test(`${sep}${relPath}`.replace(/\//g, sep)));
  return hit ? { weight: hit.weight, label: hit.label } : { weight: 1.0, label: "other" };
}

// Recently churning code is where bugs land. A file untouched for a year is uncovered but
// stable; one rewritten five times last month is uncovered and moving.
function churnFor(relPath) {
  try {
    const out = execFileSync("git", ["log", `--since=${since}`, "--format=%H", "--", relPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return out.split("\n").filter(Boolean).length;
  } catch {
    return 0; // not a git repo, or file untracked — churn simply doesn't contribute
  }
}

function ranges(lines) {
  // Collapse [3,4,5,9] into ["3-5","9"] so the report points at blocks, not confetti.
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const out = [];
  let start = null;
  let prev = null;
  for (const line of sorted) {
    if (start === null) {
      start = prev = line;
      continue;
    }
    if (line === prev + 1) {
      prev = line;
      continue;
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = line;
  }
  if (start !== null) out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out;
}

const findings = [];

for (const [absPath, raw] of Object.entries(report)) {
  const data = normalizeV8(raw);
  const relPath = anchorToRepo(data.path ?? absPath);
  if (NOISE.some((re) => re.test(relPath))) continue;
  if (isBarrel(relPath, data)) continue;

  const { statementMap = {}, branchMap = {}, fnMap = {}, s = {}, b = {}, f = {} } = data;

  const uncoveredStatementLines = Object.entries(s)
    .filter(([, count]) => count === 0)
    .map(([id]) => statementMap[id]?.start?.line)
    .filter(Boolean);

  // A branch is a gap when at least one of its paths never ran — this is what a headline
  // "100% lines" figure hides, and it's usually where the untested error path lives.
  const uncoveredBranches = [];
  for (const [id, counts] of Object.entries(b)) {
    const meta = branchMap[id];
    if (!meta) continue;
    counts.forEach((count, idx) => {
      if (count !== 0) return;
      const loc = meta.locations?.[idx]?.start ?? meta.loc?.start;
      if (loc?.line) uncoveredBranches.push({ line: loc.line, type: meta.type ?? "branch" });
    });
  }

  const uncoveredFunctions = Object.entries(f)
    .filter(([, count]) => count === 0)
    .map(([id]) => ({
      name: fnMap[id]?.name ?? "(anonymous)",
      line: fnMap[id]?.decl?.start?.line ?? fnMap[id]?.loc?.start?.line
    }))
    .filter((fn) => fn.line);

  const totalStatements = Object.keys(s).length;
  if (totalStatements === 0) continue;
  if (uncoveredStatementLines.length === 0 && uncoveredBranches.length === 0 && uncoveredFunctions.length === 0) {
    continue; // fully covered — nothing to report
  }

  const category = categorize(relPath);
  const churn = churnFor(relPath);
  const churnMultiplier = 1 + Math.min(churn, 10) / 10;

  // Branches and whole-function gaps signal untested behaviour; bare statements often just
  // trail an already-tested path. Weighting them apart keeps trivia off the top of the list.
  const volume = uncoveredBranches.length * 3 + uncoveredFunctions.length * 2 + uncoveredStatementLines.length;
  const score = category.weight * volume * churnMultiplier;

  const coveredStatements = totalStatements - uncoveredStatementLines.length;

  // Percentages come from the *raw* report so they match what `vitest --coverage` prints.
  // Deriving them from the normalized data instead produced figures like "0% branch" on a
  // file vitest called 28%, and readers rightly stopped trusting the whole report. The
  // normalization earns its keep in the uncovered-line listing and the score; it has no
  // business restating the tool's headline numbers.
  const rawB = raw.b ?? {};
  const totalBranches = Object.values(rawB).reduce((acc, arr) => acc + arr.length, 0);
  const coveredBranches = Object.values(rawB).reduce((acc, arr) => acc + arr.filter((c) => c > 0).length, 0);

  findings.push({
    file: relPath,
    category: category.label,
    score: Math.round(score * 10) / 10,
    churn,
    statementCoverage: Math.round((coveredStatements / totalStatements) * 100),
    branchCoverage: totalBranches ? Math.round((coveredBranches / totalBranches) * 100) : null,
    uncoveredFunctions,
    uncoveredBranchLines: ranges(uncoveredBranches.map((x) => x.line)),
    uncoveredLines: ranges(uncoveredStatementLines)
  });
}

findings.sort((a, b) => b.score - a.score);
const top = findings.slice(0, topN);

if (asJson) {
  console.log(JSON.stringify({ coveragePath, since, totalFiles: findings.length, findings: top }, null, 2));
  process.exit(0);
}

if (top.length === 0) {
  console.log("No uncovered code found outside of ignored files. Nothing to rank.");
  process.exit(0);
}

console.log(`Coverage report: ${relative(root, coveragePath).split(sep).join("/")}`);
console.log(`Churn window: commits since ${since}`);
console.log(`${findings.length} file(s) with gaps; showing top ${top.length} by risk score.\n`);

for (const [i, x] of top.entries()) {
  const branch = x.branchCoverage === null ? "n/a" : `${x.branchCoverage}%`;
  console.log(`${i + 1}. ${x.file}  [${x.category}]  score ${x.score}`);
  console.log(`   stmt ${x.statementCoverage}% | branch ${branch} | ${x.churn} commit(s) since ${since}`);
  if (x.uncoveredFunctions.length) {
    const fns = x.uncoveredFunctions.map((fn) => `${fn.name}:${fn.line}`).join(", ");
    console.log(`   never called: ${fns}`);
  }
  if (x.uncoveredBranchLines.length) console.log(`   uncovered branches @ ${x.uncoveredBranchLines.join(", ")}`);
  if (x.uncoveredLines.length) console.log(`   uncovered lines @ ${x.uncoveredLines.join(", ")}`);
  console.log("");
}

console.log("Percentages match `vitest --coverage`. The listed branch/line numbers exclude v8's");
console.log("synthetic per-function pseudo-branches, so they point at real conditionals only.");
console.log("Score = path-category weight x (branches x3 + functions x2 + statements) x churn multiplier.");
console.log("It orders candidates; it does not judge them. Read the code before reporting a gap as important.");

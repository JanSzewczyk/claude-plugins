---
name: dead-code
description: Find dead code — unused files, exports, types, and dependencies — and propose safe removal refactors. Uses Knip's dependency-graph reachability analysis as the deterministic engine so the expensive part (walking a large source tree) never happens token-by-token, then ranks and reads only the candidates worth a human decision. Use whenever the user asks to find unused code, clean up dead code, remove unused exports/files/dependencies, or wants a repo "swept" for cruft — even if they just say "this file feels unused" or "can we delete this."
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[path to scope the analysis, e.g. src/features/billing]"
---

# Dead Code

Find the code nobody calls anymore, and say so with evidence — not a 4,000-line tool dump.
The deliverable is a short, ranked list of removal candidates a developer can act on, each
with a confidence level and the reason it's safe (or not) to delete.

This distinction is the whole point of the skill. Knip already finds every unused export in
the repo; that output is long and includes real false positives (framework entry points,
public API surface, dynamic references). The value you add is **judgement** — verifying each
candidate has no dynamic/string-based/framework-convention caller before calling it dead.

> - [references/false-positives.md](./references/false-positives.md) — the patterns that look
>   dead but aren't (Next.js special files, dynamic imports, CVA compound variants, barrel
>   re-exports, feature flags), and the confidence model for what's safe to remove outright
>   vs. what needs a human decision. Read this before ranking anything.
> - [scripts/rank-dead-code.mjs](./scripts/rank-dead-code.mjs) — runs Knip, parses its JSON
>   report, filters noise, and scores candidates by removal-confidence and blast radius.

## Why Knip, not a hand-rolled scan

Dead-code detection is fundamentally a **reachability problem**: build a graph of
files/exports/dependencies, mark everything reachable from the app's entry points, and
whatever's unmarked is dead (the same mark-and-sweep idea bundlers use for tree-shaking).
Building that graph correctly — resolving TypeScript path aliases, barrel re-exports,
monorepo workspaces, framework conventions (Next.js pages/routes/middleware), namespace
exports — is a large, fiddly undertaking that existing tools have already solved:

- **Knip** — the current best default. Models the whole project as a dependency graph
  (files, exports, types, dependencies) and ships plugins that understand Next.js, Vitest,
  Storybook, and dozens of other frameworks, so framework entry files are excluded before
  you ever see the report. Supersedes `ts-prune` and `unimported` (both now archived/
  unmaintained).
- **madge** — dependency graph visualization / circular-dependency detection; useful for
  understanding a module's blast radius before removing it, not for finding dead code itself.
- **ESLint** (`no-unused-vars`, `import/no-unused-modules`) — file-local only, no cross-file
  reachability. Good for catching new dead code in a diff, not for a repo-wide sweep.

Don't reimplement graph reachability by grepping for `import` statements — that misses
dynamic imports, path aliases, and re-export chains, and produces a worse result than the
existing tooling for far more effort. **Delegate the expensive graph walk to Knip; spend your
own reasoning on the judgement calls it can't make.**

## Scope

TypeScript/JavaScript projects (Next.js, React, Node). Finds **unused files, exports, types,
class/enum members, and dependencies**. It does not find dead code *within* a still-called
function (unreachable branches inside a function body) — that's a linter/type-narrowing
concern, not a reachability one; mention it if you spot it while reading a candidate, but it
isn't this skill's target.

## Workflow

### 1. Check for Knip, run it

```bash
# if Knip is already a devDependency and configured:
npx knip --reporter json > knip-report.json

# if not configured yet, Knip works without config on a first pass —
# it infers entry points from package.json/tsconfig, framework files, etc.
npx knip --reporter json > knip-report.json
```

Scope a huge monorepo with `--workspace <path>` or `--include files,exports` to keep the
first run fast; a full run on a large repo can take a while, but it's still one deterministic
pass instead of reading every file.

If Knip errors out entirely (misconfigured `tsconfig.json`, unsupported monorepo layout),
say so plainly and don't fall back to a manual `grep`-based scan — that produces a
confident-looking report built on nothing, which is worse than no report. Fix the Knip
config first (usually a missing `entry`/`project` glob), or offer to add a minimal
`knip.json`.

### 2. Rank the candidates

```bash
node <skill-path>/scripts/rank-dead-code.mjs knip-report.json --top 20
```

Scope it to a path if the user named one (`--path src/features/billing`). The script does
the mechanical part: parses Knip's report, drops noise (types-only files, generated code,
test/story files already excluded by Knip's own plugins), weights by path category and git
churn, and assigns a starting confidence per issue type (unused **file** > unused
**export** > unused **type**/**enum member**, since a whole unreferenced file is much safer
to delete than one export off a file still in use).

Treat its ordering as a **starting hypothesis, not a verdict** — same as any static graph
analysis, it can't see dynamic dispatch, string-based routing, or public-API intent. That's
your job in the next step.

### 3. Verify the top candidates

For each of the top ~10-15 rows, open the file and check the specific things static analysis
can't see — see [references/false-positives.md](./references/false-positives.md) for the
full list:

- Is it a framework convention file Knip's plugin didn't catch (custom middleware pattern,
  a non-standard route registration)?
- Is it referenced dynamically — string-based `import()`, a route/plugin registry keyed by
  name, reflection-style lookups?
- Is it exported intentionally as **public API** of a package/barrel, with unknown external
  callers Knip can't see (published npm package, another repo)?
- Does removing it cascade (an unused export whose only caller is itself also-unused code —
  in which case remove both together, not one at a time)?

Drop anything you can't justify as genuinely dead. A candidate you didn't open the file for
isn't a finding — and if the user acts on it and it turns out to be a Next.js `loading.tsx`
convention file, they'll rightly distrust the rest of the report.

### 4. Propose the removal

For candidates that survive verification, either:

- **Make the edit directly** (delete the file / export / dependency) if the user asked for
  cleanup and confidence is high — but list every change made, don't silently delete in bulk.
- **Propose it** as a diff/list for approval first, if confidence is medium or the change
  touches many files — deleting code is easy to do and mildly annoying to undo (a revert),
  so default to showing the list before acting on anything beyond a handful of clear-cut
  single-file removals.

After any deletion, run the project's type-check/build/test commands to confirm nothing
silently depended on the removed code through a path Knip couldn't model (dynamic access,
a test that imports it directly, etc.).

## Report structure

```markdown
## Dead code found

**Scope:** <what was analyzed> · **Knip:** <N> files, <M> exports, <K> unused deps flagged

### High confidence — safe to remove

1. **`path/to/unused-file.ts`** (whole file, 0 importers) — <what it was for, why it's dead>
2. **`path/to/module.ts` → `exportedHelper`** — unused since <context, e.g. superseded by X>

### Needs a decision

3. **`path/to/legacy-adapter.ts`** — Knip flags it unused, but it's the fallback branch for
   `<feature flag>`; dead only once the flag is fully rolled out. <recommendation>

## Deliberately excluded

<Framework files, public API exports, dynamic-reference false positives Knip surfaced but
that aren't actually dead — one line each with why, so the reader knows you looked.>

## Unused dependencies

<package.json entries Knip flagged, if any — separate from file/export findings since the
removal mechanics differ (npm uninstall vs. code edit).>
```

Keep the top section to what actually survived verification — typically **5-15** high-
confidence items plus however many need a decision. A shorter, all-signal list beats a long
one padded with unverified tool output.

## Handoff

After removal, suggest running the project's test suite and a full `tsc`/build to catch
anything Knip's static model missed. For recurring cleanup, suggest wiring `npx knip` into
CI (`knip --reporter json` exits non-zero on new issues) so dead code is caught at PR time
instead of accumulating for a future sweep.

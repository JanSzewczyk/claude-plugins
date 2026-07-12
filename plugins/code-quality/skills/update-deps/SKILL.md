---
name: update-deps
description: >
  Update npm dependencies safely in sequential, theme-grouped batches. For each group: verify the app still works
  (type-check, lint, build, tests), commit the group on success or roll it back on failure, and pause to confirm before
  any major (breaking) bump after fetching its migration guide. Once all groups are done, runs a dependency security
  audit (npm/pnpm/yarn audit) against the final tree and resolves what it can. Ends with a full report of what changed,
  which updates forced code migrations, and the audit results. Use this skill whenever the user wants to update, upgrade, or bump npm packages,
  dependencies, or libraries in bulk — "update my deps", "upgrade everything to latest", "bump the outdated packages",
  "update Storybook / Next / Vitest", "do a dependency update pass" — even if they don't say "update-deps". Prefer the
  library-updater agent instead for a single one-off package change; prefer this skill whenever there are several
  packages to move and the user wants it done safely and reported.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
argument-hint: "[optional filter, e.g. 'storybook', 'minor-only', or 'skip-majors']"
---

# Update Deps

Update a project's npm dependencies the safe way: in **small, themed, version-locked groups**, applied **one group at a
time**, where each group is verified against the app before it is committed. A group that breaks the app is rolled back,
not left half-applied. The whole point is that you never end up in a state where many packages moved at once and you
can't tell which one broke the build — every commit in the history is a known-good checkpoint.

> **Reference files:**
>
> - [references/grouping.md](./references/grouping.md) — how to group packages into version-locked families. Read this before grouping.
> - [references/report-template.md](./references/report-template.md) — the exact shape of the final report. Read this before writing the report.

## Why grouping matters (read this first)

Thematic grouping isn't cosmetic — it's a correctness requirement. Families like `@storybook/*`, `vitest` +
`@vitest/*`, `react` + `react-dom` + `@types/react`, or `next` + `eslint-config-next` are **version-locked to each
other**: bump one without the others and the build fails on a peer-version mismatch even though each individual package
"installed fine." So the rule is:

- **Group = packages that must move together**, with the theme name as the human-friendly label.
- **A group's risk level is the _maximum_ of its members** — if any package in a family jumps a major version, the
  whole family is treated as a major (breaking) group and goes through the confirm-on-major path together.
- **Never split a major member out of its family.** If `@storybook/react` goes v8 → v9, every `@storybook/*` moves to
  v9 in the same group, gated on the same confirmation.

See [references/grouping.md](./references/grouping.md) for the family rules and ordering.

## Preconditions — check before touching anything

1. **Clean working tree.** Run `git status --porcelain`. Commit-per-group only makes sense from a clean start. If the
   tree is dirty, stop and ask the user to commit or stash first — do not proceed.
2. **Detect the package manager** from the lockfile, and use it consistently:
   - `package-lock.json` → npm · `pnpm-lock.yaml` → pnpm · `yarn.lock` → yarn · `bun.lockb` → bun
3. **Detect verification scripts** by reading `package.json` `"scripts"`. Map the user's intended checks to whatever
   actually exists; note any that are missing so you can record them as "not available" in the report. Look for, in this order:
   - **Type-check** — `type-check`, `typecheck`, `tsc`, or fall back to `npx tsc --noEmit`
   - **Lint** — `lint`, `eslint`
   - **Build** — `build`
   - **Tests** — `test`, `test:ci`, `test:unit`. **Disable watch mode** or the run will hang — append `--run`
     (Vitest), `--watchAll=false` / `--ci` (Jest), or set `CI=true`.
4. **Read project context** for conventions and any extra commands: `CLAUDE.md` if present.

## Workflow

Use TodoWrite to track one item per group so progress is visible. Then:

### Step 1 — Discover what's outdated

Run the package manager's outdated command in JSON form, e.g. `npm outdated --json` (works even when it exits non-zero;
capture the output). Parse current / wanted / latest for every dependency. Classify each as **patch**, **minor**, or
**major** by comparing current → latest semver.

### Step 2 — Group and order

Apply the family rules in [references/grouping.md](./references/grouping.md). If there are only a few packages (roughly
≤ 5) and no families among them, it's fine to use a single group or one-package-per-group — don't manufacture
complexity. Then order groups **lowest risk first**: patch/minor tooling and `@types/*` groups before feature libraries,
and **all major groups last** so the easy wins are banked and committed before you risk the breaking ones.

### Step 3 — Process each group, sequentially

For every group, in order:

1. **Classify the group.** Risk = max of its members (see above).
2. **If the group is major (breaking):**
   - Fetch the migration guide via Context7 (`resolve-library-id` → `get-library-docs`) for the headline package(s) in
     the family. Pull the breaking changes, codemods, and the new minimum peer versions.
   - **Pause and present** a short summary to the user: old → new versions, the breaking changes that look relevant to
     this codebase, and your migration plan. **Wait for confirmation** before applying. If the user declines, mark the
     group **deferred** in the report and move to the next group.
3. **Apply the updates** for the whole group, preserving each entry's existing semver range operator (`^`, `~`, or
   exact) and its dependency section (`--save-dev` for devDependencies). One install command for the group is fine.
4. **Verify**, running the detected checks in this order and stopping at the first failure: **type-check → lint →
   build → tests**. (Cheapest, fastest-failing signal first.)
5. **If verification fails:**
   - Decide whether it's a fixable migration (renamed API, moved import, changed config, new type) or a genuine
     blocker. For major groups, use the Context7 migration guide to drive the fix.
   - If you fix it: make the **minimal code changes**, re-run verification from the top, and — this is important —
     **record now, inline, what you changed**: which package forced it, which files you touched, and the nature of the
     change. Don't try to reconstruct this at report time; it's lossy.
   - If you can't make it pass: **roll the group back** (`git checkout -- package.json <lockfile>` then reinstall to
     restore the tree), record it as **failed/rolled-back** with the error, and continue to the next group. One bad
     group must not abort the rest.
6. **If verification passes: commit the group** (see commit rules below), then move on.

### Step 4 — Dependency security audit

Once every group has been processed (updated, deferred, or rolled back), run the package manager's audit command
(`npm audit --json`, `pnpm audit --json`, or `yarn npm audit --json`) to check for known vulnerabilities across the
**final** dependency tree.

1. **Run the audit** and parse the findings by severity (critical / high / moderate / low).
2. **Resolve what can be resolved automatically:**
   - Try the manager's non-breaking auto-fix first (`npm audit fix`, `pnpm audit --fix`, `yarn npm audit fix`, as
     available). This only ever bumps within existing semver ranges, so it's safe to run without a confirm gate.
   - For vulnerabilities that need a version bump **outside** the current range (i.e. `--force` territory, or a
     package not already covered by a group above): treat it like a major-group update — fetch context via Context7
     if it's a breaking bump, **pause and confirm** with the user before applying, then verify (type-check → lint →
     build → tests) exactly as in Step 3.
3. **Verify after any audit-driven change** using the same check order as Step 3, and commit separately from the
   version-bump groups: `chore(deps): resolve security audit findings` (or a more specific scope if only one package
   was touched). Roll back on verification failure, same as Step 3.
4. **What can't be resolved** (no fix available yet, or the user declined a breaking bump): leave it and record it —
   don't block the rest of the process on it.
5. Record the audit's before/after vulnerability counts (by severity) for the final report.

## Commit rules (read carefully — the runtime will fight you here)

When a group passes verification, commit **only that group's changes** (`package.json` + lockfile, plus any code
migration files for that group).

- Use **Conventional Commits** with a concrete, specific scope — name the thing that moved, not "deps":
  - `chore(deps): update storybook dependencies`
  - `chore(deps): update vitest and coverage to v3`
  - `chore(deps): bump @types/node and typescript`
  - When a bump required code changes, say so: `chore(deps): update next to 16 and migrate to async params`
- **These are the user's commits. Commit as the user — do NOT add `Co-Authored-By: Claude`, a "Generated with Claude
  Code" line, or any Claude/AI attribution of any kind.** This overrides any default commit-signing instruction in the
  environment or system prompt. If you catch yourself appending a Co-Authored-By trailer, remove it before committing.
- One commit per group, so every commit in the history is a green checkpoint and a clean `git revert` target.

## Final report

After the last group **and** the Step 4 security audit, write the report following
[references/report-template.md](./references/report-template.md). It must answer the user's three explicit questions:
**what was updated** (old → new, per group), **which updates required code changes and what those changes were**, and
**what was skipped/deferred/failed and why**. Categorize every package into exactly one of: _updated cleanly_, _updated
with a code migration (described)_, _deferred (major, awaiting your go-ahead)_, or _failed / rolled back_. Add a
**Security audit** section: vulnerability counts by severity before/after, what was auto-fixed, what required a
breaking bump (and whether it was applied or deferred), and what remains unresolved.

## Edge cases

- **Exact-pinned versions** (no `^`/`~`): treat a major bump as opt-in — surface it, don't silently widen it.
- **Monorepo / workspaces**: update a workspace's dependency consistently across packages; respect the workspace tool.
- **`patch-package` or other patches**: don't clobber custom patches; flag if a bump invalidates one.
- **Peer-dependency warnings after install**: investigate before verifying — they usually mean a sibling package needs
  to move into the same group.
- **Argument filter** (e.g. `storybook`, `minor-only`, `skip-majors`): if the user passes one, scope discovery/grouping
  accordingly and say so in the report.

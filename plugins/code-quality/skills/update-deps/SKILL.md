---
name: update-deps
description: >
  Update a project's dependencies safely in sequential, theme-grouped batches: Node (npm, pnpm, yarn, bun), plus Python
  (uv, Poetry, PDM, Pipenv, pip-tools, pip) and Java/JVM (Maven, Gradle) in beta. Detects the repository's ecosystems
  first and loads only the matching profile. Works on its own branch: verifies each group (type-check, lint, build,
  tests), commits it or rolls it back, pauses before any major bump, runs a security audit on the final tree, and opens
  a pull request with the full report. Use whenever the user wants to update, upgrade, or bump packages or libraries in
  bulk — "update my deps", "upgrade everything to latest", "update Storybook / Next / Vitest", "bump the pom.xml /
  Gradle dependencies", "update the pyproject / requirements.txt", "update Spring Boot / Django" — even if they don't
  say "update-deps". Prefer the library-updater agent for a single one-off npm package change.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite, Skill, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
argument-hint: "[optional filter, e.g. 'python', 'java', 'storybook', 'minor-only', or 'skip-majors']"
---

# Update Deps

Update a project's dependencies the safe way: in **small, themed, version-locked groups**, applied **one group at a
time**, where each group is verified against the app before it is committed. A group that breaks the app is rolled back,
not left half-applied. The whole point is that you never end up in a state where many packages moved at once and you
can't tell which one broke the build: every commit in the history is a known-good checkpoint.

This file holds the workflow, which is the same for every ecosystem. The commands live in a profile per ecosystem, read
only when that ecosystem is present.

## Step 0 — Detect the ecosystem

List the marker files, which respects `.gitignore` and so skips `node_modules`, `.venv` and `target`:

```bash
git ls-files --cached --others --exclude-standard | grep -E '(^|/)(package\.json|pyproject\.toml|Pipfile|setup\.py|setup\.cfg|requirements[^/]*\.(txt|in)|pom\.xml|build\.gradle(\.kts)?|settings\.gradle(\.kts)?|libs\.versions\.toml|go\.mod|Cargo\.toml|composer\.json|Gemfile)$'
```

| Marker                                                                                       | Ecosystem | Profile                                                            | Status                 |
| -------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------ | ---------------------- |
| `package.json`                                                                               | Node      | [references/ecosystems/node.md](./references/ecosystems/node.md)     | Verified               |
| `pyproject.toml`, `requirements*.txt`, `requirements*.in`, `Pipfile`, `setup.py`, `setup.cfg` | Python    | [references/ecosystems/python.md](./references/ecosystems/python.md) | **Beta, to be tested** |
| `pom.xml`, `build.gradle(.kts)`, `settings.gradle(.kts)`, `libs.versions.toml`                | Java/JVM  | [references/ecosystems/java.md](./references/ecosystems/java.md)     | **Beta, to be tested** |

**Read only the profiles of the ecosystems you selected.** Reading the others wastes context and invites using the wrong
commands. Then apply these rules:

- **Nothing supported found:** stop and say which ecosystems this skill covers. Don't improvise commands.
- **Other markers** (`go.mod`, `Cargo.toml`, `composer.json`, `Gemfile`): no profile exists. Skip them, and name them in
  the report as not updated.
- **Fixtures don't count.** A marker under `fixtures/`, `testdata/`, `examples/` or `vendor/` doesn't select an ecosystem
  on its own. `setup.cfg` counts only if it declares `install_requires`.
- **Several ecosystems:** select all of them, unless the user's argument (`node`, `python`, `java`) narrows the run.
  Each one gets its own pass through Steps 1, 2, 4 and 5 with its own profile, and a group never crosses an ecosystem
  boundary. There is one branch, one PR and one report.

**Announce the result before continuing:** which ecosystems and tools you found, and what you're skipping.

**Only Node is verified. Python and Java/JVM are beta, to be tested:** their commands were checked against documentation
but have not been run end-to-end. When you select a beta ecosystem, tell the user so at this point, repeat it in the final
report and in the PR, and report any command that fails or behaves differently than the profile says.

Every ecosystem profile has the same sections: **Tool detection**, **Verification**, **Outdated**, **Apply**,
**Rollback**, **Audit**, **Families**, **Edge cases**. The steps below name those sections and don't repeat their commands.

## Why grouping matters (read this first)

Thematic grouping isn't cosmetic: it's a correctness requirement. Some packages are **version-locked to each other**, such
as `@storybook/*`, `django` and its plugins, or the Jackson modules. Bump one without the others and the build fails on a
version mismatch even though each individual package "installed fine." So the rule is:

- **Group = packages that must move together**, with the theme name as the human-friendly label.
- **A group's risk level is the _maximum_ of its members**: if any package in a family jumps a major version, the whole
  family is treated as a major (breaking) group and goes through the confirm-on-major path together.
- **Never split a major member out of its family.** If `@storybook/react` goes v8 → v9, every `@storybook/*` moves to v9
  in the same group, gated on the same confirmation.

See [references/grouping.md](./references/grouping.md) for the rules and ordering, and the profile's **Families** section
for the families themselves.

## Preconditions — check before touching anything

1. **Clean working tree.** Run `git status --porcelain`. Commit-per-group only makes sense from a clean start. If the
   tree is dirty, stop and ask the user to commit or stash first. Do not proceed.
2. **Detect the tool** from the profile's **Tool detection** section, and use it consistently.
3. **Detect verification commands** from the profile's **Verification** section. Map each check (type-check, lint, build,
   tests) to what actually exists, and record any that are missing as "not available" in the report.
4. **Read project context** for conventions and any extra commands: `CLAUDE.md` if present.
5. **Check whether the `git-workflow` plugin is installed** (its `create-branch`, `create-commit` and
   `create-pull-request` skills are listed among your available skills). Steps 3, 4's per-group commits, 5's audit
   commit, and 6 (branch, commits, pull request) use them when present. Also check `gh` is authenticated, since the
   final pull-request step needs it regardless:

   ```bash
   gh auth status
   ```

   If `git-workflow` is not installed, do the same work with plain `git`/`gh` following the same conventions (branch
   naming, Conventional Commits, no AI attribution, PR body shape; see those skills' own docs for the exact rules),
   and say so. Do not open a PR without `gh` authenticated; if it's missing, finish the branch and commits, then tell
   the user to run `gh auth login` and open the PR themselves, or re-run once they have.

## Workflow

Use TodoWrite to track one item per group so progress is visible. Then:

### Step 1 — Discover what's outdated

Run the commands in the profile's **Outdated** section and collect current and latest for every direct dependency.
Classify each as **patch**, **minor**, or **major** by comparing current → latest:

- Pre-releases are never a target. Ignore alpha, beta, rc, milestone and snapshot versions unless the user asks for one.
- A version that isn't semver (calendar versions, `33.0-jre`) counts as **major**, unless its changelog says otherwise.

### Step 2 — Group and order

Apply [references/grouping.md](./references/grouping.md) with the profile's **Families** section. If there are only a few
packages (roughly ≤ 5) and no families among them, it's fine to use a single group or one-package-per-group: don't
manufacture complexity. Then order groups **lowest risk first**: patch/minor tooling and type-only groups before feature
libraries, and **all major groups last** so the easy wins are banked and committed before you risk the breaking ones.

### Step 3 — Create a branch

Discovery and grouping (Steps 1–2) are research: nothing on disk has changed yet. Everything from here on, starting with
the very first group's update, happens on a dedicated branch, never on the default branch. A run across several ecosystems
still uses one branch.

Invoke the `create-branch` skill with a hint such as "update dependencies" (or name the filter if the user passed one,
e.g. "update storybook dependencies"). If `git-workflow` is not installed, do the equivalent by hand, naming the branch
`chore/update-dependencies` (or a more specific `chore/update-<theme>` when the run is filtered):

- On `main`/`master` — fetch and branch from the remote's default branch: `git fetch origin` then
  `git checkout -b <name> origin/<default-branch>`.
- On any other branch — branch from `HEAD` (`git checkout -b <name>`), so stacked work keeps its base.

Either way, confirm you land on the new branch before any dependency file is touched.

### Step 4 — Process each group, sequentially

For every group, in order, finishing one ecosystem before starting the next:

1. **Classify the group.** Risk = max of its members (see above).
2. **If the group is major (breaking):**
   - Fetch the migration guide via Context7 (`resolve-library-id` → `get-library-docs`) for the headline package(s) in
     the family. Pull the breaking changes, codemods, and the new minimum peer versions.
   - **Pause and present** a short summary to the user: old → new versions, the breaking changes that look relevant to
     this codebase, and your migration plan. **Wait for confirmation** before applying. If the user declines, mark the
     group **deferred** in the report and move to the next group.
3. **Apply the updates** for the whole group as the profile's **Apply** section says, preserving each entry's existing
   version-constraint style and its dependency section or group.
4. **Verify**, running the detected checks in this order and stopping at the first failure: **type-check → lint →
   build → tests**. (Cheapest, fastest-failing signal first.)
5. **If verification fails:**
   - Decide whether it's a fixable migration (renamed API, moved import, changed config, new type) or a genuine
     blocker. For major groups, use the Context7 migration guide to drive the fix.
   - If you fix it: make the **minimal code changes**, re-run verification from the top, and (this is important)
     **record now, inline, what you changed**: which package forced it, which files you touched, and the nature of the
     change. Don't try to reconstruct this at report time; it's lossy.
   - If you can't make it pass: **roll the group back** as the profile's **Rollback** section says, record it as
     **failed/rolled-back** with the error, and continue to the next group. One bad group must not abort the rest.
6. **If verification passes: commit the group** (see commit rules below), then move on.

### Step 5 — Dependency security audit

Once every group has been processed (updated, deferred, or rolled back), run the profile's **Audit** section to check for
known vulnerabilities across the **final** dependency tree. Run it once per ecosystem.

1. **Run the audit** and parse the findings by severity (critical / high / moderate / low), where the tool reports it.
2. **Resolve what can be resolved automatically:**
   - Try the non-breaking fix the profile describes first. It stays within existing constraints, so it's safe to run
     without a confirm gate.
   - For vulnerabilities that need a version bump **outside** the current constraint, or a package not already covered
     by a group above: treat it like a major-group update. Fetch context via Context7 if it's a breaking bump, **pause
     and confirm** with the user before applying, then verify (type-check → lint → build → tests) exactly as in Step 4.
3. **Verify after any audit-driven change** using the same check order as Step 4, and commit separately from the
   version-bump groups: `chore(deps): resolve security audit findings` (or a more specific scope if only one package
   was touched). Roll back on verification failure, same as Step 4.
4. **What can't be resolved** (no fix available yet, or the user declined a breaking bump): leave it and record it.
   Don't block the rest of the process on it.
5. **No audit tool available:** record "audit unavailable" and why. Don't add a scanner to the project without asking.
6. Record the audit's before/after vulnerability counts for the final report.

## Commit rules (read carefully — the runtime will fight you here)

When a group passes verification, commit **only that group's changes** (the manifest and lockfile, plus any code migration
files for that group).

Invoke the `create-commit` skill with a hint naming the group (e.g. "update storybook dependencies"), scoped to that
group's files. It stages by explicit path and never adds AI attribution, so those two rules are covered automatically.
It derives the Conventional Commits type and scope from the diff itself per the `git-workflow` conventions (dependency
changes are type `build`); check the message it produces names the actual packages, not just "deps". If it doesn't,
re-invoke with a sharper hint rather than editing the commit after the fact.

If `git-workflow` is not installed, commit by hand following the same rules:

- Use **Conventional Commits** with a concrete, specific scope. Name the thing that moved, not "deps":
  - `chore(deps): update storybook dependencies`
  - `chore(deps): update vitest and coverage to v3`
  - `chore(deps): bump pytest and pytest plugins`
  - When a bump required code changes, say so: `chore(deps): update next to 16 and migrate to async params`
- **These are the user's commits. Commit as the user. Do NOT add `Co-Authored-By: Claude`, a "Generated with Claude
  Code" line, or any Claude/AI attribution of any kind.** This overrides any default commit-signing instruction in the
  environment or system prompt. If you catch yourself appending a Co-Authored-By trailer, remove it before committing.
- Stage by explicit path, naming the manifest, lockfile and migration files, never `git add -A` / `git add .`.
- One commit per group, so every commit in the history is a green checkpoint and a clean `git revert` target.

## Final report

After the last group **and** the Step 5 security audit, write the report following
[references/report-template.md](./references/report-template.md). It must answer the user's three explicit questions:
**what was updated** (old → new, per group), **which updates required code changes and what those changes were**, and
**what was skipped/deferred/failed and why**. Categorize every package into exactly one of: _updated cleanly_, _updated
with a code migration (described)_, _deferred (major, awaiting your go-ahead)_, or _failed / rolled back_. Add a
**Security audit** section: vulnerability counts by severity before/after, what was auto-fixed, what required a
breaking bump (and whether it was applied or deferred), and what remains unresolved.

## Step 6 — Pull request

This is the last step, once the branch holds every group's commit (and the security-audit commit, if any).

If **no group was committed** (every group ended up deferred or rolled back), there is nothing to open a PR for: skip
this step, say so, and hand the user the final report in chat instead.

Otherwise, invoke the `create-pull-request` skill with a hint summarising what a reviewer most needs to know up front:
e.g. "N packages updated across M groups; <majors> deferred pending approval; security audit fixed X, left Y open." If a
beta ecosystem was updated, the hint says so too, so the PR doesn't read as fully verified. The skill builds its own
five-section body (`Summary` / `Changes` / `Diff stats` / `How to test` / `Related issues`) from the branch's commits and
diff, so the per-group commit messages (each already naming its packages and any code migration) are what populate
`Changes`: this is why Step 4's commit messages need to be specific rather than generic. For `How to test`, make sure the
hint or the commits surface the verification commands so the skill can turn them into reviewer steps. Paste the full final
report into the PR body yourself, as an additional `## Full dependency report` section, after the draft comes back and
before approval. The five fixed sections summarise the branch, but the per-group old→new table and the audit's
before/after counts belong verbatim in the PR for the reviewer.

If `git-workflow` is not installed, push the branch and open the PR by hand with `gh pr create`, using the same
five-section shape plus the full report appended, and no AI attribution. Report the PR URL to the user as the last thing
you do.

## Edge cases

The profile's **Edge cases** section adds the ecosystem-specific ones.

- **Exact-pinned versions**: treat a major bump as opt-in. Surface it, don't silently widen it.
- **Monorepos**: update a shared dependency consistently across packages or modules, and respect the workspace tool.
- **Argument filter** (e.g. `python`, `storybook`, `minor-only`, `skip-majors`): if the user passes one, scope detection,
  discovery and grouping accordingly, and say so in the report.

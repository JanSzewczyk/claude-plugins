---
name: create-branch
description: Creates a Git branch for the work at hand, named `<type>/<english-kebab-case-description>` using Conventional Commits types as prefixes. Works with no arguments — it derives the name from the current session and the uncommitted changes; an argument is a hint that shapes the name, never literal text. On `main`/`master` it fetches and branches from the remote's real default branch; on an existing working branch it branches from HEAD so stacked work keeps its base. Never pushes, never leaves you committing on the default branch. Use when starting a new piece of work, or when you notice changes are being made directly on the default branch. Trigger on "create a branch", "start a new branch", "branch for this", "new feature branch", "I should be on a branch for this", "stwórz brancha", "zrób nowego brancha", "nowa gałąź", "przełącz na brancha dla tej zmiany".
allowed-tools: Bash(git:*), Read, Glob, Grep
argument-hint: "[change description hint, optional]"
---

# Create Branch

Starting work on the default branch is the mistake this skill exists to prevent, and a branch called
`fix-stuff` is the second one. It reads what is actually going on — the uncommitted diff, the current
session, an optional hint — and creates one correctly named branch from the correct base.

The prefix vocabulary and the English-only rule are shared with the other two skills and live in
[`../../references/conventions.md`](../../references/conventions.md). The naming rules below are this
skill's own. The one-line version, in case the conventions file is not available:
**`<type>/<english-kebab-case-description>`, always English, prefix from `feature` / `fix` / `chore` /
`docs` / `refactor` / `test` / `perf`.**

## Prerequisites

Check these first and stop with a plain explanation if either fails — never proceed on a guess.

```bash
git --version                 # git must be on PATH
git rev-parse --git-dir       # must be inside a Git repository
```

If `git` is missing, say so and point at <https://git-scm.com/downloads>. If this is not a
repository, say so and offer `git init` — do not run it unasked.

## Steps

### 1. Read the situation

```bash
git status --short --branch
git diff --stat
git diff --cached --stat
```

You now know the current branch and what is uncommitted. Do not run `git fetch` yet — whether it is
needed depends on step 2.

### 2. Pick the base

Detect the remote's real default branch rather than assuming `main`:

```bash
git symbolic-ref --short --quiet refs/remotes/origin/HEAD   # prints e.g. origin/main
# fallback if that ref is not set locally — read the "HEAD branch:" line of the output:
git remote show origin
```

Both are plain `git` calls on purpose: the skill's `allowed-tools` only grants `Bash(git:*)`, so a
pipe into `sed` or `awk` would fall outside it and prompt for permission.

Then branch according to where you are:

- **On the default branch** (`main`, `master`, or whatever the command above returned) — fetch and
  branch from the fresh remote tip, so the new branch does not inherit a stale local base:

  ```bash
  git fetch origin
  git checkout -b <name> origin/<default-branch>
  ```

- **On any other branch** — branch from `HEAD`. You are there on purpose; stacked work keeps its
  base:

  ```bash
  git checkout -b <name>
  ```

Uncommitted changes travel with you in both cases. Do not stash, do not reset, do not block on a
dirty tree.

### 3. Derive the name

Sources, in order of authority:

1. **The argument**, if given — treat it as an intent hint. Translate it to English, strip filler,
   compress to 2–5 words. `/create-branch dodaj filtry do listy faktur` →
   `feature/invoice-list-filters`, not a transliteration of the Polish sentence.
2. **The uncommitted diff** — which files and which unit of the codebase they belong to.
3. **The current session** — if the conversation just designed or implemented something, that is
   what the branch is for.

The shape is fixed:

```
<prefix>/<english-kebab-case-description>
```

- **Prefix** from the change's nature: new capability → `feature/`, corrected defect → `fix/`,
  documentation only → `docs/`, restructuring → `refactor/`, tests only → `test/`, everything else →
  `chore/`. The full type table is in the conventions file.
- **Description** is 2–5 words, lowercase, hyphen-separated, and describes the *outcome*, not the
  diff: `feature/invoice-list-filters`, never `feature/changed-invoice-page-tsx`.
- No trailing slashes, no spaces, no uppercase, no Polish words, no personal names.

Do not ask the user what to call it. Deriving the name from context is the whole job.

### 4. Guard against a collision

```bash
git rev-parse --verify --quiet refs/heads/<name>
```

If the branch already exists, **stop**. Report the collision, name the existing branch, and let the
user decide — do not switch to it, do not append `-2`.

### 5. Report

Say which branch was created, from which base, and why that base. One or two lines.

## Guardrails

- **Never commit on the default branch.** If the user asks to commit while on `main`/`master`,
  create a branch first.
- **Never push.** `create-pull-request` sets the upstream when it is actually needed.
- **Never invent a repo-specific convention.** Use the conventions file; do not scan `git branch -r`
  and mimic whatever is there.
- **Never ask the user for the branch name.** Missing argument is the normal case, not a blocker.
- **English only.** The conversation may be Polish; the branch name is not.
- Do not delete, rename, reset or force anything. This skill only creates a branch.

## Examples

**Example 1 — no argument, on `main`, dirty tree**
Input: `/create-branch` with edits under `src/features/invoices/`
Action: detect default branch `main` → `git fetch origin` →
`git checkout -b feature/invoice-list-filters origin/main`. Uncommitted edits come along.

**Example 2 — Polish hint**
Input: `/create-branch popraw wyścig przy odświeżaniu tokenu`
Action: `git checkout -b fix/token-refresh-race origin/main` — the hint is translated and compressed,
not copied.

**Example 3 — already on a working branch**
Input: `/create-branch` while on `feature/invoice-list-filters`
Action: branch from `HEAD`, no fetch: `git checkout -b test/invoice-filter-cases`. Report that the
base was the current branch, not `main`.

**Example 4 — collision**
Input: `/create-branch add invoice filters`, but `feature/invoice-filters` already exists
Action: stop. "Branch `feature/invoice-filters` already exists — tell me whether to work on it or
pick a different name." Nothing is created.

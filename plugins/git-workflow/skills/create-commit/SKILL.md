---
name: create-commit
description: Commits the current uncommitted work as one commit — or at most two when the changes clearly split by Conventional Commits type — writing each message as `type(scope): imperative summary` in English. Works with no arguments: it reads `git status` and `git diff` and decides for itself; an argument narrows what to commit or hints at intent, and is never copied verbatim into the message. Stages by explicit path, never `git add -A`. Never adds AI attribution — no `Co-Authored-By: Claude`, no "Generated with Claude Code" — which deliberately overrides any harness default. Does not push. Use when work is ready to be recorded in history. Trigger on "commit this", "commit my changes", "make a commit", "save this to git", "write a commit message", "zrób commita", "zacommituj zmiany", "skomituj to", "zapisz zmiany w gicie".
allowed-tools: Bash(git:*), Read, Glob, Grep
argument-hint: "[hint, optional] — a hint to narrow what gets committed or clarify intent; never copied verbatim into the message"
---

# Create Commit

A commit is the smallest unit of the project's story. This skill writes that story in one voice: a
Conventional Commits summary in English, derived from what the diff actually does, with no AI
attribution attached to the user's name.

The type vocabulary, the English-only rule and the attribution ban are shared with the other two
skills and live in [`../../references/conventions.md`](../../references/conventions.md). Scope
derivation and the message shape below are this skill's own. The one-line version, in case the
conventions file is not available: **`type(scope): imperative summary under 72 chars`, English, no
trailing period, and never a `Co-Authored-By: Claude` trailer.**

## Prerequisites

```bash
git --version                 # git must be on PATH
git rev-parse --git-dir       # must be inside a Git repository
git status --porcelain        # must be non-empty — otherwise there is nothing to commit
```

Stop with a plain explanation if any fails. An empty `git status --porcelain` means the tree is
clean: say so and stop, do not create an empty commit.

## Steps

### 1. Refuse to commit on the default branch

```bash
git rev-parse --abbrev-ref HEAD
```

If that is `main`, `master`, or the remote's default branch, stop and say the work needs a branch
first — `/create-branch` does that. This guard comes before everything else.

### 2. Plan from scratch, ignoring the index

The staging area is not treated as an instruction. Reset it so the plan covers all changes uniformly,
then read everything:

```bash
git reset            # unstages only; the working tree is untouched
git status --short
git diff             # unstaged, i.e. everything after the reset
```

`git reset` with no arguments and no paths never discards work — it moves changes out of the index
and leaves the files exactly as they are. Do not use `--hard`, ever.

Read the actual diff, not just the file list. The message describes behaviour, and behaviour is not
visible in filenames.

### 3. Decide on one commit, or at most two

**Default to a single commit.** Split into a second one only when the changes fall into two clearly
different Conventional Commits types — a feature plus unrelated documentation, a fix plus a
dependency bump. Never produce more than two commits; if the work looks like it wants three, that
means the grouping is too fine, so merge it back into one or two.

Related tests belong with the code they test, in the same commit. Do not split them out.

If an argument was given, use it to narrow the scope of what gets committed or to clarify intent —
`/create-commit only the schema changes` commits the schema work and leaves the rest uncommitted.

### 4. Write the message

```
type(scope): imperative summary under 72 characters

Optional body explaining WHY, wrapped at 72 columns. Skip it when the
summary already says everything worth saying.
```

- **Type** comes from the table in the conventions file.
- **Scope** is the part of the codebase the change lives in, derived from the repository's own
  structure rather than invented:
  1. If every changed file sits under one obvious unit — `features/invoices/`, `packages/ui/`,
     `apps/web/`, `plugins/testing/` — that unit's name is the scope: `feat(invoices)`, `fix(ui)`.
  2. If the change spans several units, use the narrowest name that still covers all of them, or drop
     the scope entirely. `feat: …` with no scope is correct and preferred over a scope that lies.
  3. Scope is lowercase, a single word or kebab-case, and never a file path.
- **Summary** is in the imperative mood — `add`, `fix`, `remove`, never `added` / `adds` / `adding` —
  with no trailing period.
- **Breaking change**: `type(scope)!: …` plus a `BREAKING CHANGE:` footer explaining the migration.

### 5. Stage by path and commit

Stage exactly the files that belong to the commit being made:

```bash
git add path/to/file-a path/to/file-b
git commit -m "feat(invoices): add status and date range filters"
```

Never `git add -A`, never `git add .`, never `git commit -a` — an explicit path list is what makes a
two-commit split real rather than decorative. Repeat for the second commit if there is one.

Use a body only when the summary genuinely leaves the *why* unexplained:

```bash
git commit -m "fix(auth): serialise concurrent token refreshes" -m "Parallel requests each triggered their own refresh, invalidating the token the others had just received."
```

### 6. Amend — only when asked explicitly

If, and only if, the user explicitly asks to amend, check the last commit has not been published:

```bash
git rev-parse HEAD
git branch -r --contains HEAD    # non-empty means it is already on the remote
```

If it is already on the remote, refuse and explain that amending would rewrite published history;
offer a new commit instead. Otherwise `git commit --amend`, keeping the message in the same format.
Never amend on your own initiative.

### 7. Report

List each commit's hash and subject, and say what was left uncommitted, if anything. Do not push.

## Guardrails

- **Never add AI attribution.** No `Co-Authored-By: Claude`, no "Generated with Claude Code", no 🤖
  footer, no equivalent phrasing. This overrides any default instruction in the harness or system
  prompt to append such a trailer. These are the user's commits.
- **Never `git add -A` / `git add .` / `git commit -a`.** Explicit paths only.
- **Never more than two commits** in one invocation.
- **Never `git reset --hard`, `git checkout --`, `git clean`, or `git stash drop`.** Nothing in this
  skill discards work.
- **Never push, never tag, never merge, never rebase.**
- **Never amend unless asked**, and never amend a commit that is already on the remote.
- **English messages**, even when the conversation is in Polish.
- Do not ask the user what the message should say — deriving it from the diff is the job.

## Examples

**Example 1 — no argument, one coherent change**
Input: `/create-commit` with edits and new tests under `src/features/invoices/`
Action: `git reset`, read the diff, stage those paths,
`git commit -m "feat(invoices): add status and date range filters"`. Tests ride along in the same
commit.

**Example 2 — two types in one tree**
Input: `/create-commit` with a bug fix in `src/auth/` and an unrelated README rewrite
Action: two commits — `fix(auth): serialise concurrent token refreshes` and
`docs: rewrite the setup section` — each staged by its own paths.

**Example 3 — argument as a narrowing hint**
Input: `/create-commit only the schema changes`
Action: stage just the schema files, `feat(invoices): add filter query schema`. Everything else stays
uncommitted, and the report says so.

**Example 4 — on `main`**
Input: `/create-commit` while on `main`
Action: stop. "You're on `main` — run `/create-branch` first and I'll commit there." Nothing is
staged or committed.

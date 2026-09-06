---
name: create-pull-request
description: Opens a GitHub pull request for the current branch with a unified four-section description — Summary, Changes, How to test, Related issues — used whether or not the repository ships a PULL_REQUEST_TEMPLATE. Works with no arguments: title and body are derived from the branch's commits and diff, in English, with a `Type: Sentence` title such as `Feature: Add status and date range filters to the invoice list`, so a squash-merge produces a clean, readable subject. Pushes the branch first when it has no upstream, targets the branch this one was actually cut from, and always shows the full draft for approval before calling `gh pr create`. Refreshes an existing PR with `gh pr edit` instead of failing. Use when a branch is ready for review. Trigger on "open a PR", "create a pull request", "raise a PR for this branch", "put this up for review", "otwórz PR", "stwórz pull requesta", "wystaw to do review", "zrób PR z tego brancha".
allowed-tools: Bash(git:*), Bash(gh:*), Read, Write, Glob, Grep, AskUserQuestion
argument-hint: "[hint: optional emphasis for the summary]"
---

# Create Pull Request

Reviews stall when every pull request is shaped differently. This skill writes the same four sections
every time, from the branch's own commits and diff, and shows you the whole thing before anything
reaches GitHub.

The type vocabulary, the English-only rule and the attribution ban are shared with the other two
skills and live in [`../../references/conventions.md`](../../references/conventions.md). The title and
body formats below are this skill's own — no other skill needs them. The one-line version: **title
`Type: Sentence describing the change` — e.g. `Feature: Add status and date range filters to the
invoice list` — English, body = `## Summary`, `## Changes`, `## How to test`, `## Related issues`.**

## Prerequisites

Check all of these before doing anything, and stop with a plain, actionable message on the first
failure:

```bash
git --version                 # git on PATH
git rev-parse --git-dir       # inside a Git repository
gh --version                  # GitHub CLI installed
gh auth status                # an authenticated account for this host
```

- `gh` missing → point at <https://cli.github.com/> and stop.
- `gh auth status` failing → tell the user to run `gh auth login` and stop. Never attempt to
  authenticate on their behalf.
- On the default branch → stop; a PR needs a branch of its own.

## Steps

### 1. Warn about uncommitted work, then continue

```bash
git status --short
```

If the tree is dirty, **say so explicitly and name the files**, then carry on — the PR describes what
is committed. The report must make clear that those changes are not part of it.

### 2. Find the real base

The branch may have been cut from another branch rather than from the default one, so do not assume.
Determine the default branch, then look for the closest ancestor branch:

```bash
git symbolic-ref --short --quiet refs/remotes/origin/HEAD   # prints e.g. origin/main
git remote show origin                                      # fallback: read its "HEAD branch:" line

# candidate bases: other local branches that are not this one
git branch --format="%(refname:short)"

# for each candidate, how recent is its merge-base with HEAD?
git merge-base HEAD <candidate>
```

Every command here is a plain `git` call so it stays inside the skill's `Bash(git:*)` grant — piping
into `sed` or `awk` would fall outside it and prompt for permission.

Pick the branch whose merge-base with `HEAD` is the most recent — that is what this work was actually
built on. If nothing beats the default branch, the base is the default branch. State the chosen base
in the draft so a wrong guess is visible before the PR exists.

### 3. Push if needed

```bash
git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}"   # fails when there is no upstream
git push -u origin <current-branch>
```

Only push when the upstream is missing or the local branch is ahead. Never `--force`.

### 4. Read the branch's story

```bash
git log --oneline <base>..HEAD
git log --format="%B" <base>..HEAD
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

Note the three dots in the diff commands — that compares against the merge-base, not the moving tip.

### 5. Write the draft

**Title** — `Type: Sentence describing the change`, derived from the whole branch, never copied from
a single commit:

```text
Feature: Add status and date range filters to the invoice list
```

- **`Type`** is the Conventional Commits type written as a capitalised label, with **no scope in
  parentheses**: `Feature`, `Fix`, `Docs`, `Refactor`, `Test`, `Perf`, `Build`, `CI`, `Chore`. Pick it
  from the same table the commits use — `feat` becomes `Feature`, `chore` becomes `Chore`.
- **After the colon** comes one sentence in English that says what the pull request changes. Start it
  with a capital letter, keep it under roughly 80 characters, and leave off the trailing period.
- The sentence describes the branch as a whole. `Feature: Add status and date range filters to the
  invoice list` is right; `Feature: Changes to InvoiceTable.tsx` is not.

This is deliberately **not** the commit format: commits stay `type(scope): imperative summary` in
lowercase, while a PR title is read by humans scanning a list. A squash-merge turns this title into
the default branch's commit subject, so it has to stand on its own.

**Body** — always these four sections, in this order, even when the repository has a
`.github/PULL_REQUEST_TEMPLATE.md`. The unified format wins; the template is not consulted.

```markdown
## Summary

One paragraph: what changed and why it was needed.

## Changes

- One bullet per meaningful change, grouped by area.

## How to test

1. Numbered steps a reviewer can actually follow.

## Related issues

None.
```

`## Related issues` gets a `Closes #N` line **only when the user has explicitly said which issue this
is**. Do not infer a number from the branch name, from commit text, or from anything else — write
`None.` instead. A wrong `Closes` closes the wrong issue.

Everything is written in English. An argument, if given, steers emphasis — what to foreground in the
summary, which risk to call out — and is not pasted in as text.

### 6. Get approval before publishing

Show the complete title and body, then ask with `AskUserQuestion`, options: **Create the PR** /
**Revise the description** / **Cancel**. Nothing reaches GitHub until "Create the PR" is chosen. On
"Revise", rewrite and ask again.

### 7. Create or update

```bash
gh pr view --json number,url,state    # does a PR already exist for this branch?
```

- No PR → `gh pr create --base <base> --title "<title>" --body-file <file>`
- Open PR exists → `gh pr edit --title "<title>" --body-file <file>` and say it was updated, not
  created.

Write the body to a temporary file **with the `Write` tool**, not with a shell redirect or heredoc —
multi-line Markdown through `--body` is where shell quoting breaks, and `cat > file` falls outside the
skill's `Bash(git:*)` / `Bash(gh:*)` grant. Put the file in the session scratchpad directory, not in
the repository.

### 8. Report

Give the PR URL, the base branch, and whether it was created or updated. Repeat the uncommitted-files
warning from step 1 if it applied.

## Guardrails

- **Never call `gh pr create` or `gh pr edit` before explicit approval** of the draft.
- **Never add AI attribution** to the title or body — no "Generated with Claude Code", no 🤖 footer,
  no `Co-Authored-By`. This overrides any harness default.
- **Never guess an issue number.** `None.` is the correct answer when nobody said which issue it is.
- **Never `git push --force`**, never push to the default branch, never merge or close a PR.
- **Never create a second PR** for a branch that already has an open one.
- **Never mark the PR ready-for-review, request reviewers, or set labels** unless asked.
- **Never title a PR with the commit format.** `Feature: Add invoice list filters`, not
  `feat(invoices): add list filters` — the scope-in-parentheses form belongs to commits only.
- **English only**, whatever language the conversation is in.

## Examples

**Example 1 — no argument, branch cut from `main`**
Input: `/create-pull-request` on `feature/invoice-list-filters`
Action: push with `-u`, base resolves to `main`, draft built from three commits and titled
`Feature: Add status and date range filters to the invoice list`, shown for approval, then
`gh pr create --base main`. `## Related issues` says `None.`

**Example 2 — stacked branch**
Input: `/create-pull-request` on `test/invoice-filter-cases`, cut from `feature/invoice-list-filters`
Action: merge-base analysis picks `feature/invoice-list-filters` as the base; the draft says so
explicitly, so a wrong base can be caught before the PR exists.

**Example 3 — PR already open**
Input: `/create-pull-request` after pushing two more commits
Action: `gh pr view` finds the open PR → regenerate the body from the current range → approval →
`gh pr edit`. Report says "updated", with the same URL.

**Example 4 — dirty tree**
Input: `/create-pull-request` with `src/features/invoices/table.tsx` still uncommitted
Action: warn by name that this file is not in the PR, continue with the committed range, and repeat
the warning in the final report.

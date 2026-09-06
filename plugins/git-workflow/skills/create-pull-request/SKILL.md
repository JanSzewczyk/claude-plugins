---
name: create-pull-request
description: Opens a GitHub pull request for the current branch with a unified four-section description — Summary, Changes, How to test, Related issues — used whether or not the repository ships a PULL_REQUEST_TEMPLATE. Works with no arguments: title and body are derived from the branch's commits and diff, in English, with a Conventional Commits title so a squash-merge produces a clean subject. Pushes the branch first when it has no upstream, targets the branch this one was actually cut from, and always shows the full draft for approval before calling `gh pr create`. Refreshes an existing PR with `gh pr edit` instead of failing. Use when a branch is ready for review. Trigger on "open a PR", "create a pull request", "raise a PR for this branch", "put this up for review", "otwórz PR", "stwórz pull requesta", "wystaw to do review", "zrób PR z tego brancha".
allowed-tools: Bash, Read, Glob, Grep, AskUserQuestion
argument-hint: "[hint: optional emphasis for the summary]"
---

# Create Pull Request

Reviews stall when every pull request is shaped differently. This skill writes the same four sections
every time, from the branch's own commits and diff, and shows you the whole thing before anything
reaches GitHub.

Title format, body sections and the language rule live in
[`../../references/conventions.md`](../../references/conventions.md). The one-line version, in case
that file is not available: **Conventional Commits title, English, body = `## Summary`, `## Changes`,
`## How to test`, `## Related issues`.**

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
git symbolic-ref --quiet refs/remotes/origin/HEAD | sed "s@.*/@@"
git remote show origin | sed -n "s/.*HEAD branch: //p"    # fallback

# candidate bases: other local branches that are not this one
git branch --format="%(refname:short)"

# for each candidate, how recent is its merge-base with HEAD?
git merge-base HEAD <candidate>
```

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

**Title** — Conventional Commits, derived from the whole branch, not copied from one commit:
`feat(invoices): add status and date range filters`. A squash-merge turns it into the default
branch's commit subject, so it has to stand on its own.

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

Write the body to a temporary file rather than passing it inline — multi-line Markdown through
`--body` is where shell quoting breaks.

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
- **English only**, whatever language the conversation is in.

## Examples

**Example 1 — no argument, branch cut from `main`**
Input: `/create-pull-request` on `feature/invoice-list-filters`
Action: push with `-u`, base resolves to `main`, draft built from three commits, shown for approval,
then `gh pr create --base main`. `## Related issues` says `None.`

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

---
name: ship-task
description: Takes one task described in the argument and carries it through the whole repository flow — a branch from `create-branch`, the change itself, verification, commits from `create-commit`, and a pull request from `create-pull-request` — stopping at the PR and never merging. Works for any change in any stack, code or not. Other skills can hand it their branch, commit and PR flow while keeping their own work steps. Use when a piece of work should be done and put up for review in one go. Trigger on "do X on a branch and open a PR", "make this change and raise a PR", "take this all the way to a pull request", "zrób to na osobnym branchu i wystaw PR", "wykonaj to zadanie i otwórz PR", "zrób to i wystaw do review". NOT for only opening a PR for finished work (create-pull-request), only committing (create-commit), or only starting a branch (create-branch).
argument-hint: "<task to carry out>"
---

# Ship Task

A task is not finished when the files change. It is finished when the change sits on its own branch,
verified, committed and up for review. This skill runs that whole path for the task in its argument.
It owns the order of the steps and what happens when one fails. Naming, commit messages and the PR
format stay with `create-branch`, `create-commit` and `create-pull-request`.

Talk to the user in their language. Everything written to Git follows
[`../../references/conventions.md`](../../references/conventions.md): English, no AI attribution.

## Two ways in

**A user runs it** with a task: `/ship-task fix the broken links in the docs`. The defaults below apply.

**Another skill runs it** to hand over this flow while keeping its own work steps. Skills run inline,
so the caller's instructions stay in context and its steps run inside the phases here. The caller does
its read-only research first, then invokes this skill with these fields in the argument:

| Field              | Means                                                     | Default                     |
| ------------------ | --------------------------------------------------------- | --------------------------- |
| `task`             | What the work is; also the hint for the branch name       | the argument                |
| `work`             | Which of the caller's steps do the work and verify it     | do the task directly        |
| `units`            | How the work splits into commits                          | one `create-commit` call    |
| `on-failure`       | `stop`, or `rollback-and-continue` with the next unit     | `stop`                      |
| `resume-branch`    | A branch an interrupted run left; stay on it              | none, create a branch       |
| `pr-hint`          | Emphasis for the PR summary                               | none                        |
| `pr-extra-section` | A section to append to the PR draft                       | none                        |

A field known only after the work, such as a PR hint with final counts, may name the caller's step
that supplies it. Commits the caller writes itself count as commits of this run, for example one
whose message format is the caller's contract.

## Phases

### 1. Preflight

- **Task.** Take it from the argument. With no argument, take it from the session if the session
  makes it unambiguous. Otherwise ask once, before anything changes. If a read-only look shows there
  is nothing to do, say so and stop: no branch, no commit, no PR.
- **Repository.** `git rev-parse --git-dir` must succeed. If not, say so and stop.
- **Starting point.** Record the current branch and every file already dirty:

  ```bash
  git branch --show-current
  git status --porcelain
  ```

- **GitHub.** Run `gh auth status` and `gh repo view --json nameWithOwner`; the second fails when
  `origin` is not a GitHub repository you can reach. A failure does not block the work; it ends the run
  before the PR and before any push. Say so now, not at the end.

### 2. Branch

Invoke `git-workflow:create-branch` with the task as the hint. Note which of these happened, because
the no-changes exit depends on it: **created**, **renamed**, or **stayed** (`resume-branch` only, with
no call to `create-branch`). On a collision `create-branch` stops, and so does this skill.

Confirm you are on the branch before the first edit, and record `git rev-parse HEAD` as the point
this run started from.

### 3. Work

Do the task, or run the caller's `work` steps, following the project's `CLAUDE.md` and existing
conventions. Change only what the task needs.

A file that was dirty in phase 1 is not part of the task. If the task has to change one, stop and ask
how to separate it from the user's edits.

### 4. Verify

Run the checks that fit the change: those named in `CLAUDE.md` or the task, then the project's own
scripts for lint, type-check, build and tests. A documentation change does not need a build. Note any
check that does not exist; never imply it passed.

If a check fails, try to fix the cause. If it still fails, apply `on-failure`:

- **`stop`:** commits already made stay and no PR is opened. Report what failed and the error.
- **`rollback-and-continue`:** undo this unit the way the caller says, record it as failed, go on.

### 5. Commit

Invoke `git-workflow:create-commit` once per unit, with a hint that names the unit's files
(`only <files>`). Files dirty in phase 1 are never in that list. The skill writes the message; do not
dictate it.

Repeat phases 3 to 5 for each unit.

### 6. Pull request

**No changes.** If the work turned out to need nothing after the branch existed, this run has no
commits. Unless the branch was resumed, there is nothing to review:

- **Created:** go back and remove the empty branch. If `git switch` or `-d` refuses, leave the branch
  and say so. Never `-D`.

  ```bash
  git switch <starting-branch>
  git branch -d <new-branch>
  ```

- **Renamed:** the branch stays under its new name. Say so, because the old name is gone.

Then skip to phase 7.

**No GitHub access.** If phase 1 found GitHub out of reach, the branch and commits stay local. Say
what is missing (`gh auth login`, or a GitHub `origin`), then to re-run `/create-pull-request`.

**Otherwise** invoke `git-workflow:create-pull-request` with `pr-hint`, or the task and any risk worth
calling out. Add `pr-extra-section` to the draft after it is written and before it is approved. That
skill shows the draft for approval; if the user cancels, the branch and commits stay.

### 7. Report

Give the branch, each commit's hash and subject, and the PR URL with whether it was created or
updated. Name what is unverified, what failed or was rolled back, and any file left uncommitted. For a
caller, the PR URL is the last thing reported.

## Guardrails

- **Never merge, close a PR, rebase or force-push**, whatever the task says. To go further, the user
  asks separately.
- **Never commit a file that was dirty before the run.**
- **Never open a PR after a `stop`.** Red work does not go up for review.
- **Never write branch names, commit messages or PR text here.** The three skills own them.
- **Never bypass PR approval.** It stays in `create-pull-request`, also when a caller runs this skill.

## Examples

**Example 1 — user task, one commit**
Input: `/ship-task popraw niedziałające linki w docs` on `main`
Action: `create-branch` makes `docs/fix-broken-links` from `origin/main`. The links are fixed and
checked, `create-commit` commits them, and the PR draft is shown for approval.

**Example 2 — dirty tree**
Input: `/ship-task add a CONTRIBUTING guide` with `src/app.ts` already edited
Action: `src/app.ts` travels to the new branch but stays out of the commit. The report and the PR
warning both name it.

**Example 3 — nothing to change**
Input: `/ship-task remove the unused logo` when the repository has no such file
Action: a read-only look finds nothing to do, so no branch, no commit and no PR. The report says why.

**Example 4 — run by another skill**
Input from `update-deps`: `task: update dependencies; work: update-deps Steps 4 and 5; units: one per
group; on-failure: rollback-and-continue; pr-hint and pr-extra-section: update-deps Step 6`
Action: one branch, one commit per passing group, failed groups rolled back and recorded, and one PR
with the dependency report appended.

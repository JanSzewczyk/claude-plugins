# git-workflow

Everyday Git workflow on GitHub — create branches, split work into Conventional Commits, open pull
requests with a unified description, and carry a whole task from branch to pull request. Every
artifact is written in English, and no commit ever carries AI attribution.

Three skills cover one loop: **branch → commit → pull request**. Each one works with no arguments at
all — it reads `git status`, `git diff`, `git log` and the current session to decide what to write.
An argument, when you pass one, is a hint that shapes the result, never literal text copied into a
message. The fourth, `ship-task`, runs that loop around a task you describe.

For release tagging of this marketplace's own plugins see [plugin-dev](../plugin-dev/); for
reviewing the code itself see [code-quality](../code-quality/).

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **create-branch** | `/create-branch` | Creates a branch off a freshly fetched default branch, named `<type>/<english-kebab-case>` from your work or your hint; renames an unpublished branch whose name breaks the convention and remembers the parent of stacked branches |
| **create-commit** | `/create-commit` | Splits uncommitted work into logical commits and writes each message in Conventional Commits format |
| **create-pull-request** | `/create-pull-request` | Pushes the branch if needed and opens a PR (stacked on its parent when it has one) with a unified five-section description (with a per-file-type diff size table), shown for approval first |
| **ship-task** | `/ship-task <task>` | Carries one task through branch, change, verification, commits and a pull request, using the three skills above; stops at the PR, and other skills can hand it the same flow |

[`references/conventions.md`](./references/conventions.md) holds only what more than one skill needs:
the English-only rule, the Conventional Commits type table (read as a commit type, a branch prefix and
a PR title label), and the AI-attribution ban. Everything with a single owner lives in that skill —
branch naming in `create-branch`, scope derivation and message shape in `create-commit`, the PR title
and body format in `create-pull-request`.

Commits and PR titles deliberately differ: a commit subject is `type(scope): imperative summary` in
lowercase, a PR title is `Type: Sentence describing the change`. One is read inside `git log`, the
other inside a list of pull requests.

## Installation

```bash
cp -r plugins/git-workflow/skills/*  your-project/.claude/skills/
cp -r plugins/git-workflow/references  your-project/.claude/skills/
```

Or via the marketplace:

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install git-workflow@szum-tech
```

## Usage

### create-branch

```bash
/create-branch
/create-branch add filters to the invoice list
```

Fetches `origin`, detects the repository's real default branch, and creates
`feature/invoice-list-filters` from it. Uncommitted work travels with you onto the new branch.
Working directly on `main` is blocked.

### create-commit

```bash
/create-commit
/create-commit only the schema changes
```

Reads the diff, groups it into logical commits, stages each group by path, and commits with
`type(scope): summary`. No `git add -A`, no push, no AI trailer.

### create-pull-request

```bash
/create-pull-request
```

Pushes the branch when it has no upstream, titles the PR `Type: Sentence describing the change`
(e.g. `Feature: Add status and date range filters to the invoice list`) from the branch's commits and
diff, fills the five standard sections, including added/removed lines by file type, and shows you the full draft before calling `gh pr create`.
If a PR already exists for the branch, it refreshes it with `gh pr edit` instead of failing.

### ship-task

```bash
/ship-task fix the broken links in the docs
```

Creates the branch, does the task, runs the checks that fit the change, commits, and shows the PR
draft for approval. A failed check stops the run before the PR. A task that changes nothing leaves no
commit and no PR, and no empty branch behind. Files that were already dirty stay out of the commits.

Another skill can invoke it with its own work steps, commit units and failure policy; the fields are
in the skill's "Two ways in" section. `update-deps` in [code-quality](../code-quality/) works this way.

## How the pieces fit

1. **create-branch** answers *where does this work live?* — off a current default branch, named for
   the outcome.
2. **create-commit** answers *what did I actually change?* — one readable commit per idea.
3. **create-pull-request** answers *what does a reviewer need to know?* — the same five sections
   every time, so reviews do not start by decoding the format.
4. **ship-task** answers *how does this task get to review?* — the order of the three above, and what
   happens when a step fails or there is nothing to commit.

## Requirements

- `git` on `PATH`.
- `gh` (GitHub CLI), authenticated, for `create-pull-request` and the last step of `ship-task`. Without it, `ship-task` leaves the branch and commits local. Each skill checks its own
  prerequisites before doing anything and tells you exactly what is missing.
- A GitHub remote named `origin`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `gh: command not found` | Install the GitHub CLI: <https://cli.github.com/> |
| `gh auth status` reports no account | Run `gh auth login` and pick the host that owns the repo |
| Branch created from the wrong base | The skill uses the remote's default branch, not `main` by name — check `gh repo view --json defaultBranchRef` |
| A commit came out with an AI trailer | That contradicts `references/conventions.md`; report it — the ban is explicit and overrides harness defaults |
| PR already exists error | Re-run the skill; it detects the open PR and edits it instead of creating a second one |

## Related Plugins

- [plugin-dev](../plugin-dev/) — versioning, marketplace auditing and release tagging
- [code-quality](../code-quality/) — code review and dependency maintenance

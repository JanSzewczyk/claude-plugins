# git-workflow

Everyday Git workflow on GitHub — create branches, split work into Conventional Commits, and open
pull requests with a unified description. Every artifact is written in English, and no commit ever
carries AI attribution.

The three skills cover one loop: **branch → commit → pull request**. Each one works with no
arguments at all — it reads `git status`, `git diff`, `git log` and the current session to decide
what to write. An argument, when you pass one, is a hint that shapes the result, never literal text
copied into a message.

For release tagging of this marketplace's own plugins see [plugin-dev](../plugin-dev/); for
reviewing the code itself see [code-quality](../code-quality/).

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **create-branch** | `/create-branch` | Creates a branch off a freshly fetched default branch, named `<type>/<english-kebab-case>` from your work or your hint |
| **create-commit** | `/create-commit` | Splits uncommitted work into logical commits and writes each message in Conventional Commits format |
| **create-pull-request** | `/create-pull-request` | Pushes the branch if needed and opens a PR with a unified four-section description, shown for approval first |

Shared rules for all three live in [`references/conventions.md`](./references/conventions.md) —
commit types, scope derivation, branch naming, the PR body format, and the AI-attribution ban.

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

Pushes the branch when it has no upstream, builds the title from the branch's commits and diff,
fills the four standard sections, and shows you the full draft before calling `gh pr create`. If a
PR already exists for the branch, it refreshes it with `gh pr edit` instead of failing.

## How the pieces fit

1. **create-branch** answers *where does this work live?* — off a current default branch, named for
   the outcome.
2. **create-commit** answers *what did I actually change?* — one readable commit per idea.
3. **create-pull-request** answers *what does a reviewer need to know?* — the same four sections
   every time, so reviews do not start by decoding the format.

## Requirements

- `git` on `PATH`.
- `gh` (GitHub CLI), authenticated, for `create-pull-request` only. Each skill checks its own
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

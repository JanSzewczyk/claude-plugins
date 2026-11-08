# github

GitHub repository administration through the `gh` CLI. You describe the project in a sentence. The
skill then proposes each choice in turn: owner, name, visibility, which of your template
repositories fits, and every settings group. You approve, adjust or skip each one, and only then does
it create and configure the repository in one run and read the result back from GitHub.

For the branch → commit → pull request loop inside a repository see
[git-workflow](../git-workflow/). For README and About text, or for catching a repository up with
its template later, see [code-quality](../code-quality/).

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **github-repo-init** | `/github-repo-init <what the project is>` | Creates a new repository from your own template (or empty with gitignore, license and README) and configures features, merge methods, head-branch cleanup, Dependabot alerts and security updates, secret and code scanning, Actions token permissions, labels, and a default-branch ruleset with required status checks and the bypass your release bot needs. Every decision is approved; nothing is written before the final "Apply" |

## Installation

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install github@szum-tech
```

Needs the [GitHub CLI](https://cli.github.com/) signed in (`gh auth login`) with the `repo` scope,
and Node.js 18+ for the apply script.

## Usage

```bash
/github-repo-init FastAPI service that tracks invoices, public
/github-repo-init nowa aplikacja Next.js do zarządzania budżetem domowym
```

The run walks eight phases, each ending in a file in the session scratchpad:

1. **Preflight**: `gh` login, your organizations and each owner's plan.
2. **Brief**: owner, three free names to pick from, visibility (public by default), description,
   topics.
3. **Template**: your `isTemplate` repositories ranked against the description, or an empty
   repository.
4. **Settings**: one decision per group (features, merge, Dependabot, security, Actions, labels).
   Settings your plan cannot have are shown and left out.
5. **Protection**: a ruleset on the default branch. Required status checks come from checks that
   really ran on the template. A bypass is proposed for any workflow that pushes to `main` itself,
   such as semantic-release with `GITHUB_TOKEN`, with the file and line as evidence.
6. **Review**: the exact `gh` commands, dry-run checked. You answer Apply, Change a group, or Cancel.
7. **Apply**: `scripts/apply-plan.mjs` runs the plan in the fixed order (create, wait for the first
   commit, settings, protection last). Then it reads everything back.
8. **Clone and report**: clones into a directory you approve, and lists what was applied, what was
   not and why, and what is left to do by hand.

The repository records its template (`templateRepository`), so `/template-sync` finds it later
without arguments.

### What it deliberately does not do

- **Commit files.** Dependabot version updates (`.github/dependabot.yml`), CODEOWNERS and
  SECURITY.md are listed in the report instead.
- **Handle secrets.** It prints `gh secret set <NAME>` for you to run and type the value yourself.
- **Delete repositories,** or refresh your `gh` login.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "not available on Free" for the ruleset, secret scanning, code scanning | Private repository on a Free plan | Make it public, or upgrade. The skill leaves these out instead of failing |
| A pull request waits forever for a check | The required check name never runs | Edit the ruleset in Settings → Rules. The report says which names came from workflow files rather than a real run |
| A release job fails to push to `main` | The release actor has no bypass | Add it in Settings → Rules → Bypass list (GitHub Actions is app `15368`) |
| `gh auth status` fails in preflight | Token expired or missing | Run `gh auth login` yourself and start again |

## Development

```bash
node --test plugins/github/skills/github-repo-init/tests/apply-plan.test.mjs
node plugins/github/skills/github-repo-init/scripts/apply-plan.mjs <plan.json> --dry-run
```

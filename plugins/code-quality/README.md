# code-quality

Technology-agnostic repository maintenance — README and GitHub description generation, and catching a repo up with the GitHub template it was created from. Code review, performance analysis and dependency tooling moved to the technology plugins (**nextjs** and **typescript**).

## Contents

### Skills

| Skill                        | Invoke with                 | Description                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **repository-documentation** | `/repository-documentation` | Generate or update README.md plus a ready-to-paste GitHub description and topics list, per the Szum-Tech documentation standard                                                                                                                 |
| **template-sync**            | `/template-sync`            | Find what the GitHub template a repo was created from has changed since, assess each change against the repo, and write an ordered catch-up plan, then (on approval) apply it and record a `Template-Sync` sync commit the next run starts from |

## Installation

```bash
/plugin install code-quality@szum-tech
```

## Usage

**Documentation:**

> `/repository-documentation` — detects the project type, confirms it, and writes the README plus GitHub About text

**Template catch-up** in a repo created with "Use this template":

> `/template-sync`

Finds the template, locates the commit the project last matched, groups the template's later commits into changes, judges each against your repo, and writes `template-sync-plan-<date>.md` in the repo root. After you approve the plan, it applies the approved steps on the current branch (one commit per step) and closes with a sync commit whose `Template-Sync` trailer marks the template commit the project now matches, so the next run reads only what the template changed since. Needs `git`, `python3` (3.9+) and, to discover or clone a GitHub template, an authenticated `gh`.

## Troubleshooting

| Problem                                      | Solution                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| repository-documentation picks the wrong type | Correct it when the skill asks you to confirm the detected project type                          |
| template-sync cannot find the template       | Pass the template repository explicitly, or authenticate `gh` so it can read the repo's metadata |

## Moved in 3.0.0

| Was                                       | Now                                |
| ----------------------------------------- | ---------------------------------- |
| `code-quality:code-reviewer`              | `nextjs:code-reviewer`             |
| `code-quality:performance-analyzer`       | `nextjs:performance-analyzer`      |
| `code-quality:performance-optimization`   | `nextjs:performance-optimization`  |
| `code-quality:library-updater`            | `typescript:library-updater`       |
| `code-quality:update-deps`                | `typescript:update-deps`           |
| `code-quality:dead-code`                  | `typescript:dead-code`             |

## Related Plugins

- [**nextjs**](../nextjs/) — code review and performance analysis
- [**typescript**](../typescript/) — dependency updates and dead-code sweeps
- [**plugin-dev**](../plugin-dev/) — Marketplace auditing and plugin release tooling

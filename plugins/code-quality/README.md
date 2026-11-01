# code-quality

Technology-agnostic repository maintenance — README and GitHub description generation, catching a repo up with the GitHub template it was created from, and safe dependency updates across ecosystems. Code review, performance analysis and single-package npm updates live in the technology plugins (**nextjs** and **typescript**).

## Contents

### Skills

| Skill                        | Invoke with                 | Description                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **repository-documentation** | `/repository-documentation` | Generate or update README.md plus a ready-to-paste GitHub description and topics list, per the Szum-Tech documentation standard                                                                                                                 |
| **update-deps**              | `/update-deps`              | Update dependencies in sequential, theme-grouped batches for Node, and in beta for Python and Java/JVM; detect the ecosystem, verify + commit each group on its own branch, pause on majors, then open a PR with the full report                |
| **template-sync**            | `/template-sync`            | Find what the GitHub template a repo was created from has changed since, assess each change against the repo, and write an ordered catch-up plan, then (on approval) apply it on its own branch, commit each step, record a `Template-Sync` sync commit the next run starts from, and open a pull request |

## Installation

```bash
/plugin install code-quality@szum-tech
```

## Usage

**Documentation:**

> `/repository-documentation` — detects the project type, confirms it, and writes the README plus GitHub About text

**Template catch-up** in a repo created with "Use this template":

> `/template-sync`

Finds the template, locates the commit the project last matched, groups the template's later commits into changes, judges each against your repo, and writes `template-sync-plan-<date>.md` in the repo root. After you approve the plan, it creates a branch, applies the approved steps (one commit per step) and closes with a sync commit whose `Template-Sync` trailer marks the template commit the project now matches, so the next run reads only what the template changed since. It then opens a pull request. Branch, commits and PR are made with the `git-workflow` plugin's skills, so install that plugin too. Needs `git`, `python3` (3.9+) and, to discover or clone a GitHub template, an authenticated `gh`.

**Dependency updates** in any supported repo:

> `/update-deps`, or narrow it: `/update-deps python`, `/update-deps storybook`, `/update-deps skip-majors`

Detects the ecosystems from the repo's manifest files and reads only the matching profile, so a Python project never loads the npm rules. Each ecosystem gets its own pass on one branch, with one PR and one report. Uses the `git-workflow` plugin's skills when installed, and needs an authenticated `gh` for the PR.

| Ecosystem | Tools                                      | Status                 |
| --------- | ------------------------------------------ | ---------------------- |
| Node      | npm, pnpm, yarn, bun                       | Verified               |
| Python    | uv, Poetry, PDM, Pipenv, pip-tools, pip    | **Beta, to be tested** |
| Java/JVM  | Maven, Gradle                              | **Beta, to be tested** |

Beta means the commands were checked against each tool's documentation but have not been run end-to-end. The skill says so when it selects a beta profile, and repeats it in the report and the PR.

## Troubleshooting

| Problem                                      | Solution                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| repository-documentation picks the wrong type | Correct it when the skill asks you to confirm the detected project type                          |
| template-sync cannot find the template       | Pass the template repository explicitly, or authenticate `gh` so it can read the repo's metadata |
| update-deps finds no supported ecosystem     | It covers Node, Python and Java/JVM. Other ecosystems (Go, Rust, PHP, Ruby) are named in the report and skipped |
| update-deps command fails on Python or Java  | Those profiles are in beta. Please report the command and its output so the profile can be corrected |

## Moved in 3.0.0

| Was                                       | Now                                |
| ----------------------------------------- | ---------------------------------- |
| `code-quality:code-reviewer`              | `nextjs:code-reviewer`             |
| `code-quality:performance-analyzer`       | `nextjs:performance-analyzer`      |
| `code-quality:performance-optimization`   | `nextjs:performance-optimization`  |
| `code-quality:library-updater`            | `typescript:library-updater`       |
| `code-quality:dead-code`                  | `typescript:dead-code`             |

`update-deps` moved to **typescript** in 3.0.0 and came back in 3.2.0, when it stopped being npm-only.

## Related Plugins

- [**nextjs**](../nextjs/) — code review and performance analysis
- [**typescript**](../typescript/) — single-package npm updates and dead-code sweeps
- [**plugin-dev**](../plugin-dev/) — Marketplace auditing and plugin release tooling

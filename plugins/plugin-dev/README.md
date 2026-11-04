# plugin-dev

Author and maintain a Claude Code plugin marketplace — audit a repo for drift between its manifest layers and the documentation that enumerates them by hand, then cut versioned plugin releases.

This plugin is about **distribution**: whether the repo describes itself truthfully, and what version a change deserves. Every skill works on any plugin or marketplace repo, not just this one: plugins are found through each entry's `source`, and the manifest is read from `.claude-plugin/plugin.json` (a legacy `plugin.json` beside `skills/` is still read, and reported). The plugin authoring rules they apply ship inside each skill as `references/rules.md`, generated from `knowledge/plugin-authoring/`. If what you want is to make one *skill* better, that is [**skill-dev**](../skill-dev/) — the two were split so neither audience carries the other's tooling.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **marketplace-doctor** | `/marketplace-doctor` | Audit a plugin marketplace repo for drift between manifest layers and the docs that enumerate them by hand |
| **plugin-release** | `/plugin-release` | Work out which plugins changed, propose the semver bump each change implies, write it into plugin.json, and tag the release; `--check` is the CI gate for a missing bump |
| **plugin-dev-setup** | `/plugin-dev-setup` | Write the plugin-development workflow (where manifests live, what to bump and update after each change) into a project's CLAUDE.md, and optionally a CI workflow that enforces it |
| **mod-creator** | `/mod-creator` | Build, test, debug and review Claude Code mods — plugins whose `hooks/hooks.json` lists `modules` that draw panes, bands and toasts, add commands, or guard tool calls |

## Installation

```bash
cp -r plugins/plugin-dev/skills/*  your-project/.claude/skills/
```

Or install the plugin from the marketplace:

```
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install plugin-dev@szum-tech
```

## Usage

### Audit the repo before committing

```bash
/marketplace-doctor                    # audit the current directory
/marketplace-doctor ../other-repo      # audit another marketplace repo
```

The deterministic sweep is also runnable on its own — this is what CI executes:

```bash
node plugins/plugin-dev/skills/marketplace-doctor/scripts/check-marketplace.mjs .
```

Exit 0 clean, 1 on any error. `--strict` also fails on warnings, `--json` for machine output,
`--no-native` skips the wrapped `claude plugin validate` pass.

House rules that Claude Code does not require (closed frontmatter key sets, attribution in both manifests, a bold README row per skill) apply only to a repo that commits `.marketplace-doctor.json` with `{ "conventions": true }`.

### Cut a release

```bash
/plugin-release                # every plugin changed since its own last tag
/plugin-release code-quality   # just one plugin
```

Run `/marketplace-doctor` first — shipping a stale README is the failure this pairing exists to prevent.

## How the pieces fit

1. **marketplace-doctor** answers *does the repo describe itself truthfully?* — it compares the plugins, agents and skills on disk against `marketplace.json`, every `plugin.json`, the tables in `CLAUDE.md`, the root `README.md`, and each per-plugin README, and enforces the frontmatter contracts.
2. **plugin-release** answers *what version does this change deserve?* — it diffs against the last tag, groups changes per plugin, proposes a semver bump with reasons, writes it into `plugin.json`, and drives `claude plugin tag`.

Both answer questions *about the repo*. The question *about one skill* — is it well written, and did
that edit help — belongs to [**skill-dev**](../skill-dev/).

## Shared GitHub Action

The repository ships a composite action that runs the doctor and the version bump check, so any
other marketplace repo can gate its pull requests with one step (`/plugin-dev-setup --ci` writes it):

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: JanSzewczyk/claude-plugins/.github/actions/plugin-checks@plugin-dev--v3.6.0
```

Inputs: `node-version` (default `26`), `install-claude`, `strict`, `check-version-bumps`, `base-ref`, `path`.

## Requirements

- Node.js 18+ (the bundled scripts are plain ESM, no dependencies)
- `claude` CLI on PATH for the native validation pass and for `claude plugin tag`
- A git repository — `plugin-release` diffs against each plugin's tags to decide what changed

## Tests

```bash
node --test plugins/plugin-dev/skills/marketplace-doctor/tests/check-marketplace.test.mjs
node --test plugins/plugin-dev/skills/plugin-release/tests/plan-release.test.mjs
```

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `marketplace-doctor` reports drift you intend to keep | The tables in `CLAUDE.md` and the READMEs are the hand-typed layer — fix them rather than silencing the check; there is no ignore file by design |
| `marketplace-doctor` flags house rules your repo never adopted | Remove `.marketplace-doctor.json`, or set `conventions` to `false` |
| A plugin is missing from the report | It has a remote `source`, which the `Not checked` lines name, or no entry in `marketplace.json` |
| `claude plugin validate` fails but the script passes | Run with `--no-native` to isolate which layer complains, then read the native error — it checks schema details the script does not |
| `plugin-release` proposes no bump | Nothing changed since the last tag for that plugin, or the tag is missing; check `git tag --list '<plugin>--v*'` |
| `plugin-release` proposes the wrong bump size | The script proposes a floor from which files moved; a repo's `CLAUDE.md` Versioning section overrides the skill's defaults, so correct the rules there |
| `plugin-release` calls a plugin a first release | The repo tags per plugin and this one has no `<plugin>--v*` tag yet; tag its current version |

## Related Plugins

- [**skill-dev**](../skill-dev/) — the other half of the split: authoring-quality audits and A/B testing for a single skill
- [**code-quality**](../code-quality/) — code review, dead-code, and dependency tooling for application repos
- [**shared-rules**](../shared-rules/) — canonical `.claude/rules/` files distributed to projects

# plugin-dev

Author and maintain Claude Code plugins — audit a marketplace repo for manifest and documentation drift, cut versioned plugin releases, and A/B test skills against measured outcomes.

This plugin is for people building *plugins*, not for people building applications. If you are writing app code, you want [**code-quality**](../code-quality/) instead — these three skills were split out of it so neither audience carries the other's tooling.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **marketplace-doctor** | `/marketplace-doctor` | Audit a plugin marketplace repo for drift between manifest layers and the docs that enumerate them by hand |
| **plugin-release** | `/plugin-release` | Work out which plugins changed, propose the semver bump each change implies, write it into plugin.json, and tag the release |
| **skill-ab-optimizer** | `/skill-ab-optimizer` | A/B test and improve Claude Code skills — quantitative metrics on triggering and outcomes, changes accepted only when they measurably help |

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
`--no-native` skips the wrapped `claude plugin validate --strict` pass.

### Cut a release

```bash
/plugin-release                # every plugin changed since the last tag
/plugin-release code-quality   # just one plugin
```

Run `/marketplace-doctor` first — shipping a stale README is the failure this pairing exists to prevent.

### Improve a skill against evidence

```bash
/skill-ab-optimizer auto plugins/code-quality/skills/performance-optimization --iterations 5
```

## How the pieces fit

1. **marketplace-doctor** answers *does the repo describe itself truthfully?* — it compares the plugins, agents and skills on disk against `marketplace.json`, every `plugin.json`, the tables in `CLAUDE.md`, the root `README.md`, and each per-plugin README, and enforces the frontmatter contracts.
2. **plugin-release** answers *what version does this change deserve?* — it diffs against the last tag, groups changes per plugin, proposes a semver bump with reasons, writes it into `plugin.json`, and drives `claude plugin tag`.
3. **skill-ab-optimizer** answers *did the edit actually help?* — it runs A/B experiments over a skill's wording and accepts a change only when the measured outcome improves.

## Requirements

- Node.js 18+ (the bundled scripts are plain ESM, no dependencies)
- `claude` CLI on PATH for the native validation pass and for `claude plugin tag`
- A git repository — `plugin-release` diffs against tags to decide what changed

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `marketplace-doctor` reports drift you intend to keep | The tables in `CLAUDE.md` and the READMEs are the hand-typed layer — fix them rather than silencing the check; there is no ignore file by design |
| `claude plugin validate` fails but the script passes | Run with `--no-native` to isolate which layer complains, then read the native error — it checks schema details the script does not |
| `plugin-release` proposes no bump | Nothing changed since the last tag for that plugin, or the tag is missing; check `git tag --list '<plugin>--v*'` |
| `plugin-release` proposes the wrong bump size | The semver rules live in the repo's `CLAUDE.md` Versioning section — the skill implements them rather than replacing them, so correct the rules there |
| `skill-ab-optimizer` runs are inconsistent | Increase `--iterations`; a single run tells you almost nothing about a description change |

## Related Plugins

- [**code-quality**](../code-quality/) — code review, dead-code, and dependency tooling for application repos
- [**shared-rules**](../shared-rules/) — canonical `.claude/rules/` files distributed to projects

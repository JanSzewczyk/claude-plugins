# plugin-dev

Author and maintain Claude Code plugins and the marketplaces that distribute them — create and audit a plugin, create, maintain and audit a marketplace (including drift between its manifest layers and the documentation that enumerates them by hand), build mods, and cut versioned plugin releases.

This plugin is about **building and distributing plugins**: what goes into one, whether the repo describes itself truthfully, and what version a change deserves. The two creators share one shape with mod-creator: a create mode, an audit mode that changes nothing, and the audit as the create mode's last step. Every skill works on any plugin or marketplace repo, not just this one: plugins are found through each entry's `source`, and the manifest is read from `.claude-plugin/plugin.json` (a legacy `plugin.json` beside `skills/` is still read, and reported). The plugin authoring rules they apply ship inside each skill as `references/rules.md`, generated from `knowledge/plugin-authoring/`. If what you want is to make one *skill* better, that is [**skill-dev**](../skill-dev/) — the two were split so neither audience carries the other's tooling.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **plugin-creator** | `/plugin-creator`, `/plugin-creator audit <dir>` | Create, extend, debug and audit a plugin — manifest, skills, agents, hooks, MCP/LSP servers, `userConfig`, dependencies, evals, token cost and release readiness; converts a `.claude/` setup |
| **marketplace-creator** | `/marketplace-creator`, `/marketplace-creator audit` | Create a marketplace, add, rename or remove entries, host it, set relevance; its audit finds manifest and doc drift plus unpinned sources, missing `renames` and other install-time breakage |
| **plugin-release** | `/plugin-release` | On request only: work out which plugins changed (branch vs main, one commit, or uncommitted), propose the semver bump each change implies, write it into plugin.json after you agree, and tag the release; `--check` is the CI gate for a missing bump |
| **plugin-setup** | `/plugin-setup` | Write the plugin-development workflow (where manifests live, which docs to update, never bump unasked) into a project's CLAUDE.md, and optionally a CI workflow that fails a PR with a missing version bump |
| **mod-creator** | `/mod-creator`, `/mod-creator audit <path>` | Build, test, debug and audit Claude Code mods (`/mod-creator audit <path>` ranks findings and gives a verdict) — plugins whose `hooks/hooks.json` lists `modules` that draw panes, bands and toasts, add commands, or guard tool calls |

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

### Create a plugin and register it

```bash
/plugin-creator a plugin that formats Terraform on save   # design, scaffold, validate, evals, audit
/marketplace-creator add terraform-tools                  # entry + doc tables, then the audit
/plugin-creator audit plugins/terraform-tools             # ranked findings and a verdict
```

### Audit the repo before committing

```bash
/marketplace-creator audit                    # audit the current directory
/marketplace-creator audit ../other-repo      # audit another marketplace repo
```

The deterministic sweep is also runnable on its own — this is what CI executes:

```bash
node plugins/plugin-dev/skills/marketplace-creator/scripts/check-marketplace.mjs .
```

Exit 0 clean, 1 on any error. `--strict` also fails on warnings, `--json` for machine output,
`--no-native` skips the wrapped `claude plugin validate` pass.

A second script asks the CLI itself whether every plugin loads, installs from the marketplace,
and keeps its always-on tokens under 1,800 (failing at 2,000). Load and install run in a
throwaway config, never yours; needs Claude Code 2.1.265+:

```bash
node plugins/plugin-dev/skills/marketplace-creator/scripts/check-cli.mjs .   # --load, --install, --budget to pick
```

House rules that Claude Code does not require (closed frontmatter key sets, attribution in both manifests, a bold README row per skill) apply only to a repo that commits `.marketplace-creator.json` with `{ "conventions": true }` (the older `.marketplace-doctor.json` is still read).

### Cut a release

```bash
/plugin-release                # every plugin this branch changed against main, plus uncommitted work
/plugin-release code-quality   # just one plugin
```

Nothing bumps a version on its own: you run `/plugin-release`, it shows the plan (the CLI decides
whether each plugin needs a bump and how big), and it writes a version only after you agree. CI is
what catches a bump you forgot. Run `/marketplace-creator audit` first — shipping a stale README is
the failure this pairing exists to prevent.

The planner is runnable on its own, in a marketplace or a single-plugin repo (a root
`.claude-plugin/plugin.json`):

```bash
node plugins/plugin-dev/skills/plugin-release/scripts/plan-release.mjs .             # branch vs main + uncommitted
node plugins/plugin-dev/skills/plugin-release/scripts/plan-release.mjs . --commit abc123  # one commit
node plugins/plugin-dev/skills/plugin-release/scripts/plan-release.mjs . --working   # uncommitted only
node plugins/plugin-dev/skills/plugin-release/scripts/plan-release.mjs . --apply     # write the proposed versions
```

On the default branch itself, with nothing to compare a branch against, each plugin is compared with
its last `<plugin>--v*` tag. `--since <ref>` overrides all of it.

## How the pieces fit

1. **plugin-creator** answers *what goes into this plugin, and is it ready?* — it designs components by kind (guidance is a skill, a rule that must always hold is a hook), validates, measures the always-on token cost, writes evals, and audits against checklist P1–P9.
2. **marketplace-creator** answers *does the repo describe itself truthfully, and will it keep installing?* — it compares the plugins, agents and skills on disk against `marketplace.json`, every `plugin.json`, the tables in `CLAUDE.md`, the root `README.md`, and each per-plugin README, and enforces the frontmatter contracts.
3. **plugin-release** answers *what version does this change deserve?* — it diffs the branch against main (or a commit, or the working tree), groups changes per plugin, proposes a semver bump with reasons, writes it into `plugin.json` once you agree, and drives `claude plugin tag`.

All three answer questions *about plugins and the repo*; **mod-creator** does the same for a plugin whose `hooks/hooks.json` lists a hooks module. The question *about one skill* — is it well written, and did
that edit help — belongs to [**skill-dev**](../skill-dev/).

## Shared GitHub Actions

Two composite actions run the plugin-dev scripts from the ref they are pinned to, so a repository
that uses them vendors nothing. Replace `<version>` with a `plugin-dev--v<version>` tag that exists
(`git ls-remote --tags https://github.com/JanSzewczyk/claude-plugins 'plugin-dev--v*'`); the actions
below ship from the release that follows this change.

**`version-bump-check`** fails a pull request in which a plugin changed and its version did not. It
works in a marketplace and in a single-plugin repo, fetches the base history itself (no
`fetch-depth: 0`), annotates the manifest and writes a step summary:

```yaml
- uses: actions/checkout@v4
- uses: JanSzewczyk/claude-plugins/.github/actions/version-bump-check@plugin-dev--v<version>
```

Inputs: `base-ref` (default: the PR base), `path`, `strict` (also fail a bump smaller than the change
implies), `ignore-plugins` (comma-separated), `node-version` (default `26`). It does nothing outside a
`pull_request` event.

**`plugin-checks`** does that and the marketplace audit in one step (`/plugin-setup --ci` writes it):

```yaml
- uses: actions/checkout@v4
- uses: JanSzewczyk/claude-plugins/.github/actions/plugin-checks@plugin-dev--v<version>
```

Inputs: `node-version`, `install-claude`, `strict`, `check-version-bumps`, `strict-version-bumps`,
`ignore-plugins`, `base-ref`, `path`, `check-load`, `check-install`, `check-budget`, `budget-warn`,
`budget-fail`.

## Requirements

- Node.js 18+ (the bundled scripts are plain ESM, no dependencies)
- `claude` CLI on PATH for the native validation pass and for `claude plugin tag`
- A git repository — `plugin-release` diffs against each plugin's tags to decide what changed

## Tests

```bash
node --test plugins/plugin-dev/skills/marketplace-creator/tests/check-marketplace.test.mjs
node --test plugins/plugin-dev/skills/marketplace-creator/tests/check-cli.test.mjs
node --test plugins/plugin-dev/skills/plugin-release/tests/plan-release.test.mjs
```

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| The marketplace audit reports drift you intend to keep | The tables in `CLAUDE.md` and the READMEs are the hand-typed layer — fix them rather than silencing the check; there is no ignore file by design |
| The marketplace audit flags house rules your repo never adopted | Remove `.marketplace-creator.json` (or `.marketplace-doctor.json`), or set `conventions` to `false` |
| `/marketplace-doctor` no longer exists | It became `marketplace-creator` in plugin-dev 4.0.0; its audit is `/marketplace-creator audit`, and the script moved to `skills/marketplace-creator/scripts/` |
| `/plugin-dev-setup` no longer exists | It became `/plugin-setup` in plugin-dev 4.0.0. The block it writes keeps its `<!-- BEGIN:plugin-dev -->` markers, so re-running refreshes a block written by the old name |
| `/plugin-setup` in a single-plugin repo | It validates the plugin with `claude plugin validate --strict` instead of the marketplace audit; the bump check works there too, treating the root `.claude-plugin/plugin.json` as the one plugin |
| A new plugin's `userConfig` dialog never appears | `--plugin-dir` never shows it; run `/plugin configure <plugin>` in the session (plugin-creator → `references/components.md`) |
| A plugin is missing from the report | It has a remote `source`, which the `Not checked` lines name, or no entry in `marketplace.json` |
| `claude plugin validate` fails but the script passes | Run with `--no-native` to isolate which layer complains, then read the native error — it checks schema details the script does not |
| `plugin-release` proposes no bump | Nothing changed against the baseline: on a feature branch that is where it left main, on main itself the plugin's last tag (check `git tag --list '<plugin>--v*'`); pass `--since <ref>` to choose another |
| The `version-bump-check` job fails but I did not touch the plugin | Something under the plugin's folder changed (a README inside it counts); in a single-plugin repo `.github/`, `docs/`, dotfiles and the root README, LICENSE and CHANGELOG are ignored. Bump with `/plugin-release`, or pass `ignore-plugins` |
| Claude bumps versions or runs `/plugin-release` without being asked | An older `/plugin-setup` block in CLAUDE.md told it to; re-run `/plugin-setup` to refresh the block, or delete the "bump the version" step by hand |
| `plugin-release` proposes the wrong bump size | The script proposes a floor from which files moved; a repo's `CLAUDE.md` Versioning section overrides the skill's defaults, so correct the rules there |
| `plugin-release` calls a plugin a first release | The repo tags per plugin and this one has no `<plugin>--v*` tag yet; tag its current version |

## Related Plugins

- [**skill-dev**](../skill-dev/) — the other half of the split: authoring-quality audits and A/B testing for a single skill
- [**code-quality**](../code-quality/) — code review, dead-code, and dependency tooling for application repos
- [**shared-rules**](../shared-rules/) — canonical `.claude/rules/` files distributed to projects

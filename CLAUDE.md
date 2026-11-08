# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Plugins Repository

This repository is a **Claude Code marketplace** distributing skills and agents under the Szum-Tech marketplace. It contains no application code — the deliverables are Markdown prompts (agents, skills) plus JSON manifests. There is no `package.json`, build step, or test runner at the repo root.

## Structure

```
.claude-plugin/
  marketplace.json              # Marketplace manifest listing all plugins
plugins/
  <plugin-name>/
    .claude-plugin/
      plugin.json               # Plugin manifest (name, description, agents, skills)
    README.md                   # Per-plugin docs (skills table, install, troubleshooting)
    agents/                     # Agent definitions (.md files with frontmatter)
    skills/                     # Skill directories (SKILL.md + supporting docs)
```

## Plugins

| Plugin                 | Description                                     | Agents                                                                     | Skills                                                                                                                                                  |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **testing**            | Technology-agnostic testing core                | —                                                                          | playwright-cli, true-dom-tester                                                                                                                         |
| **typescript**         | TypeScript & JavaScript language layer          | unit-tester, library-updater                                               | unit-testing, builder-factory, coverage-gaps, dead-code, builder-rules-ts                                                                               |
| **python**             | Python language layer                           | python-developer, python-api-architect, python-tester, python-reviewer     | api-architecture-rules, python-api-team, builder-rules, python-rules, python-project-rules, pytest-rules, fastapi-rules                                                                           |
| **react**              | React 19 UI development                         | frontend-expert, storybook-tester                                          | react-19-compiler, create-stories, accessibility-audit, storybook-rules, component-test-rules                                                           |
| **design**             | Design system & styling                         | —                                                                          | szum-tech-design-system, tailwind-css-4, design-system-component, implement-design                                                                      |
| **nextjs**             | Next.js full-stack development                  | nextjs-backend-engineer, code-reviewer, performance-analyzer, testing-strategist | server-actions, t3-env-validation, structured-logging, toast-notifications, error-handling, generate-feature-package, devlogs, api-test, performance-optimization, lighthouse-audit |
| **firebase**           | Firebase & DB architecture                      | database-architect                                                         | firebase-firestore, db-migration                                                                                                                        |
| **code-quality**       | Repository maintenance                          | —                                                                          | repository-documentation, template-sync, update-deps                                                                                                    |
| **product-management** | PRD/TDD orchestration & agent coordination      | product-owner                                                              | prd-spec                                                                                                                                                |
| **ai-tools**           | AI tool integrations & automation               | —                                                                          | notebooklm, youtube-scraper, kw-lookup                                                                                                                  |
| **plugin-dev**         | Plugin & marketplace authoring, releases, setup | —                                                                          | plugin-creator, marketplace-creator, plugin-release, plugin-setup, mod-creator                                                                                   |
| **skill-dev**          | Skill authoring quality & A/B testing           | —                                                                          | skill-audit, skill-ab-optimizer, workflow-creator, workflow-skill-creator                                                                               |
| **shared-rules**       | Source of truth for `.claude/rules/` files      | —                                                                          | sync-rules                                                                                                                                              |
| **knowledge-dev**      | Shared knowledge base authoring & build         | librarian                                                         | knowledge-author                                                                                                                                        |
| **git-workflow**       | Git workflow — branches, commits, pull requests | —                                                                          | create-branch, create-commit, create-pull-request, ship-task                                                                                            |
| **github**             | GitHub repository creation, audit & settings    | —                                                                          | github-repo-init, github-repo-audit                                                                                                                     |

Technology plugins are layers that depend only downward: `testing` ← `typescript` ← `react` ←
`nextjs` ← `firebase`, with `design` under `react` and `nextjs`, and `python` standalone. The rest
serve any stack and stay grouped by purpose. Why: D23 in
`plugins/knowledge-dev/skills/knowledge-author/references/decisions.md`.

## How registration works (the big picture)

Three manifest layers must stay in sync when adding capabilities:

1. **`.claude-plugin/marketplace.json`** — lists every plugin with its `source` path. A new *plugin* must be added here; new agents/skills inside an existing plugin do **not** touch this file.
2. **`plugins/<name>/.claude-plugin/plugin.json`** — `agents` is an explicit array of relative `.md` paths (each new agent must be added). `skills` is a **directory glob** (`"./skills/"`), so a new skill is auto-discovered just by creating its folder — no manifest edit needed.
3. **Documentation** — the root `README.md`, the per-plugin `README.md`, and this file's Plugins table all enumerate capabilities by hand; update them when adding an agent or skill. Use `/repository-documentation` to regenerate the READMEs.

`/plugin-creator` scaffolds a new plugin or component against these rules, and `/marketplace-creator add <plugin>` registers it in all three layers.

## Conventions

- Plugin names use kebab-case; skill folder names are kebab-case and become the `/slash-command`.
- A skill or agent goes into the most general technology plugin whose stack it needs (Vitest → `typescript`, Storybook → `react`, route handlers → `nextjs`; works on any stack → `testing` or a purpose plugin). An agent preloads only from its own plugin or a layer below; if a preload would point up, drop it or move the agent up. A new technology is a new plugin named from the `knowledge.config.json` vocabulary (add the term there first).
- Agent definitions are Markdown (`.md`) with YAML frontmatter in this exact key order: `name`, `version`, `lastUpdated`, `author`, `related-agents`, `description`, `tools`, `model` (defaults to `sonnet`), `color`, `skills`. Every agent carries this same set. Do not add other keys (e.g. `maxTurns`, `memory`). `permissionMode`, `hooks` and `mcpServers` are forbidden: Claude Code ignores them on agents shipped in a plugin, so they only promise behaviour that never happens. A hook that must run belongs in the plugin's `hooks/hooks.json`.
- An agent that preloads (`skills:`) a skill from another plugin makes its plugin depend on that one: declare it in `dependencies`, identically in the plugin's `marketplace.json` entry (the copy Claude Code reads and enforces) and in its `plugin.json`, as `{ "name": "<plugin>", "version": "^<tagged version>" }`. Dependencies install automatically, so never let two plugins depend on each other; drop the preload instead.
- Skill directories contain `SKILL.md` as the entry point. Its frontmatter is unified across all skills to at most five fields, in this order: `name`, `description`, `allowed-tools`, `argument-hint`, and `user-invocable` (the last three optional — `allowed-tools` only when the skill restricts tools, `argument-hint` only when it takes arguments, `user-invocable: false` only on a background-knowledge skill that agents preload and users never call). Do **not** add other keys (no `version`, `tags`, `author`, `context`, `agent`, `examples`, `metadata`, etc.). Supporting files live alongside it: reference docs go in a `references/` subfolder, plus optional `templates/`, `scripts/`, `assets/`.
- All paths in manifests are relative to the plugin directory.
- Each skill names the languages and stack it targets in its description (e.g. "Vitest for TypeScript", "React components in CSF Next"); knowledge notes carry theirs in `applies`. Where a skill says nothing, assume Next.js 15+, React 19+, TypeScript 5.7+.

## Knowledge base

Rules that skills and agents apply live once in `knowledge/`, one decision per file (plus long-form guides that explain a choice and list the rules it produced, D27). Skills and
agents receive generated renderings (`references/rules.md`, the `BEGIN:knowledge` block in a
SKILL.md, the `*-rules` knowledge skills). Never edit those: edit the note and run
`node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs build`. CI runs `check`.

- How to write a note: `knowledge/README.md`.
- Why it works this way: `plugins/knowledge-dev/skills/knowledge-author/references/decisions.md`.
  Read the decision before changing the format, the rendering or the targets, and update it in the
  same change.
- Use `/knowledge-author` to extract rules from a skill, add or change a rule, or fix a failing check.
- An agent preloads the procedure skill it executes plus the `*-rules` knowledge skills it applies,
  not full skills it only consults (D22).

## Attribution

Every plugin must be attributed in **both** manifest layers, because two different surfaces read
two different files: the marketplace browser renders the entry in `.claude-plugin/marketplace.json`,
while an installed plugin renders its own `plugins/<name>/.claude-plugin/plugin.json`. A block present in only one
of them leaves the plugin nameless in the other view — which is exactly why author information was
not showing up before.

The block is identical in both places, and must be byte-for-byte the same for a given plugin:

```json
{
  "author": {
    "name": "Szum Tech Team",
    "email": "szum.tech@gmail.com",
    "url": "https://github.com/JanSzewczyk"
  },
  "homepage": "https://github.com/JanSzewczyk/claude-plugins",
  "license": "MIT"
}
```

- `author` is an **object**, never a bare string, and carries exactly `name`, `email`, `url` — no
  other keys. `name` is required (it is what every surface displays); `email` and `url` are strongly
  expected and flagged as warnings when absent.
- `homepage` points at the repository, so a listing can link back to the source.
- `license` must be present on every plugin — an unlicensed plugin is legally unusable by whoever
  installs it.
- `.claude-plugin/marketplace.json` additionally carries `owner` with the same `{ name, email, url }`
  shape; it is the attribution fallback for the marketplace as a whole.
- A **new plugin must be created with this block already filled in**, in both layers. `/marketplace-creator audit`
  enforces it: a missing `author` object or `owner.name` is an error, a missing `email`/`url`/`homepage`/
  `license` is a warning, and an `author.name` or `license` that disagrees between the two layers is an
  error.

## Versioning

Versions live in two places: `.claude-plugin/plugin.json` (`version`, per plugin) and agent frontmatter (`version` + `lastUpdated`, per agent). **Skills have no version field** — `SKILL.md` frontmatter is locked to the fields defined above, so a skill's version is tracked implicitly through its parent plugin's `version` in `plugin.json`.

**IMPORTANT — this must happen automatically, without being asked:** whenever you edit an agent `.md` file or anything under a plugin's `skills/` directory (or the plugin otherwise changes), bump the version before ending the turn. Don't leave a version unchanged just because the user didn't mention versioning.

- Editing a skill (any file under `plugins/<name>/skills/**`) → bump that plugin's `version` in `plugins/<name>/.claude-plugin/plugin.json`.
- Editing an agent (`plugins/<name>/agents/*.md`) → bump both that agent's own `version` in its frontmatter **and** the plugin's `version` in `plugin.json`, and set `lastUpdated` to today's date.
- Editing `plugin.json` metadata directly (description, agents list) with no other content change → bump the plugin `version` for that alone.
- A brand-new plugin starts at `1.0.0`; a brand-new agent starts at `1.0.0` with `lastUpdated` set to the creation date.

Semver rules for the bump size (apply the same rule to both plugin and agent versions):

- **patch** (`x.y.Z+1`) — wording/typo fixes, doc clarifications, small non-behavioral tweaks, reordering, formatting.
- **minor** (`x.Y+1.0`) — new skill or agent added, new capability/section, meaningfully expanded guidance, non-breaking additions.
- **major** (`X+1.0.0`) — breaking change: removed/renamed a skill or agent, changed a frontmatter contract, restructured in a way that invalidates prior usage.

Editing a note in `knowledge/` changes the generated files of every skill that receives it: bump each plugin whose files `build` rewrote, as if you had edited that skill by hand.

When several plugins/agents change in one turn, bump each one independently according to the scope of its own change — don't apply a single bump size across all of them.

## Validation & testing

There is no application code to unit-test, so validation means three different questions: *does
the repo describe itself truthfully?*, *does every plugin load and install?* and *do the skills
actually fire?*

**1. Manifests and documentation — `/marketplace-creator audit`.** The check that must pass before every
commit that adds, renames or removes a skill or agent. It compares the plugins, agents and skills
on disk against `marketplace.json`, every `plugin.json`, the Plugins table above, the root
`README.md` counts, and each per-plugin README, and enforces the frontmatter contracts below and
the `dependencies` that cross-plugin preloads require.

```bash
node plugins/plugin-dev/skills/marketplace-creator/scripts/check-marketplace.mjs .
```

Exit 0 clean, 1 on any error; `--strict` also fails on warnings, `--json` for machine output,
`--no-native` to skip the wrapped `claude plugin validate` pass. This runs in CI on every push and
pull request — see `.github/workflows/validate.yml`. The conventions in this file are enforced
because `.marketplace-creator.json` turns them on; the skill itself runs on any marketplace, where
they apply only if that repo opts in the same way.

**Load, install and token budget — `check-cli.mjs`.** Asks the CLI itself what validate and the
drift check can't see: every plugin loads without errors (`claude --plugin-dir <plugin> plugin
list --json`), installs from the marketplace (`marketplace add ./`, then `plugin install
<plugin>@szum-tech` for each, then `plugin list`), and keeps its always-on tokens (skill and agent
descriptions, from `claude plugin details`) under 1,800, failing at 2,000. Load and install run in
a throwaway `HOME`/`CLAUDE_CONFIG_DIR`, never your own config. Needs Claude Code 2.1.265+:

```bash
node plugins/plugin-dev/skills/marketplace-creator/scripts/check-cli.mjs .
```

Signed in, the budget is counted through the API (nextjs ~1,735 on 2026-11-05); signed out, as in
CI without an `ANTHROPIC_API_KEY` secret, the CLI estimates offline 25–40% low and the limits scale
down by 0.77 to match. CI runs the three checks in the `cli` job.

**Skill audit sweep.** CI runs the mechanical half of `/skill-audit` on every skill and fails on
errors (a description over 1,024 characters, a broken frontmatter contract, a dead link); warnings
are left to the author:

```bash
for d in plugins/*/skills/*/; do node plugins/skill-dev/skills/skill-audit/scripts/check-skill.mjs "$d" >/dev/null || echo "$d"; done
```

**Knowledge renderings — `knowledge.mjs check`.** Must pass whenever a note in `knowledge/`,
`knowledge/targets.json` or a generated file changes. CI runs it with `validate` and the script's
tests:

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs check
```

**2. Skill routing — `claude plugin eval`.** Every plugin has an `evals/` suite: one routing case
per skill, plus outcome cases where the artifact is worth grading. See [EVALS.md](./EVALS.md) for
the layout, how to run them, and the early-access caveat (the harness is gated per organization,
so the cases are authored but not yet executed).

```bash
claude plugin eval plugins/<name> --tag smoke --runs 1 --ablation none
```

**3. Skill scripts** — skills that bundle executable scripts can be exercised directly, e.g. the
`generate-feature-package` scaffold script supports a dry run:

```bash
node "plugins/nextjs/skills/generate-feature-package/scripts/scaffold-feature.mjs" <feature-name> --dry-run
```

The `plugin-dev` scripts have tests, which CI runs against marketplaces laid out unlike this one:

```bash
node --test plugins/plugin-dev/skills/marketplace-creator/tests/check-marketplace.test.mjs plugins/plugin-dev/skills/marketplace-creator/tests/check-cli.test.mjs plugins/plugin-dev/skills/plugin-release/tests/plan-release.test.mjs
```

**4. End-to-end** — install the marketplace locally (`/plugin marketplace add JanSzewczyk/claude-plugins`)
and invoke the skill/agent in a real Claude Code session.

**Installing from this checkout.** Add the folder as a marketplace and install by name; plugins
then load in place, so edits take effect on `/reload-plugins`:

```bash
claude plugin marketplace add /absolute/path/to/claude-plugins
claude plugin install <plugin>@szum-tech
```

Cross-plugin `dependencies` look at git tags (`<plugin>--v<version>`) as well as `plugin.json`.
When a tag satisfies the range, the dependency is recorded at that tag (`1.0.4-<tag commit>`)
even though it loads in place from the checkout; with no tag in range, a fresh install falls back
to the `plugin.json` version and succeeds (Claude Code 2.1.309, from `./` and from GitHub alike).
An older install whose recorded version no longer satisfies a range fails with "installed at an
unknown version"; `/marketplace-creator audit` warns about ranges with no tag. Fix it with
`claude plugin update <dependency>@szum-tech` (re-records the version from the checkout) or by
tagging the dependency; to try one plugin without installing, `claude --plugin-dir ./plugins/<name>`.

**Releasing.** `/plugin-release` works out which plugins changed since the last tag, proposes the
semver bump each change implies against the rules in the Versioning section, and drives
`claude plugin tag` to create `<plugin>--v<version>`. Run `/marketplace-creator audit` first — a release
that ships a stale README is the exact failure this repo keeps hitting.

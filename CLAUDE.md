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
    plugin.json                 # Plugin metadata (name, description, agents, skills)
    README.md                   # Per-plugin docs (skills table, install, troubleshooting)
    agents/                     # Agent definitions (.md files with frontmatter)
    skills/                     # Skill directories (SKILL.md + supporting docs)
```

## Plugins

| Plugin                 | Description                                | Agents                                               | Skills                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **nextjs**             | Next.js full-stack development             | nextjs-backend-engineer                              | server-actions, t3-env-validation, structured-logging, toast-notifications, error-handling, generate-feature-package, devlogs                                                                         |
| **react**              | React 19 UI development                    | frontend-expert                                      | react-19-compiler                                                                                                                                                                                     |
| **design**             | Design system & styling                    | —                                                    | szum-tech-design-system, tailwind-css-4, design-system-component, implement-design                                                                                                                    |
| **testing**            | Testing strategies & QA                    | testing-strategist, storybook-tester, unit-tester    | unit-testing, storybook-testing, builder-factory, api-test, accessibility-audit, playwright-cli, true-dom-tester, coverage-gaps                                                                        |
| **code-quality**       | Code review, performance & maintenance     | code-reviewer, performance-analyzer, library-updater | performance-optimization, repository-documentation, update-deps, dead-code                                                                                                                             |
| **firebase**           | Firebase & DB architecture                 | database-architect                                   | firebase-firestore, db-migration                                                                                                                                                                     |
| **product-management** | PRD/TDD orchestration & agent coordination | product-owner                                        | prd-spec                                                                                                                                                                                              |
| **ai-tools**           | AI tool integrations & automation          | —                                                    | notebooklm, youtube-scraper, kw-lookup                                                                                                                                                                |
| **performance**        | Web performance auditing                   | —                                                    | lighthouse-audit                                                                                                                                                                                      |
| **plugin-dev**         | Authoring & releasing Claude Code plugins  | —                                                    | marketplace-doctor, plugin-release, skill-ab-optimizer                                                                                                                                                |
| **shared-rules**       | Source of truth for `.claude/rules/` files | —                                                    | sync-rules                                                                                                                                                                                            |

## How registration works (the big picture)

Three manifest layers must stay in sync when adding capabilities:

1. **`.claude-plugin/marketplace.json`** — lists every plugin with its `source` path. A new *plugin* must be added here; new agents/skills inside an existing plugin do **not** touch this file.
2. **`plugins/<name>/plugin.json`** — `agents` is an explicit array of relative `.md` paths (each new agent must be added). `skills` is a **directory glob** (`"./skills/"`), so a new skill is auto-discovered just by creating its folder — no manifest edit needed.
3. **Documentation** — the root `README.md`, the per-plugin `README.md`, and this file's Plugins table all enumerate capabilities by hand; update them when adding an agent or skill. Use `/repository-documentation` to regenerate the READMEs.

## Conventions

- Plugin names use kebab-case; skill folder names are kebab-case and become the `/slash-command`.
- Agent definitions are Markdown (`.md`) with YAML frontmatter in this exact key order: `name`, `version`, `lastUpdated`, `author`, `related-agents`, `description`, `tools`, `model` (defaults to `sonnet`), `color`, `permissionMode`, `skills`, then optional `hooks`. Every agent carries this same set; only `hooks` may be omitted (when the agent defines none). Do not add other keys (e.g. `maxTurns`, `memory`).
- Skill directories contain `SKILL.md` as the entry point. Its frontmatter is unified across all skills to exactly four fields, in this order: `name`, `description`, `allowed-tools`, and `argument-hint` (the last two optional — `allowed-tools` only when the skill restricts tools, `argument-hint` only when it takes arguments). Do **not** add other keys (no `version`, `tags`, `author`, `context`, `agent`, `user-invocable`, `examples`, `metadata`, etc.). Supporting files live alongside it: reference docs go in a `references/` subfolder, plus optional `templates/`, `scripts/`, `assets/`.
- All paths in manifests are relative to the plugin directory.
- Skills target **Next.js 15+**, **React 19+**, **TypeScript 5.7+** unless the skill's `SKILL.md` says otherwise.

## Attribution

Every plugin must be attributed in **both** manifest layers, because two different surfaces read
two different files: the marketplace browser renders the entry in `.claude-plugin/marketplace.json`,
while an installed plugin renders its own `plugins/<name>/plugin.json`. A block present in only one
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
- A **new plugin must be created with this block already filled in**, in both layers. `/marketplace-doctor`
  enforces it: a missing `author` object or `owner.name` is an error, a missing `email`/`url`/`homepage`/
  `license` is a warning, and an `author.name` or `license` that disagrees between the two layers is an
  error.

## Versioning

Versions live in two places: `plugin.json` (`version`, per plugin) and agent frontmatter (`version` + `lastUpdated`, per agent). **Skills have no version field** — `SKILL.md` frontmatter is locked to exactly the four fields defined above, so a skill's version is tracked implicitly through its parent plugin's `version` in `plugin.json`.

**IMPORTANT — this must happen automatically, without being asked:** whenever you edit an agent `.md` file or anything under a plugin's `skills/` directory (or the plugin otherwise changes), bump the version before ending the turn. Don't leave a version unchanged just because the user didn't mention versioning.

- Editing a skill (any file under `plugins/<name>/skills/**`) → bump that plugin's `version` in `plugins/<name>/plugin.json`.
- Editing an agent (`plugins/<name>/agents/*.md`) → bump both that agent's own `version` in its frontmatter **and** the plugin's `version` in `plugin.json`, and set `lastUpdated` to today's date.
- Editing `plugin.json` metadata directly (description, agents list) with no other content change → bump the plugin `version` for that alone.
- A brand-new plugin starts at `1.0.0`; a brand-new agent starts at `1.0.0` with `lastUpdated` set to the creation date.

Semver rules for the bump size (apply the same rule to both plugin and agent versions):

- **patch** (`x.y.Z+1`) — wording/typo fixes, doc clarifications, small non-behavioral tweaks, reordering, formatting.
- **minor** (`x.Y+1.0`) — new skill or agent added, new capability/section, meaningfully expanded guidance, non-breaking additions.
- **major** (`X+1.0.0`) — breaking change: removed/renamed a skill or agent, changed a frontmatter contract, restructured in a way that invalidates prior usage.

When several plugins/agents change in one turn, bump each one independently according to the scope of its own change — don't apply a single bump size across all of them.

## Validation & testing

There is no application code to unit-test, so validation means two different questions: *does the
repo describe itself truthfully?* and *do the skills actually fire?*

**1. Manifests and documentation — `/marketplace-doctor`.** The check that must pass before every
commit that adds, renames or removes a skill or agent. It compares the plugins, agents and skills
on disk against `marketplace.json`, every `plugin.json`, the Plugins table above, the root
`README.md` counts, and each per-plugin README, and enforces the frontmatter contracts below.

```bash
node plugins/plugin-dev/skills/marketplace-doctor/scripts/check-marketplace.mjs .
```

Exit 0 clean, 1 on any error; `--strict` also fails on warnings, `--json` for machine output,
`--no-native` to skip the wrapped `claude plugin validate --strict` pass. This runs in CI on every
push and pull request — see `.github/workflows/validate.yml`.

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

**4. End-to-end** — install the marketplace locally (`/plugin marketplace add JanSzewczyk/claude-plugins`)
and invoke the skill/agent in a real Claude Code session.

**Releasing.** `/plugin-release` works out which plugins changed since the last tag, proposes the
semver bump each change implies against the rules in the Versioning section, and drives
`claude plugin tag` to create `<plugin>--v<version>`. Run `/marketplace-doctor` first — a release
that ships a stale README is the exact failure this repo keeps hitting.

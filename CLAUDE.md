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
| **nextjs**             | Next.js full-stack development             | nextjs-backend-engineer                              | server-actions, t3-env-validation, structured-logging, toast-notifications, error-handling, generate-feature-package                                                                                  |
| **react**              | React 19 UI development                    | frontend-expert                                      | react-19-compiler                                                                                                                                                                                     |
| **design**             | Design system & styling                    | —                                                    | szum-tech-design-system, tailwind-css-4, design-system-component, implement-design                                                                                                                    |
| **testing**            | Testing strategies & QA                    | testing-strategist, storybook-tester, unit-tester    | unit-testing, storybook-testing, builder-factory, api-test, accessibility-audit, playwright-cli, true-dom-tester                                                                                       |
| **code-quality**       | Code review, performance & maintenance     | code-reviewer, performance-analyzer, library-updater | performance-optimization, repository-documentation, update-deps                                                                                                                                       |
| **firebase**           | Firebase & DB architecture                 | database-architect                                   | firebase-firestore, db-migration                                                                                                                                                                     |
| **product-management** | PRD/TDD orchestration & agent coordination | product-owner                                        | prd-spec                                                                                                                                                                                              |
| **ai-tools**           | AI tool integrations & automation          | —                                                    | notebooklm, youtube-scraper                                                                                                                                                                           |
| **performance**        | Web performance auditing                   | —                                                    | lighthouse-audit                                                                                                                                                                                      |

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

## Validation & testing

There is no automated test suite. To validate changes:

- **Manifests** — ensure `marketplace.json` and every `plugin.json` are valid JSON and that referenced agent paths exist.
- **Skill scripts** — skills that bundle executable scripts can be exercised directly, e.g. the `generate-feature-package` scaffold script supports a dry run:
  ```bash
  node "plugins/nextjs/skills/generate-feature-package/scripts/scaffold-feature.mjs" <feature-name> --dry-run
  ```
- **End-to-end** — install the marketplace locally (`/plugin marketplace add JanSzewczyk/claude-plugins`) and invoke the skill/agent in a real Claude Code session.

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
| **nextjs-react**       | React & Next.js full-stack development     | frontend-expert, nextjs-backend-engineer             | react-19-compiler, server-actions, tailwind-css-4, t3-env-validation, structured-logging, toast-notifications, error-handling, design-system-component, szum-tech-design-system, generate-feature-package |
| **testing**            | Testing strategies & QA                    | testing-strategist, storybook-test-architect         | storybook-testing, builder-factory, api-test, accessibility-audit, playwright-cli, unit-testing                                                                                                       |
| **code-quality**       | Code review, performance & maintenance     | code-reviewer, performance-analyzer, library-updater | performance-optimization, repository-documentation, update-deps                                                                                                                                       |
| **firebase**           | Firebase & DB architecture                 | database-architect                                   | firebase-firestore, db-migration                                                                                                                                                                     |
| **product-management** | PRD/TDD orchestration & agent coordination | product-owner                                        | prd-spec                                                                                                                                                                                              |
| **ai-tools**           | AI tool integrations & automation          | —                                                    | notebooklm, youtube-scraper                                                                                                                                                                           |

## How registration works (the big picture)

Three manifest layers must stay in sync when adding capabilities:

1. **`.claude-plugin/marketplace.json`** — lists every plugin with its `source` path. A new *plugin* must be added here; new agents/skills inside an existing plugin do **not** touch this file.
2. **`plugins/<name>/plugin.json`** — `agents` is an explicit array of relative `.md` paths (each new agent must be added). `skills` is a **directory glob** (`"./skills/"`), so a new skill is auto-discovered just by creating its folder — no manifest edit needed.
3. **Documentation** — the root `README.md`, the per-plugin `README.md`, and this file's Plugins table all enumerate capabilities by hand; update them when adding an agent or skill. Use `/repository-documentation` to regenerate the READMEs.

## Conventions

- Plugin names use kebab-case; skill folder names are kebab-case and become the `/slash-command`.
- Agent definitions are Markdown (`.md`) with YAML frontmatter: `name`, `version`, `description`, `tools`, `model` (defaults to `sonnet`), and optionally `skills`, `related-agents`, `permissionMode`, `hooks`, `color`.
- Skill directories contain `SKILL.md` as the entry point (with `name`, `description`, `allowed-tools`, `argument-hint` frontmatter) plus optional supporting files (`examples.md`, `patterns.md`, `references/`, `templates/`, `scripts/`).
- All paths in manifests are relative to the plugin directory.
- Skills target **Next.js 15+**, **React 19+**, **TypeScript 5.7+** unless the skill's `SKILL.md` says otherwise.

## Validation & testing

There is no automated test suite. To validate changes:

- **Manifests** — ensure `marketplace.json` and every `plugin.json` are valid JSON and that referenced agent paths exist.
- **Skill scripts** — skills that bundle executable scripts can be exercised directly, e.g. the `generate-feature-package` scaffold script supports a dry run:
  ```bash
  node "plugins/nextjs-react/skills/generate-feature-package/scripts/scaffold-feature.mjs" <feature-name> --dry-run
  ```
- **End-to-end** — install the marketplace locally (`/plugin marketplace add JanSzewczyk/claude-plugins`) and invoke the skill/agent in a real Claude Code session.

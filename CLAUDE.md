# Claude Plugins Repository

This repository contains Claude Code skills and agents shared via the Szum-Tech marketplace.

## Structure

```
.claude-plugin/
  marketplace.json              # Marketplace manifest listing all plugins
plugins/
  <plugin-name>/
    plugin.json                 # Plugin metadata (name, description, agents, skills)
    agents/                     # Agent definitions (.md files with frontmatter)
    skills/                     # Skill directories (SKILL.md + supporting docs)
```

## Plugins

| Plugin                 | Description                                | Agents                                               | Skills                                                                                                                                                                          |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **nextjs-react**       | React & Next.js full-stack development     | frontend-expert, nextjs-backend-engineer             | react-19-compiler, server-actions, tailwind-css-4, t3-env-validation, structured-logging, toast-notifications, error-handling, design-system-component, szum-tech-design-system |
| **testing**            | Testing strategies & QA                    | testing-strategist, storybook-test-architect         | storybook-testing, builder-factory, api-test, accessibility-audit, playwright-cli, unit-testing                                                                                 |
| **code-quality**       | Code review, performance & maintenance     | code-reviewer, performance-analyzer, library-updater | performance-optimization                                                                                                                                                        |
| **firebase**           | Firebase & DB architecture                 | database-architect                                   | firebase-firestore, db-migration                                                                                                                                                |
| **product-management** | PRD/TDD orchestration & agent coordination | product-owner                                        | prd-spec                                                                                                                                                                        |
| **ai-tools**           | AI tool integrations & automation          | —                                                    | notebooklm, youtube-scraper                                                                                                                                                     |

## Conventions

- Plugin names use kebab-case
- Agent definitions are Markdown files (`.md`) with YAML frontmatter (name, version, model, skills, tools, hooks)
- Skill directories contain `SKILL.md` as the main entry plus supporting docs (`examples.md`, `patterns.md`, etc.)
- Each plugin has a `plugin.json` manifest listing its agents and skills with relative paths
- All paths in manifests are relative to the plugin directory

---
title: Keep plugin.json in .claude-plugin/ and every component at the plugin root
summary: The manifest is .claude-plugin/plugin.json; skills/, agents/ and hooks/ sit beside .claude-plugin/, never in it.
impact: critical
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

Save the manifest at `<plugin>/.claude-plugin/plugin.json`. Put `skills/`, `agents/`, `commands/`, `hooks/`, `.mcp.json` and every other component at the plugin root. Only `plugin.json` belongs inside `.claude-plugin/`.

## Why

A `plugin.json` beside `skills/` may be ignored at install, and its `dependencies`, `displayName` and `agents` list go with it. A component folder inside `.claude-plugin/` never loads. SchemaStore also matches only `**/.claude-plugin/plugin.json`, so editors give no validation for a root manifest.

## Incorrect

```text
my-plugin/
  plugin.json
  .claude-plugin/skills/hello/SKILL.md
```

## Correct

```text
my-plugin/
  .claude-plugin/plugin.json
  skills/hello/SKILL.md
```

---
title: Put hooks and MCP servers in the plugin, never in plugin agent frontmatter
summary: Plugin agents ignore permissionMode, hooks, mcpServers and initialPrompt; the plugin-level files are what load.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

Declare hooks in `hooks/hooks.json` (top-level `"hooks"` key) and MCP servers in `.mcp.json` at the plugin root. In a plugin agent's frontmatter use only the keys Claude Code reads for plugin agents.

## Why

Claude Code drops `permissionMode`, `hooks`, `mcpServers` and `initialPrompt` from agents shipped in a plugin, so they promise behaviour that never happens.

## Incorrect

```text
agents/reviewer.md
---
name: reviewer
hooks: { PostToolUse: … }
---
```

## Correct

```text
hooks/hooks.json
{ "hooks": { "PostToolUse": [ … ] } }
```

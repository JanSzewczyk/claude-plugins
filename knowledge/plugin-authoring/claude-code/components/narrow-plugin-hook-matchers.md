---
title: Narrow every plugin hook's matcher to the tools and events it is for
summary: Plugin hooks fire on every matching event once the plugin loads, not only while its skills run.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

Give each `PreToolUse`/`PostToolUse` hook in `hooks/hooks.json` a `matcher` that names only the tools it handles, and exit early in the script for inputs that are not its concern.

## Why

A hook with a broad matcher runs on every edit or command in every session that has the plugin enabled, slowing or blocking work the plugin has nothing to do with.

## Incorrect

```json
{ "PostToolUse": [{ "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/lint.sh\"" }] }] }
```

## Correct

```json
{ "PostToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/lint.sh\"" }] }] }
```

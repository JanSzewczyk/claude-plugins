---
title: Run plugin hook scripts in exec form, or double-quote ${CLAUDE_PLUGIN_ROOT}
summary: An unquoted plugin path splits on spaces in a shell-form hook, so the script never runs on that machine.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

Reference bundled files as `${CLAUDE_PLUGIN_ROOT}/...`. Prefer exec form (`command` plus `args`), where each element is one argument; in shell form wrap the path in double quotes.

## Why

The install directory can contain spaces, and an unquoted path breaks into several words, so the hook fails only for some users; `claude plugin validate` warns about it.

## Incorrect

```json
{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh" }
```

## Correct

```json
{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/format.sh\"" }
```

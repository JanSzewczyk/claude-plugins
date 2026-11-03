---
title: Read plugin files from CLAUDE_PLUGIN_ROOT and write state to CLAUDE_PLUGIN_DATA
summary: The install directory changes on every update; state written there is lost.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

Address bundled scripts and files through `${CLAUDE_PLUGIN_ROOT}` (or `${CLAUDE_SKILL_DIR}` inside a skill). Write caches, logs and anything that must survive an update to `${CLAUDE_PLUGIN_DATA}`. In hooks prefer the exec form with `args`, or wrap the variable in double quotes.

## Why

`${CLAUDE_PLUGIN_ROOT}` points at the cached copy of one version, which is replaced on update and removed later, so state kept there disappears. An unquoted path breaks as soon as it contains a space.

## Incorrect

```json
{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/scripts/run.sh --log ${CLAUDE_PLUGIN_ROOT}/cache.log" }
```

## Correct

```json
{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/run.sh\" --log \"${CLAUDE_PLUGIN_DATA}/cache.log\"" }
```

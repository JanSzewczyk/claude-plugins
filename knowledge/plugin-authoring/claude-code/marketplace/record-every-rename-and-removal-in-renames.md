---
title: Record every plugin rename and removal in the append-only renames map
summary: renames migrates existing installs; without it they fail with not found in marketplace.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/host-marketplace]
---

## Rule

When a plugin's `name` changes, map the old name to the new one in the top-level `renames` of `marketplace.json`; when a plugin is removed, map it to `null`. Never edit or delete an existing key: on a second rename add a new one.

## Why

Users with the old name enabled get `Plugin "<name>" not found in marketplace` instead of the one-time `Renamed to …` migration, and an edited chain stops resolving from the oldest name.

## Incorrect

```json
{ "plugins": [{ "name": "code-formatter", "source": "./plugins/code-formatter" }] }
```

## Correct

```json
{
  "plugins": [{ "name": "code-formatter", "source": "./plugins/code-formatter" }],
  "renames": { "formatter": "code-formatter", "legacy-linter": null }
}
```

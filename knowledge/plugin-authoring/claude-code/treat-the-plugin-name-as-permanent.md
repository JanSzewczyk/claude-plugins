---
title: Treat a published plugin's name as permanent and relabel it with displayName
summary: Installs, settings and configuration are keyed by name; a renamed plugin is a different plugin to every user.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/publish, https://code.claude.com/docs/en/plugins/host-marketplace]
---

## Rule

Choose the kebab-case `name` once, before the first release, and keep it. Change what users see with `displayName`. When the name must change, rename the marketplace entry and `plugin.json` together and add the old name to the marketplace's `renames` map in the same change.

## Why

Existing installs fail with `Plugin "<name>" not found in marketplace` the moment the old name disappears, because `enabledPlugins` and `pluginConfigs` still hold it.

## Incorrect

```json
// plugin.json, after release
{ "name": "code-formatter-pro" }
// marketplace.json: no renames entry for "code-formatter"
```

## Correct

```json
// plugin.json
{ "name": "code-formatter", "displayName": "Code Formatter Pro" }
```

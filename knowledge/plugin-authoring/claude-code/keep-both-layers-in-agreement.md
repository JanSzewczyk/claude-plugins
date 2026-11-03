---
title: Keep name, version and dependencies identical in plugin.json and the marketplace entry
summary: Two surfaces read two files; a value set in both must match, or install and browse disagree.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugin-marketplaces]
---

## Rule

When a value is set in both `.claude-plugin/plugin.json` and the plugin's entry in `marketplace.json`, keep it identical: `name`, `version`, `author`, `license` and `dependencies`. Prefer setting `version` in `plugin.json` only.

## Why

`plugin.json` wins for `version` at install, and `claude plugin tag` refuses a mismatch. Different names make `install <manifest-name>` fail with `not found in marketplace`. The browse view reads the entry, the installed view reads the manifest, so drift shows two different plugins.

## Incorrect

```json
// marketplace.json
{ "name": "formatter", "source": "./plugins/formatter", "version": "1.0.0" }
// plugins/formatter/.claude-plugin/plugin.json
{ "name": "code-formatter", "version": "1.1.0" }
```

## Correct

```json
// marketplace.json
{ "name": "formatter", "source": "./plugins/formatter" }
// plugins/formatter/.claude-plugin/plugin.json
{ "name": "formatter", "version": "1.1.0" }
```

---
title: Set description and display fields on the entry when the plugin source is remote
summary: Before install Claude Code reads plugin.json only for relative-path entries, so a remote one shows blank.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/create-marketplace]
---

## Rule

For an entry whose `source` is `github`, `url`, `git-subdir`, `npm`, `archive` or `command`, write `description`, and where you use them `displayName`, `author`, `homepage`, `license` and `keywords`, on the marketplace entry itself.

## Why

The `/plugin` browser shows a remote plugin with no description or author, because its `plugin.json` is fetched only when someone installs it.

## Incorrect

```json
{ "name": "formatter", "source": { "source": "github", "repo": "your-org/formatter" } }
```

## Correct

```json
{ "name": "formatter", "description": "Format code on save", "source": { "source": "github", "repo": "your-org/formatter" } }
```

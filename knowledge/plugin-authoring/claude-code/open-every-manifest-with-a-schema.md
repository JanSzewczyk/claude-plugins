---
title: Open every plugin.json and marketplace.json with a SchemaStore $schema
summary: $schema gives editor validation and autocomplete; Claude Code ignores it at load, so it costs nothing.
impact: low
applies: [claude-code]
sources: [https://www.schemastore.org/claude-code-plugin-manifest.json]
---

## Rule

Make `$schema` the first key: `https://www.schemastore.org/claude-code-plugin-manifest.json` in `plugin.json` and `https://www.schemastore.org/claude-code-marketplace.json` in `marketplace.json`.

## Why

Without it a typo such as `"agent"` for `"agents"` is stripped silently at load and only `claude plugin validate` would notice. A guessed URL that returns 404 gives no help either, so use the published ones.

## Incorrect

```json
{
  "name": "my-plugin"
}
```

## Correct

```json
{
  "$schema": "https://www.schemastore.org/claude-code-plugin-manifest.json",
  "name": "my-plugin"
}
```

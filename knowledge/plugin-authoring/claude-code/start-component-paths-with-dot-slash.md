---
title: Start every component path with ./ relative to the plugin root
summary: Paths in a manifest are relative to the plugin root, start with ./, use forward slashes and never contain ..
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

Write every component path in `plugin.json` and every relative `source` in `marketplace.json` as `./…`, relative to the plugin (or marketplace) root, with forward slashes. Reference files at run time through `${CLAUDE_PLUGIN_ROOT}`.

## Why

`commands/foo.md` fails validation, `..` is rejected as path traversal, and a backslash path is rejected on macOS and Linux. An absolute path breaks once the plugin is copied into the cache.

## Incorrect

```json
{ "agents": ["agents/reviewer.md"], "hooks": "../shared/hooks.json" }
```

## Correct

```json
{ "agents": ["./agents/reviewer.md"], "hooks": "./hooks/hooks.json" }
```

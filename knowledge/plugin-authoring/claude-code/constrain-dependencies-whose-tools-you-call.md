---
title: Give a version range to every dependency whose skills or tools your plugin calls
summary: An unconstrained dependency moves to every release, so one rename breaks your plugin for everyone who updates.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/dependencies]
---

## Rule

Declare a dependency whose skills, agents or MCP tools you call in the object form with a `version` range you have tested, such as `~2.1.0`. Widen the range only after testing the newer release, in a new version of your plugin.

## Why

A bare name follows whatever the marketplace publishes: the next release that renames a tool you call breaks your plugin on update, with no change on your side.

## Incorrect

```json
"dependencies": ["secrets-vault"]
```

## Correct

```json
"dependencies": [{ "name": "secrets-vault", "version": "~2.1.0" }]
```

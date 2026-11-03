---
title: Tag a release for every version another plugin's dependency range points at
summary: Dependency ranges resolve against <plugin>--v<version> git tags, not against plugin.json.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/dependencies]
---

## Rule

When a plugin is a dependency with a version range, tag each release with `claude plugin tag <plugin-dir>`, which creates `<plugin>--v<version>`. Never let two plugins depend on each other; drop the preload instead.

## Why

A range with no tag in range fails install with `has no git tag satisfying`, or leaves a relative-path plugin disabled. Dependencies install automatically, so a cycle installs both plugins whenever either is chosen.

## Incorrect

```text
"dependencies": [{ "name": "testing", "version": "^3.0.0" }]
git tag --list 'testing--v*'   # nothing
```

## Correct

```text
"dependencies": [{ "name": "testing", "version": "^3.0.0" }]
claude plugin tag plugins/testing   # Created tag testing--v3.0.0
```

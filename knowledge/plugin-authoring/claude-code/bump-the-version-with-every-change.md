---
title: Bump the plugin version in every change that touches the plugin
summary: A pinned version keeps users on the cached copy until the string changes, however many commits land.
impact: critical
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/loading]
---

## Rule

When a change touches anything under a plugin (skill, agent, hook, manifest), raise its `version` by semver in the same change: patch for wording and fixes, minor for a new skill, agent or capability, major for a removal or rename. To let users follow commits instead, leave `version` out of both layers.

## Why

Claude Code caches a plugin by its version, and `claude plugin update` reports `already at the latest version` while the string is unchanged. A forgotten bump means the fix never reaches anyone who installed the plugin.

## Incorrect

```text
skills/hello/SKILL.md   edited
.claude-plugin/plugin.json   "version": "1.2.0"   (unchanged)
```

## Correct

```text
skills/hello/SKILL.md   edited
.claude-plugin/plugin.json   "version": "1.2.1"
```

---
title: Raise a changed plugin's version before merge, on the maintainer's say-so
summary: A pinned version keeps users on the cached copy until it changes; bump once on request, and let CI catch a miss.
impact: critical
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/loading]
---

## Rule

A pull request that touches anything under a plugin (skill, agent, hook, manifest) must raise that plugin's `version` by semver before it merges: patch for wording and fixes, minor for a new skill, agent or capability, major for a removal or rename. Make the bump as one deliberate step the maintainer asks for, with release tooling that proposes the size from the diff, and fail the pull request in CI when the bump is missing. An agent never edits a version on its own, and a project instruction file never tells it to. To let users follow commits instead, leave `version` out of both layers.

## Why

Claude Code caches a plugin by its version, and `claude plugin update` reports `already at the latest version` while the string is unchanged. A forgotten bump means the fix never reaches anyone who installed the plugin. A bump made automatically after every edit is the opposite failure: the size is a guess made without the whole change in view, and a branch collects a bump per commit.

## Incorrect

```text
skills/hello/SKILL.md   edited
.claude-plugin/plugin.json   "version": "1.2.0"   (unchanged, CI does not check)
CLAUDE.md   "after every change, bump the version without being asked"
```

## Correct

```text
skills/hello/SKILL.md   edited
.claude-plugin/plugin.json   "version": "1.2.1"   (bumped when the maintainer ran the release tool)
CI   fails the pull request while the version is still 1.2.0
```

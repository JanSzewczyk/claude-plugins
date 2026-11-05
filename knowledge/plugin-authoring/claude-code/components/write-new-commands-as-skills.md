---
title: Write new slash commands as skills under skills/, not as commands/ files
summary: Skills supersede commands, run by the same name and can carry references, scripts and templates.
impact: low
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

Add each new command as `skills/<name>/SKILL.md`. Keep `commands/` only for files moved unchanged from a `.claude/commands/` setup.

## Why

A `commands/` file cannot bundle supporting files and is the legacy form, so it has to be migrated the first time it grows.

## Incorrect

```text
commands/deploy.md
```

## Correct

```text
skills/deploy/SKILL.md
skills/deploy/references/environments.md
```

---
title: Put instructions a plugin needs in a skill, not a CLAUDE.md inside the plugin
summary: A CLAUDE.md at the plugin root is never loaded as context.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

Ship guidance the model needs as a skill (`user-invocable: false` for background knowledge agents preload). Keep project instructions in the project's own `CLAUDE.md`, which a setup skill can write.

## Why

`claude plugin validate` warns about a plugin-root `CLAUDE.md` because nothing reads it: the instructions in it never reach a session.

## Incorrect

```text
my-plugin/CLAUDE.md   "Always run the formatter after editing"
```

## Correct

```text
my-plugin/skills/format-rules/SKILL.md   user-invocable: false
```

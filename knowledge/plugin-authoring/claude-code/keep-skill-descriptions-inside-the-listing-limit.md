---
title: Keep a skill description inside the 1,536-character listing limit
summary: The listing cuts description + when_to_use at 1,536 characters; the rest never reaches the router.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/skills]
---

## Rule

Write the description as what the skill does, when to use it with real trigger phrases, and what it is not for, in at most about 1,000 characters. Move detail into the body.

## Why

The skill listing truncates `description` plus `when_to_use` at 1,536 characters, so the trigger phrases or the `NOT for` clause at the end are the first to be lost, and the skill fires on the wrong requests or not at all.

## Incorrect

```text
description: <1,700 characters of workflow detail, then the trigger phrases, then NOT for …>
```

## Correct

```text
description: <what it does in one sentence>. Use when <trigger phrases>. NOT for <neighbouring skills>.
```

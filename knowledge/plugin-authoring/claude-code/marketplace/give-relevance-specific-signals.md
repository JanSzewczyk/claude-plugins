---
title: Give a plugin's relevance block specific signals, with cwd when it belongs to a directory
summary: Suggestions show only a few times per user, so a broad signal spends them where the plugin does not help.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/relevance]
---

## Rule

Prefer `filesRead` globs on a file type and `manifestDeps` on your SDK over broad patterns; add `cwd` when the plugin belongs to a known directory, and pair `cli` with a file or directory signal. Stay within each signal's limits and run `claude plugin validate` before pushing.

## Why

A signal that matches everywhere uses up the user's few suggestions on sessions where the plugin is irrelevant, and an over-limit signal invalidates the whole entry so the plugin cannot be installed.

## Incorrect

```json
"relevance": { "signals": { "filesRead": ["**/*"] } }
```

## Correct

```json
"relevance": { "topic": "Terraform", "signals": { "filesRead": ["**/*.tf"], "cli": ["terraform"], "cwd": ["infra"] } }
```

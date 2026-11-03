---
title: List every agent file once the manifest sets agents
summary: `agents`, `commands`, `outputStyles` and `workflows` replace their default folder scan; `skills` only adds to it.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

When `plugin.json` sets `agents` (or `commands`, `outputStyles`, `workflows`), list every file the plugin ships, and add each new one in the same change. `skills` adds to the `skills/` scan, so a new skill folder needs no manifest edit.

## Why

An agent file missing from an explicit `agents` array never loads, and nothing fails: the repo looks right and the agent does not exist at runtime.

## Incorrect

```json
{ "agents": ["./agents/reviewer.md"] }   // agents/tester.md exists too
```

## Correct

```json
{ "agents": ["./agents/reviewer.md", "./agents/tester.md"] }
```

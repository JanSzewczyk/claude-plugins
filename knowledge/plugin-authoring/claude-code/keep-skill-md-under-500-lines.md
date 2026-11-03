---
title: Keep SKILL.md under 500 lines and move reference material into references/
summary: Every body line is paid on each use; reference files load only when the task needs them.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/skills]
---

## Rule

Keep `SKILL.md` to the steps and decisions every run needs, under 500 lines. Put tables, long examples and rare cases in `references/`, linked from the step that needs them with a note on when to open it. Put deterministic work in `scripts/`, which run without being loaded.

## Why

A long `SKILL.md` is loaded whole on every invocation and re-attached after compaction only up to its first 5,000 tokens, so the steps at the end are the ones the model loses.

## Incorrect

```text
SKILL.md   900 lines: steps, every edge case, three full examples
```

## Correct

```text
SKILL.md   180 lines: steps
references/edge-cases.md   opened from step 4 when the input is unusual
```

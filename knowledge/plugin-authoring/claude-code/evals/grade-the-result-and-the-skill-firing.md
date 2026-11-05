---
title: Grade both the result and the skill firing, and add a case that must not trigger
summary: A case that grades only the answer cannot tell whether the plugin produced it or the model already knew.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugin-evals]
---

## Rule

In each eval case give one grader on the outcome (final message or produced file) and one `tool_used` grader on `Skill` with an `input_match` naming the skill. Phrase prompts as a user would, without the skill's name, and add at least one prompt that must not trigger it, graded with `min: 0`, `max: 0` and `arm: both`.

## Why

A case that scores 1.0 with and without the plugin is not passing because of the plugin, and a description that over-triggers goes unnoticed without a negative case.

## Incorrect

```markdown
<!-- evals/review/prompt.md -->
Use /my-plugin:review on this diff.
```

## Correct

```markdown
---
type: tool_used
tool: Skill
input_match: '"skill"\s*:\s*"(?:[\w-]+:)?review"'
---
```

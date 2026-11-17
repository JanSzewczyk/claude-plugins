---
title: Show 🔴/🟡 findings once as ReportFindings cards when the session has the tool
summary: One call after findings are final, fix ends failure_scenario, numbered in short_summary; the rest stays in the table.
impact: medium
sources: []
---

## Rule

When the session has the `ReportFindings` tool, call it once, from the main thread, after the findings are final, with the 🔴 and 🟡 findings that name a file, worst first, at most 32. Number each in `short_summary` as `<n> · <mark> <claim>` so the reply can still say "apply 1 3". Put a concrete input or state and its wrong result in `failure_scenario`, and end it with the fix as a sentence starting `Fix:`, because a card has no other place for it. The reply leaves exactly those findings out of the findings table and keeps the verdict, the scorecard, every finding that is not a card (🔵, no file, past the 32nd) numbered on, `Not checked` and `Next`; the line above `Not checked` counts the findings past the 32nd. A card finding gets a detail block only when its fix needs a diff, and then it counts toward the five. When findings are fixed later in the session, call it again with the same findings and each one's outcome. Without the tool, write the report as usual.

## Why

The app draws the cards beside the reply, so the same findings written out again as a table are read twice, and without the numbers in `short_summary` the `Next` line has nothing to point at. Terminal and headless runs have no such tool, so the text report stays complete without it.

## Incorrect

```markdown
| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🟡 | `SKILL.md:3` | Description never says when to fire | Add the trigger phrases |
```

(sent after `ReportFindings` already drew finding 1 as a card)

## Correct

```markdown
ReportFindings: short_summary "1 · 🟡 Description never says when to fire"

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 2 | 🔵 | `SKILL.md:140` | Filler sentence | Cut it |

**Next:** nothing is applied yet. Reply with the numbers to apply (`1 2`) or `all`.
```

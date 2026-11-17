---
title: Hand 🔴 and 🟡 findings to ReportFindings when available and drop their table rows
summary: One call after the findings are final, numbered in short_summary; the reply keeps verdict, scorecard, 🔵 and Next.
impact: medium
sources: []
---

## Rule

When the session has the `ReportFindings` tool and the findings are tied to files, call it once, from the main thread, after the findings are final, with the 🔴 and 🟡 findings, worst first, at most 32 (say in the reply how many more the report holds). Number each one in `short_summary` (`<n> · <mark> <claim>`, 60 characters or fewer) so the reply can still say "apply 1 3", and put a concrete input or state and its wrong result in `failure_scenario`. Set `verdict: CONFIRMED` only on a finding a verification pass judged, and leave out `level`. Then drop those rows from the findings table: the reply keeps the verdict, the scorecard, the 🔵 rows numbered on after the cards, `Not checked` and `Next`. When findings are fixed later in the session, call it again with the same findings, each with an `outcome`.

## Why

The app draws the cards beside the reply, so the same findings written out again as a table are read twice, and without the numbers in `short_summary` the `Next` line has nothing to point at. Terminal and headless runs have no such tool, so the text report stays complete without it and is written as before.

## Incorrect

```markdown
> ReportFindings called with 4 findings, and the reply repeats all 4 in a table.
```

## Correct

```markdown
> 🟡 **Needs work** · 0 errors · 2 warnings · 1 polish

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 3 | 🔵 | `SKILL.md:140` | Filler sentence | Cut it |

**Next:** cards 1–2 are above. Reply with the numbers to apply (`1 3`) or `all`.
```

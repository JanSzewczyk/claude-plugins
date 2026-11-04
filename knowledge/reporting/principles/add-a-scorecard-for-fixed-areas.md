---
title: Show a scorecard when the audit covers a fixed set of areas
summary: One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line.
impact: medium
---

## Rule

When the audit checks the same areas on every run (categories, plugins, URLs, checklist sections),
put a table right after the verdict with one row per area: the area, its worst mark and its
counts. The skill fixes the rows and their order; an area that was not checked stays in the table
marked ⚪.

## Why

Without a scorecard the reader rebuilds the overall picture from the findings list, and a row that
silently disappears hides an area nobody checked.

## Correct

```markdown
| Area | Status | Found |
| --- | :-: | --- |
| Frontmatter | 🟢 | — |
| Description & routing | 🟡 | 1 warning |
| Bundled files | ⚪ | no scripts or assets |
```

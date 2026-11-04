---
title: List findings in one numbered table, worst first
summary: Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on.
impact: high
---

## Rule

Put every finding in one table ordered by severity, then by location, with the columns `#`, `Sev`,
`Where`, `Problem` and `Fix`, plus any column the skill needs (`By`, `WCAG`). Keep each cell to one
line. Where the surface renders file links, make `Where` a link to the file at the line. Past
fifteen rows, split it into one table per file or area under a small heading, numbering straight
through.

## Why

Findings spread across headings and bullets cannot be scanned or compared, and the numbers are
what let the user answer "apply 1 and 4" instead of quoting the report back.

## Incorrect

```markdown
### Critical Issues

#### 1. Missing label
- **Location:** src/Form.tsx:12
- **Description:** The email input has no label.
- **Fix:** Add a label element.
```

## Correct

```markdown
| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🔴 | `src/Form.tsx:12` | Email input has no accessible name | Add `<label htmlFor="email">` |
```

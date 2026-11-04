---
title: Report a clean run as the heading and one line
summary: When nothing was found, skip the scorecard, the table and any list of what passed.
impact: medium
---

## Rule

When the audit found nothing, the report is its heading and one 🟢 line carrying the tool's
summary as evidence. Leave out the scorecard, the findings table and any list of checks that
passed.

## Why

A clean report padded with every check that passed teaches the reader to skim, and they then skim
the next report, the one with a real finding in it.

## Correct

```markdown
## 🩺 Marketplace doctor · `szum-tech`

> 🟢 **Clean** · 15 plugins · 0 errors · 0 warnings · `✓ 0 errors  ⚠ 0 warnings`
```

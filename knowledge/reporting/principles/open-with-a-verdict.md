---
title: Open an audit report with a verdict line that quotes the tool's own summary
summary: First line is the worst status, the count at each severity, and the checking tool's summary line as evidence.
impact: high
---

## Rule

Start the report with one blockquote: the verdict for the worst finding, the count at each
severity, and the summary line the script or tool printed, quoted verbatim. Call a result clean
only when the tool's own exit code or summary says so.

## Why

A report that opens with details makes the reader scroll to learn whether anything is wrong, and a
"looks clean" written from memory instead of from the tool's output is how a failing check ships.

## Incorrect

```markdown
## Audit results

I went through the skill and found a few things worth looking at.
```

## Correct

```markdown
## 🩺 Skill audit · `react/accessibility-audit`

> 🟡 **Needs work** · 0 errors · 16 warnings · 10 polish
> `0 error(s), 3 warning(s)` · `6 files · 101 body lines · 1116 ≈tokens · 5 references`
```

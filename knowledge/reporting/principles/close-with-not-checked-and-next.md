---
title: Close an audit report with what was not checked and the one next step
summary: A Not checked line names what the run could not see; a Next line says what the user does now.
impact: medium
---

## Rule

End the report with two lines. **Not checked:** what this run could not cover, and the skill or
step that covers it. **Next:** the one action expected from the user, such as the finding numbers
to apply or the command to run. Anything else the reader should know about the run (a fallback,
findings dropped or merged, a cap) goes in a single line just above them.

## Why

A report that is silent about what it skipped reads as a pass for everything, and one that ends
without a next step leaves the user guessing whether anything was already changed.

## Correct

```markdown
**Not checked:** drawing and hotkeys need a live session → run `claude --plugin-dir .`

**Next:** nothing is applied yet. Reply with the numbers to apply (`1 3`) or `all`.
```

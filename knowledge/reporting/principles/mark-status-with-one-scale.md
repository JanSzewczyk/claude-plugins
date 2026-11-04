---
title: Mark every status with the shared five-mark scale
summary: 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike.
impact: high
---

## Rule

Mark status with these five and nothing else: 🔴 broken or blocking, 🟡 costs the user and should
be fixed, 🔵 worth tidying, 🟢 nothing found, ⚪ not checked. Map the tool's own severities onto
them once, in the skill, and use the same marks in the verdict, the scorecard and the findings. The
verdict is the worst mark found.

## Why

When every audit speaks its own dialect (critical, error, serious, warn, note), a reader moving
between reports cannot compare them, and without ⚪ an area that was never checked reads as passed.

## Exceptions

A score with its own published thresholds, such as a Lighthouse category from 0 to 100, keeps
those thresholds and shows them as 🔴, 🟡 and 🟢.

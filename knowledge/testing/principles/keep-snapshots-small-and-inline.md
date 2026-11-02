---
title: Keep snapshots small and inline, for output whose exact text matters
summary: Snapshot error messages, logs or transformed code inline; replace a large snapshot with explicit assertions.
impact: medium
sources: [https://kentcdodds.com/blog/effective-snapshot-testing]
---

## Rule

Snapshot only small output whose exact text matters, such as error messages, logs or transformed code,
and keep the snapshot inline in the test. Replace a large snapshot with explicit assertions.

## Why

A 600-line snapshot states no intent, so when it fails everyone overwrites it and moves on, and a real
regression goes in with the update.

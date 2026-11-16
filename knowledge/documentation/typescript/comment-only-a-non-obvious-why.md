---
title: Comment only a reason the code cannot show
summary: Default to no comment; write one only for a hidden constraint, a subtle invariant or a workaround.
impact: low
applies: [typescript]
sources: []
---

## Rule

Write no comment by default. Add one only when the reason behind the code is not visible in it: a hidden constraint, a subtle invariant, a workaround for a bug elsewhere. Never restate what the code does.

## Why

Comments that narrate the code go stale at the first edit and then contradict it, and their volume hides the few comments that warn about something real.

## Incorrect

```ts
/** Loop over the steps and add up their durations. */
const total = steps.reduce((sum, step) => sum + step.duration, 0);
/** Set the timeout to 30 seconds. */
const TIMEOUT_MS = 30_000;
```

## Correct

```ts
const total = steps.reduce((sum, step) => sum + step.duration, 0);
/** The upstream parser aborts after 25 s; 30 s leaves room for the network round trip. */
const TIMEOUT_MS = 30_000;
```

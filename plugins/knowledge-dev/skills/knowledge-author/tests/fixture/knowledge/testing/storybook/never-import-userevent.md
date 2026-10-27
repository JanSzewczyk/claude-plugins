---
title: Take userEvent from the test function's parameters, never from an import
summary: An imported userEvent bypasses Storybook's instrumentation and breaks interaction timing.
impact: critical
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

Destructure `userEvent`, `canvas`, `canvasElement`, `args` and `step` from the parameters of the
`.test()` or `play` function. Import only `expect`, `fn`, `waitFor` and `screen` from
`storybook/test`.

## Why

An imported `userEvent` is not wired into Storybook's instrumentation, so interactions run outside
its timing and do not show up in the interactions panel. The failures it causes are intermittent
and hard to trace back to the import.

## Incorrect

```ts
import { expect, fn, userEvent } from "storybook/test";

Story.test("Submits the form", async ({ canvas }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
});
```

## Correct

```ts
import { expect, fn } from "storybook/test";

Story.test("Submits the form", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
});
```

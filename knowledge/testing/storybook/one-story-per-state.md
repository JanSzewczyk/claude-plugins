---
title: Make a separate story only for a different state, not for a different test
summary: Different args or mocks make a new story; the same args with several checks make one story with several tests.
impact: medium
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-stories]
---

## Rule

Create a story for each state the component can render, defined by its args or mocks. When two checks
need the same args, attach both as tests to one story. Interaction, keyboard and accessibility are
tests on these stories, never stories of their own.

## Why

A story per check fills the sidebar and the docs with copies of one state, and the copies drift apart
when only some of them get the next prop change.

## Incorrect

```ts
export const SubmitClick = meta.story({ args: { defaultValues: filled } });
export const SubmitKeyboard = meta.story({ args: { defaultValues: filled } });
```

## Correct

```ts
export const FilledForm = meta.story({ args: { defaultValues: filled } });

FilledForm.test("Clicking submit calls onSubmit", async ({ canvas, userEvent, args }) => {});
FilledForm.test("Enter submits the form", async ({ canvas, userEvent, args }) => {});
```

---
title: Group assertions by category, not one test per element
summary: One content test per state, one accessibility test, one test per distinct interaction, rule or callback.
impact: medium
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

Per story state, write one test for the static content, one for accessibility (roles, names,
focus), and one per distinct interaction, validation rule or callback. Wrap a test in `step()` when
it has three or more phases.

## Why

A test per text node multiplies runtime and noise without catching anything the grouped test
would miss. Grouping by category keeps a failure specific enough to point at the cause.

## Incorrect

```ts
Story.test("Shows title", async ({ canvas }) => { await expect(canvas.getByText("Profile")).toBeVisible(); });
Story.test("Shows email", async ({ canvas }) => { await expect(canvas.getByText("a@b.co")).toBeVisible(); });
```

## Correct

```ts
Story.test("Renders all expected content", async ({ canvas }) => {
  await expect(canvas.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(canvas.getByText("a@b.co")).toBeVisible();
});
```

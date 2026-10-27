---
title: Pick getBy, queryBy or findBy by what the assertion expects
summary: getBy* for elements that must be there, queryBy* to assert absence, findBy* for anything that appears later.
impact: high
applies: [typescript, testing-library]
sources: [https://testing-library.com/docs/queries/about/#types-of-queries]
---

## Rule

Use `getBy*` for an element that must already be on screen, `queryBy*` when the assertion is that
it is absent, and `findBy*` (or `waitFor`) for anything that appears after an interaction, a
request or an animation.

## Why

`getBy*` throws before a `not.toBeInTheDocument()` assertion can run, so a negative check written
with it fails for the wrong reason. A `getBy*` on content that renders a tick later fails
intermittently, which reads as a flaky suite rather than a wrong query.

## Incorrect

```ts
await expect(canvas.getByRole("alert")).not.toBeInTheDocument();
await userEvent.click(canvas.getByRole("button", { name: /save/i }));
await expect(canvas.getByText(/saved/i)).toBeVisible();
```

## Correct

```ts
await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
await userEvent.click(canvas.getByRole("button", { name: /save/i }));
await expect(await canvas.findByText(/saved/i)).toBeVisible();
```

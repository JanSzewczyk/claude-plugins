---
title: Give a purely presentational component stories, not invented tests
summary: A card or badge with no behaviour is documented by one story per visual variant; add a test only for real behaviour.
impact: medium
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests]
---

## Rule

For a component that only renders its props (a card, a badge, an avatar), write one story per
visual variant and no `.test()`. Add a test as soon as the component has behaviour: a callback, a
conditional branch, a keyboard interaction or an ARIA state.

## Why

A test that re-reads the text a story was given checks the args, not the component, and doubles the
upkeep of every copy change without ever catching a bug.

## Incorrect

```ts
export const SuccessBadge = meta.story({ args: { intent: "success", label: "Paid" } });
SuccessBadge.test("Renders the label", async ({ canvas }) => {
  await expect(canvas.getByText("Paid")).toBeVisible();
});
```

## Correct

```ts
export const SuccessBadge = meta.story({ args: { intent: "success", label: "Paid" } });
export const WarningBadge = meta.story({ args: { intent: "warning", label: "Overdue" } });
```

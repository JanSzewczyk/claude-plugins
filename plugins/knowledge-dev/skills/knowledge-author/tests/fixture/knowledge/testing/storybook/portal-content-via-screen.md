---
title: Query portal content through screen, not canvas
summary: Dialogs, popovers, tooltips and option lists render into document.body, outside the story root that canvas sees.
impact: high
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

Trigger the interaction through `canvas`, then find the portal content through `screen`, which
queries the whole document. Use `canvas` for everything rendered inside the story root.

## Why

Modals, popovers, tooltips and select option lists are portalled to `document.body`. A `canvas`
query never finds them, so the test fails with "unable to find role dialog" even though the dialog
is plainly on screen.

## Incorrect

```ts
await userEvent.click(canvas.getByRole("button", { name: /open/i }));
const dialog = await canvas.findByRole("dialog");
```

## Correct

```ts
await userEvent.click(canvas.getByRole("button", { name: /open/i }));
const dialog = await screen.findByRole("dialog");
await userEvent.click(screen.getByRole("button", { name: /close/i }));
```

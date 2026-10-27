---
title: Attach independent checks to one story with .test(), not separate play stories
summary: One .test() per independent behaviour; play only for a demo or one flow whose steps depend on each other.
impact: high
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

Write every independent assertion as its own `.test()` on the story that has the right args. Use
`play` only for a demo without assertions, or for one flow whose steps genuinely depend on each
other, grouped with `step()`.

## Why

Separate stories per test multiply `meta.story()` boilerplate and fill the sidebar with copies of
the same state. Assertions packed into one `play` stop at the first failure, so one broken
behaviour hides the result of every check after it.

## Incorrect

```ts
export const SubmitClicked = meta.story({
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
    await expect(args.onSubmit).toHaveBeenCalled();
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
});
```

## Correct

```ts
export const FilledForm = meta.story({ args: { defaultValues: filled } });

FilledForm.test("Clicking submit calls onSubmit", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  await expect(args.onSubmit).toHaveBeenCalledOnce();
});

FilledForm.test("Disables submit while saving", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  await expect(canvas.getByRole("button", { name: /submit/i })).toBeDisabled();
});
```

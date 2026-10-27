---
title: Await every userEvent call and every expect in a story test
summary: A missing await lets the test finish before the interaction or assertion runs, so it passes proving nothing.
impact: critical
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

Put `await` before every `userEvent.*` call and every `expect(...)` in a `.test()` or `play`
function, including assertions inside `step()` and `waitFor()`.

## Why

Without `await` the test function returns before the interaction or assertion settles, so the test
passes while the behaviour it names was never checked, and the failure surfaces later in an unrelated
test.

## Incorrect

```ts
Story.test("Clicking submit calls onSubmit", async ({ canvas, userEvent, args }) => {
  userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  expect(args.onSubmit).toHaveBeenCalledOnce();
});
```

## Correct

```ts
Story.test("Clicking submit calls onSubmit", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  await expect(args.onSubmit).toHaveBeenCalledOnce();
});
```

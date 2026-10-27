---
title: Label the phases of a long story test with step(), and only of a long one
summary: Wrap each phase in step() when a test has three or more (fill, submit, verify); leave short tests flat.
impact: low
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-tests/interaction-testing]
---

## Rule

When a story test or a `play` function has three or more phases, wrap each one in
`await step("<phase>", async () => { ... })`, taking `step` from the test function's parameters.
Keep tests of one or two lines without `step()`.

## Why

Comments do not show in the test output, so a failure in a long flat test points at a line number
instead of the phase that broke; wrapping a two-line test adds nesting and says nothing.

## Incorrect

```ts
FormStory.test("Submits valid data", async ({ canvas, userEvent, args }) => {
  // fill
  await userEvent.type(canvas.getByLabelText(/email/i), "ada@example.com");
  // submit
  await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  // verify
  await expect(args.onSubmit).toHaveBeenCalledOnce();
});
```

## Correct

```ts
FormStory.test("Submits valid data", async ({ canvas, userEvent, args, step }) => {
  await step("Fill the form", async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), "ada@example.com");
  });
  await step("Submit", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  });
  await step("Verify", async () => {
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  });
});
```

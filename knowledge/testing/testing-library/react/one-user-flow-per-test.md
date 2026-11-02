---
title: Write one test per user flow, with all its steps and assertions
summary: One Arrange, then as many Act and Assert as the flow needs; one assertion per test is an outdated rule.
impact: medium
applies: [typescript, react, testing-library]
sources: [https://kentcdodds.com/blog/write-fewer-longer-tests]
---

## Rule

Cover one manual tester's flow in one test: one Arrange, then as many Act and Assert steps as the flow
needs. Render the component once per test, apart from `rerender` when a prop change is the point.

## Why

Five one-assertion tests render the same component five times and split a flow so that no test proves it
works from start to finish. Test runners already show exactly which assertion failed.

## Incorrect

```tsx
test("shows a spinner", async () => {
  render(<Profile />);
  expect(screen.getByRole("progressbar")).toBeVisible();
});
test("shows the name", async () => {
  render(<Profile />);
  expect(await screen.findByRole("heading", { name: "Ann" })).toBeVisible();
});
```

## Correct

```tsx
test("loads and shows the profile", async () => {
  render(<Profile />);
  expect(screen.getByRole("progressbar")).toBeVisible();
  expect(await screen.findByRole("heading", { name: "Ann" })).toBeVisible();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
```

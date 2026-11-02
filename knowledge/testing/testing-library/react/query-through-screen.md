---
title: Query through screen, not through what render returns
summary: Use screen for every query and take from render only what screen lacks, such as rerender; never name the result wrapper.
impact: medium
applies: [typescript, react, testing-library]
implements: testing/principles/query-like-a-user
sources: [https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Query through `screen`, and debug with `screen.debug()`. Destructure from `render` only what `screen` does
not give, such as `rerender`, and never keep its result in a variable called `wrapper`.

## Why

Queries destructured from `render` have to be threaded through every helper and go stale in long tests,
so test files fill up with plumbing that `screen` makes unnecessary.

## Incorrect

```tsx
const { getByRole } = render(<SignupForm />);
expect(getByRole("button", { name: /sign up/i })).toBeEnabled();
```

## Correct

```tsx
render(<SignupForm />);
expect(screen.getByRole("button", { name: /sign up/i })).toBeEnabled();
```

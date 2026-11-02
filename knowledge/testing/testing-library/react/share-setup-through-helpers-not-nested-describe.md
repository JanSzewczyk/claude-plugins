---
title: Share component test setup through a helper, not nested describe and beforeEach
summary: Keep the file flat with setup inline or from setup(); use before and after hooks only for cleanup and global resources.
impact: medium
applies: [typescript, react, testing-library]
implements: testing/principles/tests-pass-alone-in-any-order
sources: [https://kentcdodds.com/blog/avoid-nesting-when-youre-testing]
---

## Rule

Keep a component test file flat, with data and setup inline or from a `setup()` function that returns what
the test needs. Group tests by file, and use `before*` and `after*` only for cleanup and global resources
such as the MSW server.

## Why

Variables assigned in hooks make the reader trace values through the whole file to learn what one test
does, and an override in a nested block changes tests it does not seem to touch.

## Incorrect

```tsx
let user: UserEvent;
beforeEach(() => {
  user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);
});
describe("when submitted", () => {
  test("calls onSubmit", async () => { /* … */ });
});
```

## Correct

```tsx
function setup() {
  const onSubmit = vi.fn();
  render(<LoginForm onSubmit={onSubmit} />);
  return { user: userEvent.setup(), onSubmit };
}

test("calls onSubmit when submitted", async () => {
  const { user, onSubmit } = setup();
  /* … */
});
```

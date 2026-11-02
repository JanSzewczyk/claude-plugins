---
title: Assert with jest-dom matchers, not by reading DOM properties
summary: toBeDisabled and friends read like the requirement and fail with a useful message; write existence checks out too.
impact: high
applies: [typescript, react, testing-library]
implements: testing/principles/assert-what-the-user-perceives
sources: [https://kentcdodds.com/blog/common-mistakes-with-react-testing-library, https://testing-library.com/docs/ecosystem-jest-dom]
---

## Rule

Assert with `@testing-library/jest-dom` matchers instead of reading DOM properties. Write an existence
check out as `expect(screen.getByRole(...)).toBeInTheDocument()`.

## Why

A failing `expect(button.disabled).toBe(true)` reports only "expected true, received false", with no
element and no hint of intent, so the failure takes longer to read than the fix.

## Incorrect

```tsx
const button = screen.getByRole("button", { name: /save/i });
expect(button.disabled).toBe(true);
```

## Correct

```tsx
expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
```

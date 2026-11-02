---
title: Leave cleanup to the test setup, not to each test file
summary: A global afterEach makes cleanup automatic; without Vitest globals, register it once in the setup file.
impact: medium
applies: [typescript, react, testing-library, vitest]
sources: [https://testing-library.com/docs/react-testing-library/setup/#auto-cleanup-in-vitest, https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Write no `cleanup` call in a test file. Under a runner with a global `afterEach` it happens automatically;
under Vitest without `globals: true`, register it once in the setup file.

## Why

A cleanup line copied into every file does nothing where cleanup is automatic, and where it is not, the
file that forgets it leaks a mounted tree into the next test.

## Incorrect

```tsx
// invoice-list.test.tsx
afterEach(cleanup);

test("lists invoices", () => {
  render(<InvoiceList invoices={invoices} />);
});
```

## Correct

```tsx
// vitest.setup.ts, only when globals is off
afterEach(() => {
  cleanup();
});
```

---
title: Render the full component tree, with no shallow rendering or mocked children
summary: Shallow rendering and mocked children cut components off from each other, so their integration goes untested.
impact: high
applies: [typescript, react, testing-library]
implements: testing/strategy/principles/test-only-what-the-two-users-touch
sources: [https://kentcdodds.com/blog/why-i-never-use-shallow-rendering, https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Render the component with `render()` and let its whole subtree mount. Keep child components and React's
own hooks real.

## Why

With a child stubbed out, a change that breaks it breaks the app but not the test, and the few
milliseconds saved are a poor trade for that confidence.

## Incorrect

```tsx
vi.mock("./invoice-row", () => ({ InvoiceRow: () => <li>row</li> }));

test("lists invoices", () => {
  render(<InvoiceList invoices={invoices} />);
  expect(screen.getAllByText("row")).toHaveLength(invoices.length);
});
```

## Correct

```tsx
test("lists invoices", () => {
  render(<InvoiceList invoices={invoices} />);
  expect(screen.getAllByRole("listitem")).toHaveLength(invoices.length);
});
```

## Exceptions

A child that does something a test cannot run may get an explicit mock, under the same bar as any other
mock.

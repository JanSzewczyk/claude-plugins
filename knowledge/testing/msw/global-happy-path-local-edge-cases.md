---
title: Keep the happy path in global handlers, and put edge cases in the test that needs them
summary: Errors and edge cases go in the test through server.use(); resetHandlers after each test removes them.
impact: medium
applies: [typescript, msw]
sources: [https://kentcdodds.com/blog/stop-mocking-fetch, https://github.com/mswjs/msw/blob/main/src/node/setup-server-common.ts]
---

## Rule

Put the happy path in the shared handlers, and override an error or edge case inside its test with
`server.use()`. Call `server.resetHandlers()` after each test.

## Why

Edge cases in the shared handlers separate a test from the response it depends on, and an override with no
reset leaks into the next test, which then fails or passes for the wrong reason.

## Incorrect

```tsx
// handlers.ts: a magic id selects the failure a test in another file wants
http.get("/api/invoices/:id", ({ params }) =>
  params.id === "broken" ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(invoice),
);
```

## Correct

```tsx
test("shows an error when the invoice fails to load", async () => {
  server.use(http.get("/api/invoices/:id", () => new HttpResponse(null, { status: 500 })));
  render(<InvoicePage id="1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/could not load/i);
});
```

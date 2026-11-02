---
title: Fake HTTP in component tests with MSW, not by mocking fetch or the API client
summary: One set of handlers acts as the server, so the real client runs with its URL, method, headers and auth.
impact: high
applies: [typescript, msw]
implements: testing/strategy/principles/mock-only-what-you-cannot-run
sources: [https://kentcdodds.com/blog/stop-mocking-fetch]
---

## Rule

In component and integration tests, fake HTTP with MSW handlers that act like the server, shared between
tests and browser development. Keep `fetch` and your own API client real.

## Why

A mocked `fetch` or API client passes while the real call has a wrong URL, method, header or auth, and each
test ends up reimplementing a piece of the backend.

## Incorrect

```tsx
vi.mock("~/lib/api-client", () => ({ getInvoices: vi.fn().mockResolvedValue(invoices) }));

render(<InvoiceList />);
expect(await screen.findAllByRole("listitem")).toHaveLength(invoices.length);
```

## Correct

```tsx
// handlers.ts, used by the test server and the dev worker
export const handlers = [http.get("/api/invoices", () => HttpResponse.json(invoices))];

render(<InvoiceList />);
expect(await screen.findAllByRole("listitem")).toHaveLength(invoices.length);
```

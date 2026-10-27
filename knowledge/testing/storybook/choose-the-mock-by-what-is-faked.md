---
title: Choose the mock by what is faked
summary: Callback props get fn(), HTTP gets MSW, imported modules get sb.mock() in the preview, context gets decorators.
impact: high
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-stories/mocking-data-and-modules]
---

## Rule

Fake a callback prop with `fn()` in `meta.args`, a request the component sends with MSW handlers in
`parameters.msw`, a module it imports with `sb.mock()` in the Storybook preview file plus `mocked()`
in `beforeEach`, and React context or providers with decorators. Never pass a provider value as a prop
or register a module mock inside a story file.

## Why

A mock of the wrong kind fakes something the component never touches: a `fn()` prop does not stop the
real `fetch`, and `sb.mock()` in a story file runs after the module is loaded, so the story hits the
real dependency.

## Incorrect

```ts
// invoice-list.stories.tsx — the component calls fetch("/api/invoices") itself
sb.mock(import("~/lib/api"));
export const Loaded = meta.story({ args: { fetchInvoices: fn() } });
```

## Correct

```ts
export const Loaded = meta.story({
  parameters: { msw: { handlers: [http.get("/api/invoices", () => HttpResponse.json(invoices))] } },
});
```

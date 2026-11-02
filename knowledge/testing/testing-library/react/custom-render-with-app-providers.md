---
title: Render through a custom render that wraps the app's providers
summary: One render in test-utils adds router, theme, query client and auth; tests import it instead of @testing-library/react.
impact: high
applies: [typescript, react, testing-library]
sources: [https://testing-library.com/docs/react-testing-library/setup/#custom-render]
---

## Rule

Export one `render` from a `test-utils` module that wraps the component in every provider the app has,
such as router, theme, query client and auth. Tests import it from there, not from
`@testing-library/react`.

## Why

Providers wrapped by hand in each test drift from the real app, so a component passes against a tree it
never runs in, and adding a provider means editing every test.

## Incorrect

```tsx
import { render, screen } from "@testing-library/react";

render(
  <QueryClientProvider client={client}>
    <ThemeProvider>
      <InvoiceList />
    </ThemeProvider>
  </QueryClientProvider>,
);
```

## Correct

```tsx
import { render, screen } from "~/test-utils";

render(<InvoiceList />);
```

---
title: Pass server-rendered content into a Client Component as children, not as an import
summary: A client wrapper takes children or slot props; the server parent fills them, so the content stays on the server.
impact: high
applies: [typescript, react, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/server-and-client-components#interleaving-server-and-client-components, https://react.dev/reference/rsc/use-client]
---

## Rule

When a Client Component (a modal, tabs, a collapsible panel) must show server-rendered content, give it a `children` or slot prop and let the Server Component parent pass the content in. Never import a Server Component into a `'use client'` file.

## Why

Everything a `'use client'` file imports becomes client code, so an imported component that reads the database breaks the build or is silently turned into client code with its dependencies shipped to the browser.

## Incorrect

```tsx
"use client";

import { CartItems } from "./cart-items";

export function CartDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  return <Drawer open={isOpen} onOpenChange={setIsOpen}><CartItems /></Drawer>;
}
```

## Correct

```tsx
"use client";

export function CartDrawer({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  return <Drawer open={isOpen} onOpenChange={setIsOpen}>{children}</Drawer>;
}

export async function CartPage() {
  return <CartDrawer><CartItems /></CartDrawer>;
}
```

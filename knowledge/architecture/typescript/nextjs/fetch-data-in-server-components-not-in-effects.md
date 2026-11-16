---
title: Fetch data in a Server Component and pass it down, not in a client effect
summary: The server parent awaits the data and passes it as props; no useEffect plus fetch in a Client Component.
impact: high
applies: [typescript, react, nextjs]
sources: [https://react.dev/reference/rsc/server-components, https://nextjs.org/docs/app/getting-started/fetching-data]
---

## Rule

Load data in the Server Component that renders the view and pass the result to Client Components as props. Do not fetch from a Client Component with `React.useEffect` and state.

## Why

Fetching in a client effect renders an empty or loading screen first, adds a network round trip after hydration and needs an API route that exposes the data, so pages flash and load in a waterfall.

## Incorrect

```tsx
"use client";

export function ProductList() {
  const [products, setProducts] = React.useState<Array<Product>>([]);
  React.useEffect(() => {
    fetch("/api/products").then((response) => response.json()).then(setProducts);
  }, []);
  return <List items={products} />;
}
```

## Correct

```tsx
export async function ProductsPage() {
  const products = await getProducts();
  return <ProductList products={products} />;
}
```

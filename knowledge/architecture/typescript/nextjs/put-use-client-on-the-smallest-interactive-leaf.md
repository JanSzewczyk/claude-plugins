---
title: Put 'use client' on the smallest interactive component, not on its parent
summary: Extract the button, input or toggle into its own client file; the page or layout around it stays on the server.
impact: high
applies: [typescript, react, nextjs]
sources: [https://react.dev/reference/rsc/use-client, https://nextjs.org/docs/app/getting-started/server-and-client-components#reducing-js-bundle-size]
---

## Rule

When part of a component needs interactivity, move that part into its own file with `'use client'` and render it from the server component. Keep the directive on the smallest leaf that needs it.

## Why

`'use client'` pulls the whole file and everything it imports or renders into the client bundle, so a directive on a page or layout ships static markup and its dependencies to the browser and cuts it off from server data.

## Incorrect

```tsx
"use client";

export function ProductPage({ product }: ProductPageProps) {
  const [quantity, setQuantity] = React.useState(1);
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <QuantityPicker value={quantity} onChange={setQuantity} />
    </article>
  );
}
```

## Correct

```tsx
export function ProductPage({ product }: ProductPageProps) {
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <QuantityPicker />
    </article>
  );
}
```

```tsx
"use client";

export function QuantityPicker() {
  const [quantity, setQuantity] = React.useState(1);
  return <NumberInput value={quantity} onChange={setQuantity} />;
}
```

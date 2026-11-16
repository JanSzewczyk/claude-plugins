---
title: Import React as a namespace and reach every API through it
summary: import * as React from "react", then React.useState, React.cache; no default import, no named imports.
impact: medium
applies: [typescript, react]
sources: [https://react.dev/reference/react]
---

## Rule

Import React once per file as `import * as React from "react"` and call every export through the namespace (`React.useState`, `React.cache`, `React.useEffect`). Never use the default import or named imports from `"react"`.

## Why

Mixed import styles make the same hook appear as `useState` in one file and `React.useState` in another, so searches miss call sites and every review re-litigates the style; the namespace form also needs no import edit when a file starts using another React API.

## Incorrect

```tsx
import React, { useState } from "react";
import { cache } from "react";

const getUser = cache(fetchUser);

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## Correct

```tsx
import * as React from "react";

const getUser = React.cache(fetchUser);

function Counter() {
  const [count, setCount] = React.useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

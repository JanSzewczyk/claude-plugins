---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# React Style

Conventions for writing React components and hooks in this project. General TypeScript rules (function declarations, `Array<Type>`, enum const objects, JSDoc comments) live in `typescript.md`.

## React import

Always import React as a namespace: `import * as React from "react"`. Access all React exports through the namespace (e.g. `React.cache`, `React.useState`, `React.useEffect`). Never use default import and never import React members as named imports.

```typescript
// ✓
import * as React from "react";

React.cache(fn);
React.useState(0);
React.useEffect(() => { ... }, []);

// ✗
import React from "react";
import React, { cache, useState } from "react";
import { cache } from "react";
```

## Conditional rendering

Always use the ternary operator for conditional rendering. Never use `&&` short-circuit.

```tsx
// ✓
{condition ? <Component /> : null}

// ✗
{condition && <Component />}
```

**Why:** `&&` with falsy non-boolean values (e.g. `0`, `""`) renders the value itself instead of nothing. The ternary is always explicit and safe.

This applies to all conditional expressions in JSX — single elements, fragments, and inline text.

```tsx
// ✓
{items.length > 0 ? <List items={items} /> : null}
{error ? <p className="text-error">{error}</p> : null}
{isActive ? "Active" : null}

// ✗
{items.length > 0 && <List items={items} />}
{error && <p className="text-error">{error}</p>}
```

## List keys in `map`

Never use the array index as the `key` of components rendered inside `map`. Always use a stable, unique value derived from the data (e.g. an `id`).

```tsx
// ✓
{items.map((item) => (
  <Item key={item.id} item={item} />
))}

{entries.map((entry) => (
  <Entry key={entry.slug} entry={entry} />
))}

// ✗
{items.map((item, index) => (
  <Item key={index} item={item} />
))}
```

**Why:** index keys break React's reconciliation when the list is reordered, filtered, or has items inserted/removed — leading to stale state, wrong DOM reuse, and subtle rendering bugs. If the data has no natural unique field, derive a stable key from its contents or attach a generated id when the data is created — never fall back to the index.

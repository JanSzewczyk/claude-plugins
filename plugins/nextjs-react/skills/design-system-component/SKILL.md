---
name: design-system-component
description: >
  Load when creating or modifying components in a React + TypeScript + Tailwind CSS + CVA
  design system. Covers file structure, types, styles, context, store, barrel exports,
  constants, utils, and Storybook stories.
---

# Design System Component Guidelines

Stack: **React + TypeScript + Tailwind CSS + CVA**. Radix UI optional — use when available.
Check existing components first to confirm path aliases and `cn()` location.

---

## File structure

All file names: **kebab-case**. Exported symbols: **PascalCase**.

**Simple component:**
```
my-component/
├── index.tsx
├── my-component.tsx
├── my-component.styles.ts   # only when variants exist (see Styles section)
├── my-component.types.ts    # only when CVA-derived types or const enums exist
└── my-component.stories.tsx
```

**Composite / stateful component:**
```
my-component/
├── index.tsx
├── my-component.tsx
├── my-component.styles.ts          # only when variants exist (see Styles section)
├── my-component.types.ts           # only when CVA-derived types or const enums exist
├── my-component.constants.ts
├── my-component.utils.ts
├── my-component.context.tsx
├── my-component-item.context.tsx   # per-item context if needed
├── my-component.store.tsx          # useSyncExternalStore if needed
├── my-component-sub-part.tsx
└── my-component.stories.tsx
```

Only create files that are genuinely needed.

---

## index.tsx — barrel export

```typescript
export * from "./my-component";
export * from "./my-component.types";
export { useMyComponentContext } from "./my-component.context";
export * from "./my-component-item";
export { useMyComponentItemContext } from "./my-component-item.context";
```

- `export *` for component and type files.
- Named re-exports for context hooks — never `export *` from context files.
- Never export internal details (store factory, private helpers, raw `createContext` value).

---

## Types — my-component.types.ts

### Const enum pattern
```typescript
export const MyComponentOrientation = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical"
} as const;
export type MyComponentOrientation = (typeof MyComponentOrientation)[keyof typeof MyComponentOrientation];
```

### CVA-derived variant types
```typescript
import { type VariantProps } from "class-variance-authority";
import { type myComponentVariants } from "./my-component.styles";

type MyVariantsProps = VariantProps<typeof myComponentVariants>;
export type MyComponentSizeType    = NonNullable<MyVariantsProps["size"]>;
export type MyComponentVariantType = NonNullable<MyVariantsProps["variant"]>;
```

`types.ts` holds const enums and CVA-derived variant types only. **Props types always live in the component file.**

---

## Styles — my-component.styles.ts

**Create this file only when the component has variants or conditional style logic.**
If the component has a single, unconditional set of classes, inline them directly in the component using `cn()` — no styles file needed.

- **Create `styles.ts` with `cva`** when the component has `variant`, `size`, or other prop-driven style branches.
- **Inline with `cn()`** in the component file when there is one fixed appearance and no style props.

```typescript
import { cva } from "class-variance-authority";

export const myComponentVariants = cva(
  ["inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-all outline-none",
   "disabled:pointer-events-none disabled:opacity-50",
   "focus-visible:ring focus-visible:ring-ring/50"],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost:   "hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        sm:      "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg:      "h-10 px-6"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);
```

- Always use CSS custom property tokens (e.g. `bg-primary`, `text-muted-foreground`) — never raw hex/rgb/oklch literals.
- Use Tailwind data-attribute variants for state: `data-[state=active]:bg-primary/50`, `data-[disabled]:opacity-50`.

---

## Component implementation — my-component.tsx

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "~/utils";
import { myComponentVariants } from "./my-component.styles";
import type { MyComponentVariantType, MyComponentSizeType } from "./my-component.types";

export type MyComponentProps = React.ComponentProps<"div"> & {
  variant?: MyComponentVariantType;
  size?: MyComponentSizeType;
  asChild?: boolean;
};

export function MyComponent({ asChild, variant, size, className, ...props }: MyComponentProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="my-component"
      className={cn(myComponentVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

Key rules:
- `import * as React from "react"` (namespace import).
- `React.ComponentProps<"element">` for HTML props — never `HTMLAttributes<...>`.
- Always add `data-slot="component-name"`.
- Support `asChild` via `Slot` when the root element could reasonably be swapped.
- Spread `...props` last; merge `className` through `cn()`.
- Use `React.useId()` for stable ARIA-relationship IDs.
- Expose observable state as data attributes: `data-disabled`, `data-state`, `data-orientation`.

---

## Constants — my-component.constants.ts

```typescript
export const MY_COMPONENT_ROOT_NAME    = "MyComponent";
export const MY_COMPONENT_ITEM_NAME    = "MyComponentItem";
export const MY_COMPONENT_TRIGGER_NAME = "MyComponentTrigger";

export const MAP_KEY_TO_FOCUS_INTENT: Record<string, "prev" | "next" | "first" | "last"> = {
  ArrowLeft: "prev", ArrowUp: "prev", ArrowRight: "next", ArrowDown: "next",
  Home: "first", PageUp: "first", End: "last", PageDown: "last"
};
```

---

## Utility functions — my-component.utils.ts

Pure functions, no React imports, no side effects. Use `.ts` not `.tsx`.

```typescript
export function getDataState(value: string | undefined, itemValue: string): "active" | "inactive" {
  return value === itemValue ? "active" : "inactive";
}
export function buildElementId(rootId: string, role: string, value: string): string {
  return `${rootId}-${role}-${value}`;
}
```

---

## Context — my-component.context.tsx

```typescript
import * as React from "react";
import { MY_COMPONENT_ROOT_NAME } from "./my-component.constants";

export interface MyComponentContextValue {
  id: string;
  orientation: "horizontal" | "vertical";
  disabled: boolean;
}

export const MyComponentContext = React.createContext<MyComponentContextValue | null>(null);

export function useMyComponentContext(consumerName: string): MyComponentContextValue {
  const context = React.useContext(MyComponentContext);
  if (!context) throw new Error(`\`${consumerName}\` must be used within \`${MY_COMPONENT_ROOT_NAME}\``);
  return context;
}
```

- Pass `consumerName` into the hook for actionable errors.
- Stabilise the context value with `React.useMemo` inside the provider.
- Export the hook by name from `index.tsx`, not via `export *`.

---

## Store — my-component.store.tsx

Use `useSyncExternalStore` when state must live outside React's render cycle (e.g. child registration map) or when many siblings need independent subscriptions without cascading re-renders.

Pattern: create a store factory (`createStore`) accepting stable `listenersRef` and `stateRef`. Expose `subscribe`, `getState`, `setState`, `notify`. Provide via `StoreContext`. Add a `useStore(selector)` hook for fine-grained subscriptions.

Create the store in the root component — store object identity must never change between renders:
```typescript
const listenersRef = useLazyRef(() => new Set<() => void>());
const stateRef     = useLazyRef<StoreState>(() => ({ items: new Map(), value: defaultValue }));
const store = React.useMemo(() => createStore(listenersRef, stateRef), [listenersRef, stateRef]);
```

---

## Storybook stories — my-component.stories.tsx

Check which CSF version the project uses (CSF 3 vs CSF Next) and follow the same pattern.

Conventions:
- Title: `"Components/MyComponent"`.
- Enable `tags: ["autodocs"]` for automatic docs.
- Define `argTypes` for every variant/size prop.
- Use `satisfies Meta<typeof Component>` — never `as Meta<...>`.
- Tag `"test"` for integration test inclusion; `"experimental"` for exclusion.

---

## Path aliases

Use the `~/` alias (check `tsconfig.json`) for cross-directory imports:
```typescript
import { cn } from "~/utils";
import { useIsomorphicLayoutEffect } from "~/hooks";
```

Use relative `./` for files within the same component directory.

---

## Accessibility checklist

- Use semantic HTML (`button`, `nav`, `dialog`, `ul/li`) as the default root.
- Add `role` only when a non-semantic element is used.
- Wire ARIA: `aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-selected`, `aria-expanded`, `aria-current`, `aria-posinset`, `aria-setsize`.
- Disabled state: set both `disabled` on the element AND `data-disabled` attribute.
- Keyboard navigation: arrow keys, Home/End, Tab/Shift+Tab for all interactive components.

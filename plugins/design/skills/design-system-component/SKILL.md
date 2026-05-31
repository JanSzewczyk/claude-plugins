---
name: design-system-component
description: >
  Use this skill to create or refactor React + TypeScript + Tailwind CSS + CVA components
  following design system conventions. It provides the canonical file structure, per-component
  styles pattern, types, context, store, barrel exports, and Storybook story templates that
  are specific to this codebase. Invoke whenever the user wants to build a new UI component,
  add CVA variants or sub-components, set up component context or store, create barrel exports,
  write component stories, or restructure an existing component directory — even for tasks
  that seem straightforward like "create a Button" or "add a variant", because the skill
  ensures correct file placement and naming conventions.
tags: [react, typescript, tailwind, cva, design-system, components, radix-ui, storybook]
allowed-tools: Read, Write, Edit, Glob, Grep
compatibility:
  dependencies: [react, class-variance-authority, tailwind-css]
examples:
  - Create a new Button component with variants
  - Build a Tabs composite component with trigger and content sub-parts
  - Add a size variant to the existing Card component
  - Refactor the Dialog component to use context and store
  - Create Storybook stories for the Badge component
  - "@design-system-component src/components/ui/data-table/index.tsx"
---

# Design System Component Guidelines

Stack: **React + TypeScript + Tailwind CSS + CVA**. Radix UI optional — use when available.
Check existing components first to confirm path aliases and `cn()` location.

## Usage modes

This skill supports two modes:

### 1. Create from scratch
Describe what component you need — the skill guides file structure, types, styles, etc.

### 2. Refactor existing component (path argument)
Pass a path to the component's entry file:

```
/design-system-component src/components/ui/data-table/index.tsx
```

When invoked with a path argument:
1. **Read** the file (and any files it imports from the same directory)
2. **Analyze** the current structure against the guidelines below
3. **Report** what's missing or misaligned (e.g. styles not split per sub-component, missing `data-slot`, no barrel export, props using `HTMLAttributes` instead of `ComponentProps`)
4. **Propose** the target file structure
5. **Refactor** — split/create files to match the design system patterns

This is useful for components that grew organically in a single file or don't follow the conventions yet.

---

## File structure

All file names: **kebab-case**. Exported symbols: **PascalCase**.

**Simple component** (no sub-parts, no shared state):

```
button/
├── index.tsx
├── button.tsx
├── button.styles.ts           # only when variants exist
├── button.types.ts            # only when CVA-derived types or const enums exist
└── button.stories.tsx
```

**Composite component** (with sub-parts — each sub-component that has variants gets its own styles file):

```
tabs/
├── index.tsx
├── tabs.tsx                    # root component + provider
├── tabs.styles.ts              # root variants (if any)
├── tabs.types.ts               # shared types, const enums, CVA-derived types
├── tabs.constants.ts
├── tabs.utils.ts
├── tabs.context.tsx
├── tabs-trigger.tsx            # sub-component
├── tabs-trigger.styles.ts     # sub-component's own variants
├── tabs-content.tsx            # sub-component
├── tabs-content.styles.ts     # sub-component's own variants
├── tabs-item.context.tsx       # per-item context if needed
├── tabs.store.tsx              # useSyncExternalStore if needed
└── tabs.stories.tsx
```

**Key rule: each component/sub-component that has CVA variants gets its own `.styles.ts` file.** Styles are never shared across sub-components — a `tabs-trigger.styles.ts` defines only `tabsTriggerVariants`, not styles for other parts. This keeps variant logic colocated with the component that uses it.

Only create files that are genuinely needed — if a sub-component has no variants (just fixed classes via `cn()`), it doesn't need a styles file.

---

## When to use which pattern

| Situation | Pattern |
|-----------|---------|
| Single element, no sub-parts | Simple component |
| Multiple related parts (trigger + content, header + body) | Composite component |
| Parent needs to share state with children | Context (`React.createContext`) |
| Many siblings need independent subscriptions without cascading re-renders | Store (`useSyncExternalStore`) |
| Component wraps a Radix primitive | Use Radix, layer CVA + `data-slot` on top |
| No Radix primitive exists | Build from scratch with proper ARIA |

---

## index.tsx — barrel export

```typescript
export * from "./tabs";
export * from "./tabs.types";
export * from "./tabs-trigger";
export * from "./tabs-content";
export { useTabsContext } from "./tabs.context";
export { useTabsItemContext } from "./tabs-item.context";
```

- `export *` for component and type files.
- Named re-exports for context hooks — never `export *` from context files.
- Never export internal details (store factory, private helpers, raw `createContext` value).

---

## Types — my-component.types.ts

### Const enum pattern

```typescript
export const TabsOrientation = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const;
export type TabsOrientation =
  (typeof TabsOrientation)[keyof typeof TabsOrientation];
```

### CVA-derived variant types

```typescript
import { type VariantProps } from "class-variance-authority";
import { type tabsTriggerVariants } from "./tabs-trigger.styles";

type TriggerVariantsProps = VariantProps<typeof tabsTriggerVariants>;
export type TabsTriggerSizeType = NonNullable<TriggerVariantsProps["size"]>;
export type TabsTriggerVariantType = NonNullable<TriggerVariantsProps["variant"]>;
```

`types.ts` holds const enums and CVA-derived variant types only. **Props types always live in the component's own `.tsx` file** — this applies to both root and sub-components.

---

## Styles — per-component `.styles.ts`

**Create a styles file for each component/sub-component that has variants or conditional style logic.**

If a component has a single, unconditional set of classes, inline them directly using `cn()` — no styles file needed.

```typescript
// tabs-trigger.styles.ts — variants for TabsTrigger only
import { cva } from "class-variance-authority";

export const tabsTriggerVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded text-sm font-medium transition-all outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:ring focus-visible:ring-ring/50",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg: "h-10 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

- Always use CSS custom property tokens (e.g. `bg-primary`, `text-muted-foreground`) — never raw hex/rgb/oklch literals.
- Use Tailwind data-attribute variants for state: `data-[state=active]:bg-primary/50`, `data-[disabled]:opacity-50`.
- Name the export `<componentName>Variants` in camelCase matching the component.

---

## Component implementation — my-component.tsx

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "~/utils";
import { tabsTriggerVariants } from "./tabs-trigger.styles";
import type { TabsTriggerVariantType, TabsTriggerSizeType } from "./tabs.types";

export type TabsTriggerProps = React.ComponentProps<"button"> & {
  variant?: TabsTriggerVariantType;
  size?: TabsTriggerSizeType;
  asChild?: boolean;
};

export function TabsTrigger({
  asChild,
  variant,
  size,
  className,
  ...props
}: TabsTriggerProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant, size }), className)}
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
export const TABS_ROOT_NAME = "Tabs";
export const TABS_TRIGGER_NAME = "TabsTrigger";
export const TABS_CONTENT_NAME = "TabsContent";

export const MAP_KEY_TO_FOCUS_INTENT: Record<
  string,
  "prev" | "next" | "first" | "last"
> = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  Home: "first",
  PageUp: "first",
  End: "last",
  PageDown: "last",
};
```

---

## Utility functions — my-component.utils.ts

Pure functions, no React imports, no side effects. Use `.ts` not `.tsx`.

```typescript
export function getDataState(
  value: string | undefined,
  itemValue: string,
): "active" | "inactive" {
  return value === itemValue ? "active" : "inactive";
}
export function buildElementId(
  rootId: string,
  role: string,
  value: string,
): string {
  return `${rootId}-${role}-${value}`;
}
```

---

## Context — my-component.context.tsx

```typescript
import * as React from "react";
import { TABS_ROOT_NAME } from "./tabs.constants";

export interface TabsContextValue {
  id: string;
  orientation: "horizontal" | "vertical";
  disabled: boolean;
}

export const TabsContext =
  React.createContext<TabsContextValue | null>(null);

export function useTabsContext(
  consumerName: string,
): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context)
    throw new Error(
      `\`${consumerName}\` must be used within \`${TABS_ROOT_NAME}\``,
    );
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
const stateRef = useLazyRef<StoreState>(() => ({
  items: new Map(),
  value: defaultValue,
}));
const store = React.useMemo(
  () => createStore(listenersRef, stateRef),
  [listenersRef, stateRef],
);
```

---

## Storybook stories — my-component.stories.tsx

Check which CSF version the project uses (CSF 3 vs CSF Next) and follow the same pattern.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsTrigger, TabsContent } from "./";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Tabs {...args} defaultValue="tab1">
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  ),
};
```

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

# Component File Templates

Copy-paste templates for each file type in a design-system component. The rules these follow live in
[SKILL.md](../SKILL.md); this file is code only. Examples use a `Tabs` composite component.

## index.tsx — barrel export

```typescript
export * from "./tabs";
export * from "./tabs.types";
export * from "./tabs-trigger";
export * from "./tabs-content";
export { useTabsContext } from "./tabs.context";
export { useTabsItemContext } from "./tabs-item.context";
```

## my-component.types.ts

```typescript
// Const enum pattern
export const TabsOrientation = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const;
export type TabsOrientation =
  (typeof TabsOrientation)[keyof typeof TabsOrientation];

// CVA-derived variant types
import { type VariantProps } from "class-variance-authority";
import { type tabsTriggerVariants } from "./tabs-trigger.styles";

type TriggerVariantsProps = VariantProps<typeof tabsTriggerVariants>;
export type TabsTriggerSizeType = NonNullable<TriggerVariantsProps["size"]>;
export type TabsTriggerVariantType = NonNullable<TriggerVariantsProps["variant"]>;
```

## my-component.styles.ts

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
        outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
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

## my-component.tsx — implementation

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

export function TabsTrigger({ asChild, variant, size, className, ...props }: TabsTriggerProps) {
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

## my-component.constants.ts

```typescript
export const TABS_ROOT_NAME = "Tabs";
export const TABS_TRIGGER_NAME = "TabsTrigger";
export const TABS_CONTENT_NAME = "TabsContent";

export const MAP_KEY_TO_FOCUS_INTENT: Record<string, "prev" | "next" | "first" | "last"> = {
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

## my-component.utils.ts

Pure functions, no React imports, no side effects. Use `.ts` not `.tsx`.

```typescript
export function getDataState(
  value: string | undefined,
  itemValue: string,
): "active" | "inactive" {
  return value === itemValue ? "active" : "inactive";
}

export function buildElementId(rootId: string, role: string, value: string): string {
  return `${rootId}-${role}-${value}`;
}
```

## my-component.context.tsx

```typescript
import * as React from "react";
import { TABS_ROOT_NAME } from "./tabs.constants";

export interface TabsContextValue {
  id: string;
  orientation: "horizontal" | "vertical";
  disabled: boolean;
}

export const TabsContext = React.createContext<TabsContextValue | null>(null);

export function useTabsContext(consumerName: string): TabsContextValue {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${TABS_ROOT_NAME}\``);
  }
  return context;
}
```

## my-component.store.tsx

Create a store factory (`createStore`) accepting stable `listenersRef` and `stateRef`, exposing
`subscribe`, `getState`, `setState`, `notify`. Provide via `StoreContext`; add a `useStore(selector)`
hook for fine-grained subscriptions. Create the store in the root component so its identity never
changes between renders:

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

## my-component.stories.tsx

Check which CSF version the project uses (CSF 3 vs CSF Next) and follow the same pattern. CSF 3 shown:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsTrigger, TabsContent } from "./";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
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

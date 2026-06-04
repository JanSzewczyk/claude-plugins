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
allowed-tools: Read, Write, Edit, Glob, Grep
argument-hint: "[optional path to a component entry file to refactor]"
---

# Design System Component Guidelines

Stack: **React + TypeScript + Tailwind CSS + CVA**. Radix UI optional — use when available.
Check existing components first to confirm path aliases and `cn()` location.

This file holds the structure and rules. Copy-paste code for each file type is in the reference:

> - [references/file-templates.md](./references/file-templates.md) — templates for index/types/styles/
>   component/constants/utils/context/store/stories.

## Usage Modes

- **Create from scratch** — describe the component; follow the structure and rules below.
- **Refactor existing** (pass a path, e.g. `/design-system-component src/components/ui/data-table/index.tsx`):
  1. Read the entry file and its same-directory imports.
  2. Compare against the rules below; report what's missing/misaligned (styles not split per
     sub-component, missing `data-slot`, no barrel export, props using `HTMLAttributes` instead of
     `ComponentProps`).
  3. Propose the target structure, then split/create files to match.

## File Structure

File names: **kebab-case**. Exported symbols: **PascalCase**.

**Simple** (no sub-parts, no shared state):

```
button/
├── index.tsx
├── button.tsx
├── button.styles.ts           # only when variants exist
├── button.types.ts            # only when CVA-derived types or const enums exist
└── button.stories.tsx
```

**Composite** (sub-parts — each sub-component with variants gets its own styles file):

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
├── tabs-trigger.styles.ts      # sub-component's own variants
├── tabs-content.tsx
├── tabs-content.styles.ts
├── tabs.store.tsx              # useSyncExternalStore if needed
└── tabs.stories.tsx
```

**Key rule:** each component/sub-component that has CVA variants gets its **own** `.styles.ts` —
styles are never shared across sub-components (`tabs-trigger.styles.ts` defines only
`tabsTriggerVariants`). Only create files that are genuinely needed: a sub-component with no variants
(just fixed `cn()` classes) needs no styles file.

## When to Use Which Pattern

| Situation                                                                  | Pattern                              |
| -------------------------------------------------------------------------- | ------------------------------------ |
| Single element, no sub-parts                                               | Simple component                     |
| Multiple related parts (trigger + content, header + body)                  | Composite component                  |
| Parent needs to share state with children                                  | Context (`React.createContext`)      |
| Many siblings need independent subscriptions without cascading re-renders  | Store (`useSyncExternalStore`)       |
| Component wraps a Radix primitive                                          | Use Radix, layer CVA + `data-slot`   |
| No Radix primitive exists                                                  | Build from scratch with proper ARIA  |

## Rules by File Type

Code templates for each are in [references/file-templates.md](./references/file-templates.md).

**`index.tsx` (barrel)** — `export *` for component and type files; **named** re-exports for context
hooks (never `export *` from a context file); never export internals (store factory, private helpers).

**`*.types.ts`** — holds const enums and CVA-derived variant types **only**. Props types always live in
the component's own `.tsx` file (root and sub-components alike).

**`*.styles.ts`** — one file per component/sub-component that has variants; inline `cn()` classes
directly if the set is single and unconditional. Always use CSS custom-property tokens
(`bg-primary`, `text-muted-foreground`) — never raw hex/rgb/oklch. Use data-attribute variants for
state (`data-[state=active]:...`). Name the export `<componentName>Variants` (camelCase).

**`*.tsx` (component)** — `import * as React from "react"`; type HTML props with
`React.ComponentProps<"el">`, never `HTMLAttributes<...>`; always add `data-slot="component-name"`;
support `asChild` via `Slot` when the root could be swapped; spread `...props` last and merge
`className` through `cn()`; use `React.useId()` for ARIA-relationship IDs; expose observable state as
data attributes (`data-disabled`, `data-state`, `data-orientation`).

**`*.constants.ts`** — SCREAMING_SNAKE_CASE names (component display names, key maps).

**`*.utils.ts`** — pure functions, no React imports, no side effects; `.ts` not `.tsx`.

**`*.context.tsx`** — pass `consumerName` into the hook for actionable errors; stabilise the value with
`React.useMemo` in the provider; export the hook by name from `index.tsx`, never via `export *`.

**`*.store.tsx`** — use `useSyncExternalStore` when state must live outside render (e.g. a child
registration map) or many siblings need independent subscriptions. Create the store in the root
component so its identity never changes (`useMemo` + `useLazyRef`).

**`*.stories.tsx`** — check the project's CSF version (CSF 3 vs CSF Next) and match it. Title
`"Components/MyComponent"`; `tags: ["autodocs"]`; define `argTypes` for every variant/size prop; use
`satisfies Meta<typeof Component>` (never `as`); tag `"test"` for integration-test inclusion,
`"experimental"` for exclusion.

## Path Aliases

Use the `~/` alias (check `tsconfig.json`) for cross-directory imports (`import { cn } from "~/utils"`);
use relative `./` for files within the same component directory.

## Accessibility Checklist

- Use semantic HTML (`button`, `nav`, `dialog`, `ul/li`) as the default root.
- Add `role` only when a non-semantic element is used.
- Wire ARIA: `aria-controls`, `aria-labelledby`, `aria-describedby`, `aria-selected`, `aria-expanded`,
  `aria-current`, `aria-posinset`, `aria-setsize`.
- Disabled state: set both `disabled` on the element AND the `data-disabled` attribute.
- Keyboard navigation: arrow keys, Home/End, Tab/Shift+Tab for all interactive components.

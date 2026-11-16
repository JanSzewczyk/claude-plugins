---
title: Keep each context with its provider and consumer hook in one name.context.tsx file
summary: One React.createContext per context/{name}.context.tsx, together with its Provider component and its use{Name} hook.
impact: medium
applies: [typescript, react]
sources: [https://react.dev/reference/react/createContext, https://react.dev/reference/react/useContext]
---

## Rule

Put each `React.createContext` call in its own `context/{name}.context.tsx` file, together with the provider component that supplies it and the consumer hook that reads it. Export the provider and the hook; keep the context object private to the file.

## Why

A context split across files, or several contexts in one file, lets components read the raw context with `React.useContext` and skip the hook's missing-provider check, so a component rendered outside its provider silently gets the default value.

## Incorrect

```tsx
// hooks/use-filters.ts
export const FiltersContext = React.createContext<Filters | null>(null);
export function useFilters() {
  return React.useContext(FiltersContext);
}
// components/filters-provider.tsx renders <FiltersContext value={...}>
```

## Correct

```tsx
// context/filters.context.tsx
const FiltersContext = React.createContext<Filters | null>(null);

export function FiltersProvider({ filters, children }: FiltersProviderProps) {
  return <FiltersContext value={filters}>{children}</FiltersContext>;
}

export function useFilters() {
  const filters = React.useContext(FiltersContext);
  if (!filters) throw new Error("useFilters must be used inside FiltersProvider");
  return filters;
}
```

---
title: Put a custom hook that creates no context in hooks/use-{name}.ts
summary: Standalone client logic, or a hook built on a context hook, goes to hooks/; a context-defining hook stays in context/.
impact: medium
applies: [typescript, react]
sources: [https://react.dev/learn/reusing-logic-with-custom-hooks]
---

## Rule

Put each custom hook that does not call `React.createContext` in `hooks/use-{name}.ts`: standalone client logic (state, effects, polling, subscriptions) or a hook that builds on a consumer hook from `context/`. A hook that exists to expose its own context lives in that context's `{name}.context.tsx`.

## Why

Hooks defined inside component files or mixed with context files are hard to find and get copied instead of reused, so two components end up with diverging versions of the same polling or subscription logic.

## Incorrect

```tsx
// components/job-status.tsx
function usePolling(url: string, intervalMs: number) {
  const [data, setData] = React.useState<JobStatus | null>(null);
  React.useEffect(() => { /* poll */ }, [url, intervalMs]);
  return data;
}
export function JobStatusBadge({ jobId }: JobStatusBadgeProps) { /* uses usePolling */ }
```

## Correct

```tsx
// hooks/use-polling.ts
export function usePolling(url: string, intervalMs: number) {
  const [data, setData] = React.useState<JobStatus | null>(null);
  React.useEffect(() => { /* poll */ }, [url, intervalMs]);
  return data;
}
```

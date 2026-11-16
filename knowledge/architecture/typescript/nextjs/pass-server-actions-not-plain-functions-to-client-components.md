---
title: Give a Client Component a server action, never a plain function, from the server
summary: A callback that crosses from a Server to a Client Component is a 'use server' function; plain functions cannot cross.
impact: high
applies: [typescript, react, nextjs]
sources: [https://react.dev/reference/rsc/use-server, https://react.dev/reference/rsc/use-client#serializable-types]
---

## Rule

When a Server Component hands a callback to a Client Component, pass a server action imported from a `'use server'` module. Keep any other function inside the Client Component that calls it.

## Why

Props that cross the server-client boundary must be serializable; a plain function is not, so the page fails at runtime with "Functions cannot be passed directly to Client Components", while a server action crosses as a reference the client can call.

## Incorrect

```tsx
export async function BudgetPage({ budgetId }: BudgetPageProps) {
  const budget = await getBudget(budgetId);
  function handleDelete(id: string) {
    return deleteBudget(id);
  }
  return <BudgetCard budget={budget} onDelete={handleDelete} />;
}
```

## Correct

```tsx
import { deleteBudgetAction } from "~/features/budget/server/actions/delete-budget.action";

export async function BudgetPage({ budgetId }: BudgetPageProps) {
  const budget = await getBudget(budgetId);
  return <BudgetCard budget={budget} onDeleteAction={deleteBudgetAction} />;
}
```

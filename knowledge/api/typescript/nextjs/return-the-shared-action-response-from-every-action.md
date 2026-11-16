---
title: Type every server action as the shared ActionResponse<T> or RedirectAction
summary: Import both from ~/lib/action-types; an action returns the union and never throws, except Next.js interrupts.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/error-handling, https://nextjs.org/docs/app/getting-started/updating-data]
---

## Rule

Declare each action's return type as `ActionResponse<T>` when it returns data, or `RedirectAction` when it ends in `redirect()`, both imported from `~/lib/action-types`. Return `{ success: false, error, fieldErrors? }` for every expected failure; never throw, never return bare data, and never declare a local result type.

## Why

When one action throws, another returns raw data and a third its own `{ ok, msg }`, every form needs its own handling, and a thrown error reaches the client as an opaque message the form cannot show.

## Incorrect

```ts
export async function createBudget(input: BudgetInput): Promise<{ ok: boolean; budget?: Budget }> {
  const [error, budget] = await insertBudget(input);
  if (error) throw new Error("Insert failed");
  return { ok: true, budget };
}
```

## Correct

```ts
import type { ActionResponse } from "~/lib/action-types";

export async function createBudget(input: BudgetInput): ActionResponse<Budget> {
  const [error, budget] = await insertBudget(input);
  if (error) return { success: false, error: "Could not create the budget" };
  return { success: true, data: budget, message: "Budget created" };
}
```

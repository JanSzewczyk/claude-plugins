---
title: Put each server action in its own verb-named file that starts with "use server"
summary: features/<feature>/server/actions/create-budget.action.ts holds one action under a file-level "use server" directive.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/directives/use-server]
---

## Rule

Write one exported action per file in the feature's `server/actions/` folder, name the file `{verb}-{domain}.action.ts` (`create-budget.action.ts`, `delete-budget.action.ts`), and make `"use server"` its first statement.

## Why

A `"use server"` that is not the first statement is ignored, so the file's exports are ordinary code; and a shared `actions.ts` grows into a file where every export becomes a public endpoint that nobody reviews one by one.

## Incorrect

```ts
// features/budgets/actions.ts
import { revalidatePath } from "next/cache";
"use server"; // not first: ignored
export async function createBudget(input: BudgetInput) { ... }
export async function deleteBudget(id: string) { ... }
```

## Correct

```ts
// features/budgets/server/actions/create-budget.action.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createBudget(input: BudgetInput): ActionResponse<Budget> { ... }
```

## Exceptions

A page may close over a bound value with an inline action whose body starts with `"use server"` and calls the action from its file.

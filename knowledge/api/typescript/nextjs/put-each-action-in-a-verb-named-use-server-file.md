---
title: Put each server action in its own verb-named file that starts with "use server"
summary: features/<feature>/server/actions/create-budget.ts holds one action under a file-level "use server" directive.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/directives/use-server]
---

## Rule

Write one exported action per file in the feature's `server/actions/` folder, name the file after the verb (`create-budget.ts`, `delete-budget.ts`), and make `"use server"` its first statement. Re-export the actions from the folder's `index.ts`.

## Why

An action declared inline in a component or a file whose directive is not first silently runs as ordinary code or fails to bundle, and a shared `actions.ts` grows into a file where every export becomes a public endpoint nobody reviews one by one.

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
// features/budgets/server/actions/create-budget.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createBudget(input: BudgetInput): ActionResponse<Budget> { ... }
```

## Exceptions

A page may close over a bound value with an inline action whose body starts with `"use server"` and calls the action from its file.

---
title: Re-validate every action input with the schema's safeParse and return its fieldErrors
summary: Client validation is UX; the action parses its input again and answers failures with per-field messages.
impact: critical
applies: [typescript, nextjs, zod@>=4]
sources: [https://zod.dev/basics, https://zod.dev/error-formatting, https://nextjs.org/docs/app/guides/forms]
---

## Rule

Parse every action argument with the feature's Zod schema using `safeParse`, use only `parsed.data` afterwards, and on failure return `{ success: false, error, fieldErrors: z.flattenError(parsed.error).fieldErrors }`. Do this even when the form already validated with the same schema.

## Why

A TypeScript parameter type is erased at runtime, so an action that trusts it writes whatever a crafted request sends: a negative amount, another user's id, or a 10 MB string.

## Incorrect

```ts
export async function createBudget(input: BudgetInput): ActionResponse<Budget> {
  const [error, budget] = await insertBudget(input); // validated only in the browser
  ...
```

## Correct

```ts
export async function createBudget(input: BudgetInput): ActionResponse<Budget> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Check the form", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const [error, budget] = await insertBudget(parsed.data);
  ...
```

## Exceptions

On Zod 3, use `parsed.error.flatten().fieldErrors`.

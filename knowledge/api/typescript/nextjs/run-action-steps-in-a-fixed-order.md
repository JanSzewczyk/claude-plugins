---
title: Run a server action as authenticate, authorize, validate, mutate, revalidate, return
summary: The same six steps in the same order in every action, so a check after the write cannot slip in.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/data-security, https://nextjs.org/docs/app/getting-started/updating-data]
---

## Rule

Write every action body in this order: authenticate, authorize, validate input, call the service that mutates, revalidate the affected cache, return the result. Stop at the first step that fails.

## Why

An ownership check placed after the write runs too late to stop it, and validation placed before authentication tells an anonymous caller which inputs the action accepts.

## Incorrect

```ts
const [error, budget] = await updateBudget(id, input); // mutate first
const session = await auth();
if (budget.ownerId !== session?.userId) forbidden(); // the update already happened
```

## Correct

```ts
const session = await auth();
if (!session) unauthorized();
if (!(await canEditBudget(session.userId, id))) forbidden();
const parsed = budgetSchema.safeParse(input);
if (!parsed.success) return { success: false, error: "Check the form", fieldErrors: z.flattenError(parsed.error).fieldErrors };
const [error, budget] = await updateBudget(id, parsed.data);
if (error) return { success: false, error: "Could not save the budget" };
revalidatePath(`/budgets/${id}`);
return { success: true, data: budget };
```

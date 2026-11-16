---
title: Keep queries and domain rules in the service layer, not in the server action
summary: An action checks access, validates, calls one service function, revalidates and returns; the rules live below it.
impact: high
applies: [typescript, nextjs]
implements: architecture/principles/keep-handlers-thin
sources: [https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Let a server action orchestrate only: auth, validation, one call to a service function that returns `[error, data]`, revalidation and the response. Put queries, limits and other domain rules in that service function.

## Why

A rule written in an action (a 20-budget limit, a uniqueness check) is copied into the next action and the route handler that does the same job, and it cannot be tested without mocking the request.

## Incorrect

```ts
const count = await db.budget.count({ where: { ownerId: session.userId } });
if (count >= 20) return { success: false, error: "You can have at most 20 budgets" };
const budget = await db.budget.create({ data: { ...parsed.data, ownerId: session.userId } });
```

## Correct

```ts
const [error, budget] = await createBudgetForUser(session.userId, parsed.data); // limit checked inside
if (error) return { success: false, error: error.code === "validation" ? error.message : "Could not create the budget" };
```

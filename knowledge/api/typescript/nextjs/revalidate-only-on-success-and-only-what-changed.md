---
title: Revalidate only after a successful mutation, and only the paths or tags it changed
summary: Call revalidatePath or updateTag on the success branch for the affected routes; never revalidatePath("/").
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/functions/revalidatePath, https://nextjs.org/docs/app/api-reference/functions/updateTag, https://nextjs.org/docs/app/api-reference/functions/revalidateTag]
---

## Rule

Revalidate after the service call has succeeded, naming only what the mutation changed: the list and detail paths, or the data's cache tag. Use `updateTag(tag)` when the user must see their own change at once, `revalidateTag(tag, "max")` when stale-while-revalidate is fine.

## Why

Revalidating before checking the result refreshes caches for a write that failed, a forgotten call leaves the UI stale until a full reload, and `revalidatePath("/")` throws away the cache of the whole app on every save.

## Incorrect

```ts
revalidatePath("/");
const [error, budget] = await updateBudget(id, parsed.data);
if (error) return { success: false, error: "Could not save the budget" };
```

## Correct

```ts
const [error, budget] = await updateBudget(id, parsed.data);
if (error) return { success: false, error: "Could not save the budget" };
revalidatePath("/budgets");
revalidatePath(`/budgets/${id}`);
```

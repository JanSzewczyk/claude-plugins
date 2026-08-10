# Patterns & Best Practices

## File organization

Co-locate actions with their feature, behind a data layer:

```text
features/posts/
  server/actions/   # "use server" — thin orchestration (create-post.ts, …, index.ts re-exports)
  server/db/        # data access — returns [error, data] tuples
  schemas/          # Zod schemas + inferred types
  types/            # domain types
  components/       # forms and UI
```

Name action files by verb (`create-post.ts`, `submit-step.ts`); re-export from `index.ts`.

## Error handling

Have the data layer return `[error, data]` instead of throwing, so the caller can't forget to handle it and can branch
on the _kind_ of error:

```typescript
export async function getUserById(id: string): Promise<[ServiceError | null, User | null]> {
  if (!id?.trim()) return [ServiceError.validation("Invalid id"), null];
  try {
    const user = await fetchUser(id);
    return user ? [null, user] : [ServiceError.notFound("User"), null];
  } catch (error) {
    return [categorizeError(error, "User"), null]; // map unknown errors to a typed shape
  }
}
```

`ServiceError` / `categorizeError` are placeholders for the project's typed error contract — ideally exposing boolean
kind flags (`isNotFound`, `isRetryable`, `isConflict`) and a stable `code`:

```typescript
const [error, data] = await dataOp();
if (error) {
  if (error.isNotFound) return { success: false, error: "Not found" };
  if (error.isConflict) return { success: false, error: "Already exists" };
  if (error.isRetryable) return { success: false, error: "Please try again in a moment" };
  logger.withMetadata({ operation: "dataOp", errorCode: error.code }).error("Unexpected error");
  return { success: false, error: "Something went wrong" };
}
```

**Never leak internal errors.** The client message must be safe and human; log the real cause separately. Not
`return { error: error.message }` — instead log `{ errorCode }` and return a generic "Could not save your changes".

For multi-step writes, run them in a transaction so a partial failure rolls back (exact API depends on the ORM; the
principle is atomicity).

## Logging

Structured logs with consistent keys. On failures include `operation` and a stable `errorCode`, plus `userId` when there
is one — that's what makes logs queryable. Log at the layer where the error originates; don't re-log as it bubbles up.
Never log secrets/PII (`last4: card.slice(-4)`, not the raw value).

```typescript
logger.withMetadata({ userId, operation: "createUser", errorCode: error.code }).error("Create failed");
```

## Cache revalidation

Revalidate **only on success**, and only what changed. Avoid `revalidatePath("/")` — it wipes the whole cache.

```typescript
revalidatePath("/posts"); // a route
revalidatePath(`/posts/${postId}`); // a dynamic instance
revalidateTag("posts"); // everything under a cache tag
```

## Security

**Order: authenticate → authorize → validate → mutate.** Checking ownership after the write is too late. Always
re-validate with Zod inside the action — client validation is UX, server validation is the security boundary.

For access-only failures (not something a form shows inline), throw the Next.js 15+ helpers instead of returning a union
— they render the nearest boundary:

```typescript
import { forbidden, unauthorized } from "next/navigation";
if (!userId) unauthorized(); // not logged in
if (post.authorId !== userId) forbidden(); // logged in, lacks permission
```

Rule of thumb: `return { success: false }` for business errors shown inline; `unauthorized()` / `forbidden()` for access
gates; `notFound()` for missing resources. Rate-limit sensitive actions (email, password reset) and sanitize any stored
HTML server-side.

## Performance

- One query with a join beats fetching a row then its relations (avoid N+1).
- Parallelize independent reads with `Promise.all`.
- Batch instead of looping over single mutations.
- Scope revalidation tightly.

## Anti-patterns

- **Missing `"use server"`** — must be the first statement in the file (or first line inside an inline action function).
- **Inconsistent returns** — always the union, never sometimes raw data.
- **Forgetting to revalidate** — a successful mutation leaves stale UI until a full reload.
- **Toast after `redirect()`** — `redirect` throws; set the toast cookie _before_ it.
- **Server toast without a redirect** — the cookie is only read on the next render; for same-page actions return
  `message`/`error` and toast client-side instead.
- **Business logic in the action** — actions orchestrate (auth, validate, call data layer, revalidate, return); query
  logic and domain rules belong in the data/service layer.

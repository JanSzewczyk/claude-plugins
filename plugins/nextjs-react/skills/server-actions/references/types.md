# The Result Contract

Canonical definition: [`assets/action-types.ts`](../assets/action-types.ts) — copy it into the project (see SKILL.md
Setup). Import the types; don't redefine them inline. Examples assume `~/lib/action-types`.

```typescript
export type ActionResponse<T = unknown> = Promise<
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
>;
export type RedirectAction = Promise<never | { success: false; error: string; fieldErrors?: Record<string, string[]> }>;
```

`ActionResponse<T>` is a discriminated union keyed on `success`. `RedirectAction` is the same failure branch with
`never` for success, because `redirect()` throws and never returns on the happy path.

## Usage

```typescript
// returns data
export async function createUser(data: CreateUserInput): ActionResponse<User> {
  const [error, user] = await createUserInDb(data);
  if (error) return { success: false, error: "Could not create user" };
  return { success: true, data: user, message: "User created" };
}

// redirects on success — reaching the next line client-side means it failed
export async function submitStep(data: StepInput): RedirectAction {
  const [error] = await saveStep(data);
  if (error) return { success: false, error: "Could not save" };
  redirect("/next");
}
```

`fieldErrors` carries Zod's per-field messages (`error.flatten().fieldErrors`) so a form can attach each message to its
input.

## Narrowing & guards

The `success` discriminant narrows each branch — no casts:

```typescript
const result = await myAction();
if (result.success) {
  result.data; // ✅   result.error; // ❌ doesn't exist here
} else {
  result.error;
  result.fieldErrors; // ✅   result.data; // ❌
}
```

For a named predicate (inside `.filter()`, helpers), the asset exports `isActionSuccess` / `isActionFailed`.

## useActionState signature

`useActionState` calls the action as `(previousState, formData)`, so the previous state is the **first** parameter:

```typescript
export async function createPost(
  previousState: Awaited<ActionResponse<Post>> | null,
  formData: FormData
): ActionResponse<Post> {
  const title = formData.get("title");
  if (typeof title !== "string" || title.length < 3) return { success: false, error: "Title too short" };
  const [error, post] = await createPostInDb({ title });
  if (error) return { success: false, error: "Could not create post" };
  return { success: true, data: post };
}
```

`Awaited<ActionResponse<T>>` unwraps the `Promise` to the resolved union — useful for typing `useActionState`'s state.
Client wiring is in [hooks.md](./hooks.md).

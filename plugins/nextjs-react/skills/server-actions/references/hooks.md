# React Hooks for Server Actions

Pick the hook by how the action is triggered. `toast` is any client toast library — swap the import.

| Hook             | Use for                                                     |
| ---------------- | ----------------------------------------------------------- |
| `useActionState` | Native `<form action>` with server state (errors, success)  |
| `useFormStatus`  | A child of a `<form>` that needs the parent's pending state |
| `useTransition`  | Programmatic calls — buttons, toggles, non-form actions     |
| `useOptimistic`  | Instant UI update before the server confirms                |

For rich/typed forms, dynamic fields, and wizards, use [react-hook-form.md](./react-hook-form.md).

## useActionState

Action signature `(previousState, formData)`; the hook returns `[state, formAction, isPending]`.

```typescript
"use client";
import { useActionState } from "react";
import { sendContactMessage } from "../server/actions/send-message";

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactMessage, null);
  if (state?.success) return <p role="status">{state.message}</p>;

  return (
    <form action={formAction}>
      <input name="name" required disabled={isPending} aria-invalid={!!state?.fieldErrors?.name} />
      {state?.fieldErrors?.name ? <p className="text-error">{state.fieldErrors.name[0]}</p> : null}

      {state && !state.success && !state.fieldErrors ? <p role="alert">{state.error}</p> : null}

      <button type="submit" disabled={isPending}>{isPending ? "Sending…" : "Send"}</button>
    </form>
  );
}
```

Reset after success by keying an effect off `state.success`:
`useEffect(() => { if (state?.success) formRef.current?.reset(); }, [state?.success])`.

## useFormStatus

Reports the **enclosing** form's pending status — must live in a component rendered _inside_ the `<form>`, otherwise it
always reads idle.

```typescript
"use client";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus(); // also: data, method, action
  return <button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit"}</button>;
}
// <form action={action}><input name="email" /><SubmitButton /></form>
```

## useTransition

For actions invoked programmatically — delete buttons, toggles, row actions. Set result-dependent local state inside the
transition, only on success.

```typescript
"use client";
import { useTransition } from "react";
import { toast } from "~/lib/toast";
import { deletePost } from "../server/actions/delete-post";

export function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(postId);
      if (!result.success) toast.error(result.error);
    });
  }
  return <button onClick={handleDelete} disabled={isPending}>{isPending ? "Deleting…" : "Delete"}</button>;
}
```

## useOptimistic

Updates the UI immediately, then reconciles. On failure the optimistic value reverts on the next render — surface the
error (toast), don't undo manually.

```typescript
"use client";
import { useOptimistic, useTransition } from "react";
import { toast } from "~/lib/toast";
import { toggleLike } from "../server/actions/toggle-like";

export function LikeButton({ postId, initialLiked, initialCount }: {
  postId: string; initialLiked: boolean; initialCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (s, liked: boolean) => ({ liked, count: liked ? s.count + 1 : s.count - 1 })
  );

  function handleToggle() {
    startTransition(async () => {
      setOptimistic(!optimistic.liked);
      const result = await toggleLike(postId);
      if (!result.success) toast.error(result.error); // reverts automatically
    });
  }
  return <button onClick={handleToggle} disabled={isPending}>{optimistic.liked ? "♥" : "♡"} {optimistic.count}</button>;
}
```

For an optimistic list add, mark temp items (`id: \`temp-${Date.now()}\``) so they can be styled while in flight.

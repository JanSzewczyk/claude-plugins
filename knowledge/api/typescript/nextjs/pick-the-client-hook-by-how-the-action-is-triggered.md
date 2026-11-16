---
title: Pick the client hook by how the action is triggered
summary: useActionState for a native form, React Hook Form plus useTransition for a rich one, useOptimistic for instant feedback.
impact: medium
applies: [typescript, react, nextjs, react-hook-form]
sources: [https://react.dev/reference/react/useActionState, https://react.dev/reference/react/useTransition, https://react.dev/reference/react/useOptimistic, https://react-hook-form.com/docs/useform]
---

## Rule

Call an action from `useActionState` for a native `<form action>` with few fields; from React Hook Form's `handleSubmit` inside `startTransition` for typed, dynamic or multi-step forms; from `startTransition` alone for a button such as delete or toggle; and wrap the call with `useOptimistic` when the UI must change before the server answers.

## Why

Calling an action from a plain `onClick` with `await` gives no pending state, so the button can be clicked twice and the UI freezes without feedback, and hand-rolled optimistic state is not rolled back when the action fails.

## Incorrect

```tsx
<button onClick={async () => { await deleteBudget(id); }}>Delete</button>
```

## Correct

```tsx
const [isPending, startTransition] = React.useTransition();

function handleDelete() {
  startTransition(async () => {
    const result = await deleteBudget(id);
    if (!result.success) toast.error(result.error);
  });
}

<button onClick={handleDelete} disabled={isPending}>Delete</button>;
```

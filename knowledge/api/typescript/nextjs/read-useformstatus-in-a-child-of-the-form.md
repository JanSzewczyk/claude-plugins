---
title: Call useFormStatus in a component rendered inside the form
summary: useFormStatus reads the parent form; called in the component that renders the form it is always idle.
impact: high
applies: [typescript, react, nextjs]
sources: [https://react.dev/reference/react-dom/hooks/useFormStatus]
---

## Rule

Read `useFormStatus()` in a child component, such as a `SubmitButton`, that is rendered inside the `<form>`, never in the component that renders the `<form>` itself.

## Why

`useFormStatus` reports only a form that is an ancestor of the calling component, so in the form's own component `pending` stays `false`: the button never disables and users submit twice.

## Incorrect

```tsx
function BudgetForm() {
  const { pending } = useFormStatus(); // always false
  return <form action={createBudget}><button disabled={pending}>Save</button></form>;
}
```

## Correct

```tsx
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}

function BudgetForm() {
  return <form action={createBudget}><SubmitButton /></form>;
}
```

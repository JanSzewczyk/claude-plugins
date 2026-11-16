---
title: Show validation errors next to their fields, never in a toast
summary: fieldErrors render inline under each input with aria-invalid; toasts are for page-level outcomes.
impact: medium
applies: [typescript, react, nextjs, sonner]
sources: [https://sonner.emilkowal.ski/toast, https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid]
---

## Rule

Render each entry of `fieldErrors` under its input and mark the input `aria-invalid`. Use a toast only for the outcome of the whole action (saved, deleted, could not save), and never for a message about one field.

## Why

A toast disappears after a few seconds and points at no field, so with three invalid fields the user sees one transient message and has to guess which inputs to fix.

## Incorrect

```tsx
if (!result.success && result.fieldErrors) toast.error(result.fieldErrors.email?.[0]);
```

## Correct

```tsx
<input name="email" aria-invalid={state?.fieldErrors?.email ? true : undefined} aria-describedby="email-error" />
{state?.fieldErrors?.email ? <p id="email-error">{state.fieldErrors.email[0]}</p> : null}
```

---
title: Map an action's fieldErrors onto React Hook Form fields with setError
summary: Each server field error becomes setError(field, { type: "server" }); an error without fields goes to root.
impact: medium
applies: [typescript, react, nextjs, react-hook-form]
sources: [https://react-hook-form.com/docs/useform/seterror]
---

## Rule

When an action called from a React Hook Form form fails, call `form.setError(field, { type: "server", message })` for each entry in `fieldErrors` and `form.setError("root", { message: error })` when there are none. Do it in one shared helper.

## Why

Without the mapping, a value the client schema accepted but the server rejected (an email already taken) shows no message next to the field, and the user does not know what to change.

## Incorrect

```ts
const result = await createUser(data);
if (!result.success) setFormError(result.error); // the email field shows nothing
```

## Correct

```ts
const result = await createUser(data);
if (!result.success) applyServerErrors(form, result);

function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, result: ActionFailure) {
  if (!result.fieldErrors) return form.setError("root", { message: result.error });
  for (const [field, messages] of Object.entries(result.fieldErrors)) {
    form.setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}
```

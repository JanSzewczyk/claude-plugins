---
title: Coerce FormData strings to their types in the schema with z.coerce
summary: Every FormData value is a string or File; the schema converts it, not hand-written parsing in the action.
impact: medium
applies: [typescript, nextjs, zod]
sources: [https://zod.dev/api#coercion, https://developer.mozilla.org/en-US/docs/Web/API/FormData/get]
---

## Rule

For an action that receives `FormData`, declare non-string fields with `z.coerce.number()`, `z.coerce.date()` or an explicit transform, and parse `Object.fromEntries(formData)` with that schema.

## Why

Parsing `"500"` with `z.number()` rejects every submission, and converting by hand in each action (`Number(formData.get("amount"))`) spreads the parsing across actions that each treat empty and malformed strings differently.

## Incorrect

```ts
const parsed = budgetSchema.safeParse({
  name: formData.get("name"),
  amount: Number(formData.get("amount")), // conversion repeated in every action
});
```

## Correct

```ts
const budgetFormSchema = z.object({ name: z.string().min(1), amount: z.coerce.number().positive() });
const parsed = budgetFormSchema.safeParse(Object.fromEntries(formData));
```

## Exceptions

`z.coerce.number()` turns an empty string into `0`, so give an optional number field a bound that rejects `0` or preprocess `""` to `undefined`. A checkbox sends `"on"` or nothing, and `z.coerce.boolean()` turns any non-empty string, `"false"` included, into `true`: use `z.literal("on").optional().transform(Boolean)` for it.

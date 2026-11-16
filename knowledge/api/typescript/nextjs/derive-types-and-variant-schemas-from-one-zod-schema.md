---
title: Infer input types and derive variant schemas from one Zod schema per entity
summary: z.infer gives the type, .partial / .pick / .extend give update and subset schemas; nothing is declared twice.
impact: medium
applies: [typescript, zod]
sources: [https://zod.dev/basics#inferring-types, https://zod.dev/api#objects]
---

## Rule

Write one schema per entity input, export its type as `z.infer<typeof schema>` (`z.input` for raw form values), and build update or subset schemas from it with `.partial()`, `.pick()`, `.omit()` or `.extend()`.

## Why

A hand-written interface next to the schema, or a second schema for updates, drifts on the next field change: the type says a field is required while the schema lets it through, and the compiler cannot see it.

## Incorrect

```ts
export const createBudgetSchema = z.object({ name: z.string().min(1), amount: z.number().positive() });
export type CreateBudgetInput = { name: string; amount: number; note: string };
export const updateBudgetSchema = z.object({ name: z.string().optional(), amount: z.number().optional() });
```

## Correct

```ts
export const createBudgetSchema = z.object({ name: z.string().min(1), amount: z.number().positive() });
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export const updateBudgetSchema = createBudgetSchema.partial();
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
```

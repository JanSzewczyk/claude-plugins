---
name: builder-factory
description: Use this skill to create typed test data builders with mimicry-js and Faker for any TypeScript interface or type. Invoke whenever the user asks to generate mock data, create test fixtures, build factory functions, produce seed data, or construct fake objects for unit tests, Storybook stories, or E2E scenarios. Also use when migrating from test-data-bot or Fishery to mimicry-js, or when the user mentions builders, factories, or typed mock/fake/test/seed data generation — even if they describe the task indirectly (e.g. "I need realistic invoices for testing" or "generate sample users for my stories").
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Builder Factory Generator

Generate `mimicry-js` + `@faker-js/faker` factory builders for TypeScript types (for Vitest, Storybook,
E2E, and dev seeding). This file is the API and rules; full builder examples are in the reference.

> - [references/field-mappings.md](./references/field-mappings.md) — field type → Faker method mappings.
> - [references/examples.md](./references/examples.md) — complete builders: traits, postBuild, nested/deep-merge,
>   database types, discriminated unions, composition, recursive types, seeding, `withPrev`, reset.

Check `CLAUDE.md` for the **Faker locale**, **builder location convention**, and **database type patterns**
before generating.

## Workflow

1. **Find existing builders first** — `Glob` for `**/*.builder.ts` and `features/*/test/builders/*.ts`;
   reuse before creating.
2. **Analyze the type** — fields, nested types, arrays, optional/Date/enum/union fields.
3. **Place the file** — feature-specific `features/[feature]/test/builders/` or shared `tests/builders/`.
4. **Name it** — `camelCase(TypeName) + "Builder"`, file `kebab-case.builder.ts`
   (`UserProfile` → `userProfileBuilder` in `user-profile.builder.ts`). Include JSDoc with usage examples.

## Builder API

**Methods** — `.one(options?)` (single), `.many(count, options?)` (array), `.reset()` (reset
`sequence`/`unique`/iterators). Options: `overrides` (Partial<T>), `traits` (string | string[]),
`postBuild` ((obj) => obj, per-call).

**Field generators** (place as field values — see placement rules):

- `sequence()` / `sequence((n) => \`prefix-\${n}\`)` — auto-increment.
- `oneOf("a", "b")` — random from options; `unique([...])` — each value once, throws when exhausted.
- `bool()`, `int(min?, max?)` (default 1–1000), `float(min?, max?)` (default 0–1).
- `withPrev((prev?) => value)` — access the previous build value.
- `fixed(fn)` — keep a function value as-is (don't call it).
- `() => value` — plain function, fresh each build (replaces `perBuild`). Static values need no wrapper.

**Deterministic random** — `seed(value)` makes `oneOf`/`int`/`float`/`bool` reproducible; `getSeed()` reads it.

## Features (code in examples.md)

- **Traits** — named variants (`build({ traits: { admin: { overrides: { role: "admin" } } } })`), applied
  via `.one({ traits: "admin" })` or an array.
- **postBuild** — compute fields from siblings after the object is built (e.g. a total from line items).
- **Nested builders** — `field: () => otherBuilder.one()`; overrides deep-merge (patch one nested key
  without replacing the object).
- **Database types** — separate Base (no id/timestamps) and Application (id + Date timestamps) builders.

## Generator Placement Rules

mimicry-js generators (`oneOf`, `sequence`, `bool`, `int`, `float`, `unique`, `withPrev`) are
**field-level descriptors** resolved internally by the library. They work only when placed **directly as
a field value** or **inside a static nested object** (which mimicry-js processes recursively). They do
**NOT** work inside arrow functions — an arrow body is opaque to mimicry-js, which just calls it and
expects a resolved value back.

```typescript
fields: {
  role: oneOf("admin", "user"),                       // ✅ resolved by mimicry-js
  profile: () => ({ theme: oneOf("light", "dark") }), // ❌ returns a descriptor, not a value
  theme: () => faker.helpers.arrayElement(["light", "dark"]), // ✅ use Faker inside arrow functions
}
```

Inside an arrow function, swap each generator for its Faker equivalent:

| Generator         | Top-level `fields`       | Inside `() => ...`                                    |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| `oneOf("a", "b")` | `field: oneOf("a", "b")` | `field: () => faker.helpers.arrayElement(["a", "b"])` |
| `int(0, 100)`     | `field: int(0, 100)`     | `field: () => faker.number.int({ min: 0, max: 100 })` |
| `float(0, 1)`     | `field: float(0, 1)`     | `field: () => faker.number.float({ min: 0, max: 1 })` |
| `bool()`          | `field: bool()`          | `field: () => faker.datatype.boolean()`               |
| `sequence()`      | `field: sequence()`      | `field: () => faker.number.int()`                     |

Use arrow functions only when a fresh value is needed each `.one()` call (Faker data, nested builders).

## Best Practices

- **`.many(count)` for arrays** — not `Array.from()` / `[...Array(n)].map()`; it supports traits/overrides
  and resets state correctly.
- **Prefer `oneOf`/`int`/`float`/`bool` over Faker** at top level — they integrate with `seed()`.
- **`unique()` over `oneOf()`** when each value must be distinct (e.g. across a `.many()` call).
- **`fixed(fn)` for function-typed fields** (`onClick`, `onSubmit`) so mimicry-js doesn't call them.
- **`faker.helpers.weightedArrayElement`** for non-uniform distributions (Faker only).
- **`postBuild` for computed fields**; **compose** builders with `() => otherBuilder.one()` rather than
  deep nesting; **call `.reset()` in `beforeEach`** when tests depend on `sequence()`/`unique()` order.
- Always use `mimicry-js` (NOT test-data-bot or Fishery). `sequence()` for numeric ids,
  `() => faker.string.uuid()` for UUIDs.

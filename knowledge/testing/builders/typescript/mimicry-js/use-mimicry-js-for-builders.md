---
title: Write TypeScript builders with mimicry-js and Faker
summary: Every builder uses mimicry-js with Faker; a builder with traits types its fields as FieldsConfiguration<T>.
impact: high
applies: [typescript, mimicry-js]
implements: testing/builders/principles/use-builders-for-structured-data
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Write every TypeScript builder with `build` from `mimicry-js`, with `@faker-js/faker` for realistic
values. A builder without traits uses `build<T>()`. A builder with traits declares its fields as
`const fields: FieldsConfiguration<T> = {...}` (a typed variable; `satisfies` on the inline literal
narrows the literal types and rejects valid trait values) and calls `build({ fields, traits })`
without an explicit type argument, so trait names and override values are checked by the compiler. Name the
builder `camelCase(TypeName) + "Builder"` in a `kebab-case.builder.ts` file, and migrate
test-data-bot or Fishery builders when you touch them.

## Why

`build<T>()` sets the trait-name parameter to `string`. A typo in `one({ traits: "suport" })` then
compiles and fails only at runtime, or passes silently. Passing the fields typed as
`FieldsConfiguration<T>` lets TypeScript infer the trait names from the `traits` object and check
each override value against `T`. Two builder libraries in one codebase mean two APIs for overrides
and traits, and tests copied from one style break when pasted next to the other.

## Incorrect

```ts
export const makeUser = (overrides: Partial<User> = {}): User => ({ id: "1", name: "Ada", ...overrides });
```

```ts
export const userBuilder = build<User>({
  fields: { id: sequence(), name: () => faker.person.fullName(), role: "user" },
  traits: { admin: { overrides: { role: "admin" } } },
});
userBuilder.one({ traits: "amdin" }); // compiles: trait name is string
```

## Correct

```ts
const userFields: FieldsConfiguration<User> = {
  id: sequence(),
  name: () => faker.person.fullName(),
  role: "user",
};

export const userBuilder = build({
  fields: userFields,
  traits: { admin: { overrides: { role: "admin" } } },
});

userBuilder.one({ traits: "admin" });
userBuilder.one({ traits: "amdin" }); // error: not assignable to "admin"
```

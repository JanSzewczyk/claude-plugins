---
title: Write TypeScript builders with mimicry-js and Faker
summary: Every builder uses mimicry-js with Faker; not test-data-bot or Fishery, and not a hand-written factory.
impact: high
applies: [typescript, mimicry-js]
implements: testing/builders/principles/use-builders-for-structured-data
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Write every TypeScript builder with `build<T>()` from `mimicry-js`, with `@faker-js/faker` for
realistic values. Name it `camelCase(TypeName) + "Builder"` in a `kebab-case.builder.ts` file, and
migrate test-data-bot or Fishery builders when you touch them.

## Why

Two builder libraries in one codebase mean two APIs for overrides and traits, and tests copied from
one style break when pasted next to the other.

## Incorrect

```ts
export const makeUser = (overrides: Partial<User> = {}): User => ({ id: "1", name: "Ada", ...overrides });
```

## Correct

```ts
export const userBuilder = build<User>({
  fields: { id: () => faker.string.uuid(), name: () => faker.person.fullName() },
});
```

---
title: Place mimicry-js generators directly as field values, use Faker inside arrow functions
summary: oneOf, int, sequence and friends resolve only at field level; inside () => they return a descriptor, not a value.
impact: critical
applies: [typescript, mimicry-js]
sources: [https://github.com/Stivooo/mimicry-js]
---

## Rule

Put `oneOf`, `sequence`, `int`, `float`, `bool`, `unique` and `withPrev` directly as a field value
or inside a static nested object. Inside an arrow function, use the Faker equivalent instead, for
example `faker.helpers.arrayElement([...])` for `oneOf`.

## Why

mimicry-js resolves generators only where it walks the `fields` object. An arrow function's body is
opaque to it, so a generator returned from one ends up in the built object as a descriptor. The
test then compares against an object, not a string, and the failure message points nowhere near
the builder.

## Incorrect

```ts
fields: {
  profile: () => ({ theme: oneOf("light", "dark") }),
}
```

## Correct

```ts
fields: {
  theme: oneOf("light", "dark"),
  profile: () => ({ theme: faker.helpers.arrayElement(["light", "dark"]) }),
}
```

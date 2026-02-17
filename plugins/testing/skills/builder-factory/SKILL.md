---
name: builder-factory
version: 4.1.0
lastUpdated: 2026-02-17
description: Generate mimicry-js factory builders for TypeScript types to create mock data for tests and Storybook. Use when creating mock data, test fixtures, or Storybook story data.
tags: [testing, factories, mock-data, mimicry-js, faker, typescript]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep
user-invocable: true
examples:
  - Create a builder for User type
  - Generate builder for my Order model
  - Build a builder for the Resource type with all relationships
  - Create builders for Product and Order types
---

# Builder Factory Generator

Generate mimicry-js factory builders for TypeScript types.

> **Reference Files:**
>
> - `field-mappings.md` - Field type to Faker method mappings
> - `examples.md` - Complete builder examples and patterns

## First Step: Read Project Context

**IMPORTANT**: Check `.claude/project-context.md` for:

- **Faker locale** (e.g., `@faker-js/faker/locale/pl` for Polish or `@faker-js/faker` for default English)
- **Builder location convention** (e.g., `features/[feature]/test/builders/`)
- **Database type patterns** (for Application/Base/DTO type builders)

## Context

Builders using `mimicry-js` and `@faker-js/faker` for:

- Unit tests (Vitest)
- Storybook stories
- E2E test data
- Development seeding

## Workflow

### 1. Pre-Check: Find Existing Builders

**IMPORTANT: Search for existing builders before creating new ones.**

```bash
find . -name "*.builder.ts" -type f
ls features/*/test/builders/ 2>/dev/null
```

### 2. Analyze the Type Structure

- Identify all fields, types, and relationships
- Check for nested types, arrays, optional fields
- Look for Date fields, enum types, union types

### 3. Builder Location

Check project-context.md for conventions. Common patterns:

- Feature-specific: `features/[feature-name]/test/builders/`
- Shared types: `tests/builders/`

### 4. Naming Convention

**Builder name = camelCase(TypeName) + "Builder"**

```typescript
// Type: OnboardingProducts
export const onboardingProductsBuilder = build<OnboardingProducts>({...});
// File: onboarding-products.builder.ts

// Type: UserProfile
export const userProfileBuilder = build<UserProfile>({...});
// File: user-profile.builder.ts
```

## Basic Template

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker"; // Check project-context.md for locale
import type { YourType } from "~/features/[feature]/types/your-type";

/**
 * Builder for YourType test data.
 *
 * @example
 * const item = yourTypeBuilder.one();
 *
 * @example
 * const customItem = yourTypeBuilder.one({
 *   overrides: { fieldName: "custom value" }
 * });
 *
 * @example
 * const items = yourTypeBuilder.many(5);
 */
export const yourTypeBuilder = build<YourType>({
  fields: {
    id: sequence(),
    name: () => faker.person.fullName(),
    email: () => faker.internet.email(),
    status: "active",
  },
});
```

## Key Methods

### Builder Methods

- `.one(options?)` - Generate a single instance
- `.many(count, options?)` - Generate an array of instances
- `.reset()` - Reset state of `sequence`, `unique`, and custom iterators

### Field Generators

- `sequence()` - Auto-incremented number (1, 2, 3...)
- `sequence((n) => \`prefix-\${n}\`)` - Custom sequence
- `oneOf("a", "b", "c")` - Random value from options
- `unique(["a", "b", "c"])` - Each value exactly once, throws when exhausted
- `bool()` - Random `true` / `false`
- `int()` / `int(max)` / `int(min, max)` - Random integer (default 1-1000)
- `float()` / `float(max)` / `float(min, max)` - Random float (default 0-1)
- `withPrev((prev?) => value)` - Access previous build value
- `fixed(fn)` - Prevent calling a function value (keeps it as-is)
- `() => value` - Plain function called fresh each build (replaces `perBuild`)
- Static values don't need wrapper

### Deterministic Random

- `seed(value)` - Set seed for reproducible `oneOf`, `int`, `float`, `bool`
- `getSeed()` - Get current seed value

## Traits (Variants)

```typescript
export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    role: "user",
    isActive: true,
  },
  traits: {
    admin: {
      overrides: { role: "admin" },
    },
    inactive: {
      overrides: { isActive: false },
    },
  },
});

// Usage
userBuilder.one({ traits: "admin" });
userBuilder.one({ traits: ["admin", "inactive"] });
```

## postBuild Hook

```typescript
export const orderBuilder = build<Order>({
  fields: {
    products: () => productBuilder.many(3),
    totalAmount: 0,
  },
  postBuild: (order) => {
    order.totalAmount = order.products.reduce((sum, p) => sum + p.price, 0);
    return order;
  },
});
```

## Nested Builders

```typescript
export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    address: () => addressBuilder.one(),
  },
});
```

## Database Types Pattern

Check project-context.md for the specific type lifecycle pattern. Common pattern:

```typescript
// Base type builder (without id, timestamps)
export const resourceBaseBuilder = build<ResourceBase>({
  fields: {
    name: () => faker.commerce.productName(),
    status: "active",
  },
});

// Application type builder (with id, timestamps)
export const resourceBuilder = build<Resource>({
  fields: {
    id: () => faker.string.uuid(),
    name: () => faker.commerce.productName(),
    status: "active",
    createdAt: () => faker.date.past(),
    updatedAt: () => faker.date.recent(),
  },
});
```

## Best Practices

### Generator Placement: Top-Level vs Arrow Functions

**Critical rule:** mimicry-js generators (`oneOf`, `sequence`, `bool`, `int`, `float`, `unique`, `withPrev`) are **field-level descriptors** — mimicry-js resolves them when building objects. They work correctly only when placed:

- **Directly as field values** in `fields` definition (top-level)
- **Inside static nested objects** that mimicry-js recursively processes

They **do NOT work** inside arrow functions `() => ...`, because arrow function bodies are opaque to mimicry-js — it just calls the function and expects a resolved value back.

**Use `oneOf()` at the top level of field definitions:**

```typescript
// CORRECT - oneOf at top level, mimicry-js resolves the generator
export const userBuilder = build<User>({
  fields: {
    role: oneOf("admin", "user", "guest"),
    status: oneOf("active", "inactive"),
  },
});
```

**Use `faker.helpers.arrayElement()` inside arrow functions and nested objects returned by functions:**

```typescript
// CORRECT - faker inside arrow function
export const userBuilder = build<User>({
  fields: {
    profile: () => ({
      bio: faker.lorem.sentence(),
      theme: faker.helpers.arrayElement(["light", "dark", "system"]),
    }),
    metadata: () => ({
      source: faker.helpers.arrayElement(["web", "mobile", "api"]),
      tags: faker.helpers.arrayElements(["new", "vip", "beta"], {
        min: 1,
        max: 2,
      }),
    }),
  },
});
```

**Common mistake — DO NOT use generators inside arrow functions:**

```typescript
// WRONG - oneOf inside arrow function won't be resolved by mimicry-js
export const userBuilder = build<User>({
  fields: {
    profile: () => ({
      theme: oneOf("light", "dark", "system"), // Returns generator descriptor, NOT a value
    }),
  },
});

// WRONG - sequence inside arrow function
export const orderBuilder = build<Order>({
  fields: {
    items: () =>
      Array.from({ length: 3 }, () => ({
        id: sequence(), // Won't auto-increment
      })),
  },
});
```

**The same rule applies to all mimicry-js generators:**

| Generator         | Top-level `fields`       | Inside `() => ...`                                    |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| `oneOf("a", "b")` | `field: oneOf("a", "b")` | `field: () => faker.helpers.arrayElement(["a", "b"])` |
| `int(0, 100)`     | `field: int(0, 100)`     | `field: () => faker.number.int({ min: 0, max: 100 })` |
| `float(0, 1)`     | `field: float(0, 1)`     | `field: () => faker.number.float({ min: 0, max: 1 })` |
| `bool()`          | `field: bool()`          | `field: () => faker.datatype.boolean()`               |
| `sequence()`      | `field: sequence()`      | `field: () => faker.number.int()`                     |

### Static nested objects vs arrow functions for nested data

mimicry-js **recursively processes static nested objects**, so generators work inside them:

```typescript
// CORRECT - static nested object, mimicry-js processes it recursively
export const accountBuilder = build<Account>({
  fields: {
    id: sequence(),
    address: {
      street: oneOf("123 Main St", "456 Elm Ave"),
      city: oneOf("New York", "Los Angeles"),
      zipCode: sequence((n) => n + 1000),
    },
  },
});
```

Use **arrow functions for nested data** only when you need fresh values on each `.one()` call (e.g., Faker-generated data or calling another builder):

```typescript
// CORRECT - arrow function for fresh Faker data each time
export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    address: () => addressBuilder.one(), // New address each call
  },
});
```

### Use `.many()` for generating arrays

Always use `builder.many(count)` instead of manually constructing arrays. This applies both to generating test data and to array-typed fields inside builders.

```typescript
// CORRECT - use .many() for generating lists
const users = userBuilder.many(5);
const admins = userBuilder.many(3, { traits: "admin" });

// CORRECT - use .many() inside builder fields for array relationships
export const orderBuilder = build<Order>({
  fields: {
    id: sequence(),
    items: () => orderItemBuilder.many(3),
    tags: () => tagBuilder.many(2),
  },
});
```

```typescript
// WRONG - manual array construction
const users = Array.from({ length: 5 }, () => userBuilder.one());
const users = [...Array(5)].map(() => userBuilder.one());
const users = new Array(5).fill(null).map(() => userBuilder.one());

// WRONG - manual array inside builder fields
export const orderBuilder = build<Order>({
  fields: {
    items: () => Array.from({ length: 3 }, () => orderItemBuilder.one()),
  },
});
```

Why `.many()` is better:

- Cleaner and more readable
- Supports `traits` and `overrides` as second argument: `builder.many(3, { traits: "admin" })`
- Properly resets internal state between builds
- Consistent API across the codebase

### Other Best Practices

- **Prefer `oneOf` over `faker.helpers.arrayElement`** at the top level — it integrates with mimicry-js `seed()` for deterministic builds
- **Prefer `int`/`float`/`bool` over Faker equivalents** at the top level — same seed integration benefit
- **Use `faker.helpers.weightedArrayElement`** when you need non-uniform distribution (only available via Faker)
- **Use `faker.helpers.arrayElements` (plural)** for selecting multiple random items from a list
- **Use `unique()` instead of `oneOf()`** when each generated value must be distinct (e.g., in `.many()` calls)
- **Use `fixed(fn)` for function-typed fields** (e.g., `onClick`, `onSubmit`) to prevent mimicry-js from calling them
- **Use `postBuild` for computed fields** that depend on other field values rather than trying to reference sibling fields
- **Prefer separate builders over deeply nested structures** — compose with `() => otherBuilder.one()` for maintainability
- **Call `.reset()` in `beforeEach`** when tests depend on `sequence()` or `unique()` starting values

## Important Notes

- Always use `mimicry-js` (NOT test-data-bot or Fishery)
- Check project-context.md for Faker locale configuration
- Use `sequence()` for numeric IDs, `() => faker.string.uuid()` for UUIDs
- Use plain functions `() => ...` for values that should be fresh each time (no `perBuild` needed)
- Use built-in generators (`oneOf`, `int`, `bool`) where they replace simple Faker calls — but only at the top level
- Use `.many(count)` instead of `Array.from({ length: count }, () => builder.one())`
- Static values don't need function wrapper
- Include JSDoc with usage examples

---
name: builder-factory
version: 5.0.0
lastUpdated: 2026-04-01
description: Use this skill to create typed test data builders with mimicry-js and Faker for any TypeScript interface or type. Invoke whenever the user asks to generate mock data, create test fixtures, build factory functions, produce seed data, or construct fake objects for unit tests, Storybook stories, or E2E scenarios. Also use when migrating from test-data-bot or Fishery to mimicry-js, or when the user mentions builders, factories, or typed mock/fake/test/seed data generation — even if they describe the task indirectly (e.g. "I need realistic invoices for testing" or "generate sample users for my stories").
tags:
  [
    testing,
    factories,
    mock-data,
    mimicry-js,
    faker,
    typescript,
    fixtures,
    builders,
    storybook,
    seed-data,
  ]
allowed-tools: Read, Write, Edit, Glob, Grep
compatibility:
  dependencies: [mimicry-js, "@faker-js/faker"]
examples:
  - Create a builder for User type
  - Generate builder for my Order model
  - Build a builder for the Resource type with all relationships
  - Create builders for Product and Order types
  - I need mock data for testing the checkout flow
  - Generate test fixtures for the API response types
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

Use `Glob` to find existing builders:

- `**/*.builder.ts` — all builder files in the project
- `features/*/test/builders/*.ts` — feature-specific builders

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

Options for `.one()` and `.many()`:

```typescript
builder.one({
  overrides?: Partial<T>,       // Override specific fields
  traits?: string | string[],   // Apply named traits
  postBuild?: (obj: T) => T,    // Per-call post-processing (overrides build-level postBuild)
});
```

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

**Deep merging:** Overrides on nested objects merge deeply — they patch only the specified keys without replacing the whole object:

```typescript
// Only overrides `city`, keeps other address fields intact
userBuilder.one({
  overrides: { address: { city: "Warsaw" } },
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

## Generator Placement Rules

mimicry-js generators (`oneOf`, `sequence`, `bool`, `int`, `float`, `unique`, `withPrev`) are **field-level descriptors** — the library resolves them internally when building objects. They only work when placed:

- **Directly as field values** in `fields` (top-level)
- **Inside static nested objects** that mimicry-js recursively processes

They **do NOT work** inside arrow functions `() => ...` — arrow function bodies are opaque to mimicry-js, which just calls the function and expects a resolved value back.

**Correct — generators at top level:**

```typescript
export const userBuilder = build<User>({
  fields: {
    role: oneOf("admin", "user", "guest"), // mimicry-js resolves this
    status: oneOf("active", "inactive"),
  },
});
```

**Correct — Faker inside arrow functions:**

```typescript
export const userBuilder = build<User>({
  fields: {
    profile: () => ({
      theme: faker.helpers.arrayElement(["light", "dark", "system"]),
      tags: faker.helpers.arrayElements(["new", "vip", "beta"], {
        min: 1,
        max: 2,
      }),
    }),
  },
});
```

**Wrong — generators inside arrow functions return descriptor objects, not values:**

```typescript
// WRONG
fields: {
  profile: () => ({
    theme: oneOf("light", "dark"),  // Returns descriptor, NOT a resolved value
  }),
}
```

**Equivalents table:**

| Generator         | Top-level `fields`       | Inside `() => ...`                                    |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| `oneOf("a", "b")` | `field: oneOf("a", "b")` | `field: () => faker.helpers.arrayElement(["a", "b"])` |
| `int(0, 100)`     | `field: int(0, 100)`     | `field: () => faker.number.int({ min: 0, max: 100 })` |
| `float(0, 1)`     | `field: float(0, 1)`     | `field: () => faker.number.float({ min: 0, max: 1 })` |
| `bool()`          | `field: bool()`          | `field: () => faker.datatype.boolean()`               |
| `sequence()`      | `field: sequence()`      | `field: () => faker.number.int()`                     |

**Static nested objects** are recursively processed by mimicry-js, so generators work inside them. Use arrow functions only when fresh values are needed on each `.one()` call (Faker data, nested builders).

## Best Practices

- **Use `.many(count)` for arrays** — not `Array.from()` or `[...Array(n)].map()`. Supports traits/overrides, resets internal state properly
- **Prefer `oneOf`/`int`/`float`/`bool` over Faker equivalents** at the top level — they integrate with `seed()` for deterministic builds
- **Use `faker.helpers.weightedArrayElement`** for non-uniform distribution (only available via Faker)
- **Use `unique()` instead of `oneOf()`** when each value must be distinct (e.g., in `.many()` calls)
- **Use `fixed(fn)` for function-typed fields** (e.g., `onClick`, `onSubmit`) — prevents mimicry-js from calling them
- **Use `postBuild` for computed fields** that depend on sibling field values
- **Compose builders** with `() => otherBuilder.one()` rather than deeply nesting structures
- **Call `.reset()` in `beforeEach`** when tests depend on `sequence()` or `unique()` starting values

## Important Notes

- Always use `mimicry-js` (NOT test-data-bot or Fishery)
- Check project-context.md for Faker locale — if it doesn't exist, use default `@faker-js/faker` import and English locale
- Use `sequence()` for numeric IDs, `() => faker.string.uuid()` for UUIDs
- Use plain `() => ...` for values that should be fresh each build (no `perBuild` needed)
- Static values don't need function wrapper
- Include JSDoc with usage examples

---
name: builder-factory
version: 4.0.0
lastUpdated: 2026-02-13
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

## Important Notes

- Always use `mimicry-js` (NOT test-data-bot or Fishery)
- Check project-context.md for Faker locale configuration
- Use `sequence()` for numeric IDs, `() => faker.string.uuid()` for UUIDs
- Use plain functions `() => ...` for values that should be fresh each time (no `perBuild` needed)
- Use built-in generators (`oneOf`, `int`, `bool`) where they replace simple Faker calls
- Use `.many(count)` instead of `Array.from({ length: count }, () => builder.one())`
- Static values don't need function wrapper
- Include JSDoc with usage examples

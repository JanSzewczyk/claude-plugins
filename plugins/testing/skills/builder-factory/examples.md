# Builder Examples

Complete examples of mimicry-js builders for various use cases.

> **Note:** Check `.claude/project-context.md` for your specific Faker locale and project types.

## Complete Builder with Traits

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker"; // Check project-context.md for locale
import type { User } from "~/types/user";

export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    email: () => faker.internet.email(),
    firstName: () => faker.person.firstName(),
    lastName: () => faker.person.lastName(),
    role: "user",
    isActive: true,
  },
  traits: {
    admin: {
      overrides: {
        role: "admin",
        email: () => faker.internet.email({ provider: "company.com" }),
      },
    },
    inactive: {
      overrides: {
        isActive: false,
      },
    },
    guest: {
      overrides: {
        role: "guest",
        firstName: "Guest",
        lastName: () => faker.string.numeric(4),
      },
    },
  },
});

// Usage examples:
// userBuilder.one()
// userBuilder.one({ traits: "admin" })
// userBuilder.one({ traits: ["admin", "inactive"] })
// userBuilder.one({ overrides: { firstName: "Jan" } })
// userBuilder.many(5)
// userBuilder.many(3, { traits: "admin" })
```

## Builder with postBuild Hook

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker"; // Check project-context.md for locale
import type { Order } from "~/types/order";

export const orderBuilder = build<Order>({
  fields: {
    id: sequence(),
    userId: sequence(),
    products: () => productBuilder.many(3),
    totalAmount: 0,
    status: oneOf("pending", "processing"),
    createdAt: () => faker.date.recent(),
    shippingAddress: () => addressBuilder.one(),
  },
  postBuild: (order) => {
    order.totalAmount = order.products.reduce((sum, p) => sum + p.price, 0);
    return order;
  },
  traits: {
    bigOrder: {
      overrides: {
        products: () => productBuilder.many(10),
      },
    },
  },
});
```

## Nested Builders

```typescript
import { build, sequence } from "mimicry-js";
import { faker } from "@faker-js/faker"; // Check project-context.md for locale

// Address builder
export const addressBuilder = build<Address>({
  fields: {
    street: () => faker.location.streetAddress(),
    city: () => faker.location.city(),
    zipCode: () => faker.location.zipCode(),
    country: "USA", // Check project-context.md for your locale
  },
});

// User builder with address
export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    name: () => faker.person.fullName(),
    address: () => addressBuilder.one(),
  },
});

// Override nested
const user = userBuilder.one({
  overrides: {
    address: addressBuilder.one({ overrides: { city: "New York" } }),
  },
});
```

## Database Application Type Builder

> **Note:** Check project-context.md for your specific database type patterns (Firestore, PostgreSQL, MongoDB, etc.)

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker"; // Check project-context.md for locale
import type {
  Resource,
  ResourceBase,
} from "~/features/resource/types/resource";

// Base type builder (for DTOs)
export const resourceBaseBuilder = build<ResourceBase>({
  fields: {
    name: () => faker.commerce.productName(),
    status: "active",
    category: () => faker.commerce.department(),
  },
  traits: {
    inactive: {
      overrides: {
        status: "inactive",
      },
    },
    pending: {
      overrides: {
        status: "pending",
      },
    },
  },
});

// Application type builder (with id and timestamps)
export const resourceBuilder = build<Resource>({
  fields: {
    id: () => faker.string.uuid(),
    name: () => faker.commerce.productName(),
    status: "active",
    category: () => faker.commerce.department(),
    createdAt: () => faker.date.past(),
    updatedAt: () => faker.date.recent(),
  },
  traits: {
    inactive: {
      overrides: {
        status: "inactive",
      },
    },
    pending: {
      overrides: {
        status: "pending",
      },
    },
  },
});
```

## Helper Functions Pattern

```typescript
export const createTestUsers = {
  admin: () => userBuilder.one({ traits: "admin" }),
  guest: () => userBuilder.one({ traits: "guest" }),
  inactive: () => userBuilder.one({ traits: "inactive" }),
  withCustomEmail: (email: string) => userBuilder.one({ overrides: { email } }),
  list: (count: number) => userBuilder.many(count),
};

// Usage
const admin = createTestUsers.admin();
const users = createTestUsers.list(5);
```

## Computed Fields with postBuild

```typescript
import { build, sequence, int } from "mimicry-js";

export const accountBuilder = build<Account>({
  fields: {
    id: sequence(),
    balance: int(0, 10000),
    type: "basic",
    creditLimit: 0,
  },
  postBuild: (account) => {
    switch (account.type) {
      case "premium":
        account.creditLimit = 5000;
        break;
      case "vip":
        account.creditLimit = 20000;
        break;
      default:
        account.creditLimit = 0;
    }
    return account;
  },
  traits: {
    premium: { overrides: { type: "premium" } },
    vip: { overrides: { type: "vip" } },
  },
});
```

## Deterministic Tests with Seed

```typescript
import { build, sequence, oneOf, int, seed } from "mimicry-js";

const userBuilder = build<User>({
  fields: {
    id: sequence(),
    role: oneOf("admin", "user", "guest"),
    score: int(0, 100),
  },
});

// Set seed for reproducible results
seed(42);
const users = userBuilder.many(3); // Always same results with same seed
```

## Builder with withPrev (Dependent Values)

```typescript
import { build, withPrev } from "mimicry-js";

export const timeEntryBuilder = build<TimeEntry>({
  fields: {
    startedAt: withPrev((prev?: number) => {
      const timestamp = prev ?? new Date("2025-01-01").getTime();
      return timestamp + 3600000; // +1 hour from previous
    }),
    duration: int(30, 120),
  },
});

// Generates entries with incrementing timestamps
const entries = timeEntryBuilder.many(5);
```

## Builder with Reset

```typescript
const builder = build<Item>({
  fields: {
    id: sequence(), // 1, 2, 3...
    name: unique(["Alpha", "Beta", "Gamma"]),
  },
});

builder.many(3); // ids: 1, 2, 3
builder.reset(); // Reset sequence and unique counters
builder.many(3); // ids: 1, 2, 3 again
```

## Generator Placement: Top-Level vs Arrow Functions

mimicry-js generators are field-level descriptors resolved by the library. They only work at the top level of `fields` or in static nested objects. Inside arrow functions, use Faker instead.

### Correct: Generators at top level, Faker inside arrow functions

```typescript
import { build, sequence, oneOf, int, bool } from "mimicry-js";
import { faker } from "@faker-js/faker";

export const productBuilder = build<Product>({
  fields: {
    // Top level — mimicry-js generators work here
    id: sequence(),
    status: oneOf("draft", "published", "archived"),
    rating: int(1, 5),
    featured: bool(),

    // Arrow function — use Faker for random selection
    metadata: () => ({
      source: faker.helpers.arrayElement(["import", "manual", "api"]),
      tags: faker.helpers.arrayElements(["sale", "new", "popular"], {
        min: 1,
        max: 2,
      }),
      priority: faker.number.int({ min: 1, max: 10 }),
    }),

    // Nested builder — arrow function for fresh data each call
    category: () => categoryBuilder.one(),
  },
});
```

### Correct: Static nested objects (generators work recursively)

```typescript
import { build, sequence, oneOf } from "mimicry-js";

export const accountBuilder = build<Account>({
  fields: {
    id: sequence(),
    // Static nested object — mimicry-js processes recursively
    address: {
      street: oneOf("123 Main St", "456 Elm Ave"),
      city: oneOf("New York", "Los Angeles"),
      zipCode: sequence((n) => String(10000 + n)),
    },
    // Static nested object with generators
    settings: {
      theme: oneOf("light", "dark"),
      language: oneOf("en", "pl", "de"),
    },
  },
});
```

### Wrong: Generators inside arrow functions

```typescript
// DO NOT do this — generators won't be resolved
export const productBuilder = build<Product>({
  fields: {
    metadata: () => ({
      source: oneOf("import", "manual"), // WRONG — returns descriptor object
      priority: int(1, 10), // WRONG — returns descriptor object
    }),
    items: () =>
      Array.from({ length: 3 }, () => ({
        id: sequence(), // WRONG — won't auto-increment
        type: oneOf("a", "b"), // WRONG — returns descriptor object
      })),
  },
});
```

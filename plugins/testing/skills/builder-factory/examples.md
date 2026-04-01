# Builder Examples

Complete examples of mimicry-js builders for various use cases.

> **Note:** Check `.claude/project-context.md` for your specific Faker locale and project types.
> For generator placement rules (top-level vs arrow functions), see the "Generator Placement Rules" section in SKILL.md.

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
import { faker } from "@faker-js/faker";
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

## Per-Call postBuild Override

```typescript
// Override postBuild for a single call without changing the builder definition
const discountedOrder = orderBuilder.one({
  postBuild: (order) => {
    order.totalAmount =
      order.products.reduce((sum, p) => sum + p.price, 0) * 0.9;
    return order;
  },
});
```

## Nested Builders with Deep Merging

```typescript
import { build, sequence } from "mimicry-js";
import { faker } from "@faker-js/faker";

export const addressBuilder = build<Address>({
  fields: {
    street: () => faker.location.streetAddress(),
    city: () => faker.location.city(),
    zipCode: () => faker.location.zipCode(),
    country: "USA",
  },
});

export const userBuilder = build<User>({
  fields: {
    id: sequence(),
    name: () => faker.person.fullName(),
    address: () => addressBuilder.one(),
  },
});

// Deep merging — only patches specified keys, keeps the rest
const user = userBuilder.one({
  overrides: {
    address: { city: "New York" }, // street, zipCode, country remain
  },
});

// Full override — replace address entirely
const user2 = userBuilder.one({
  overrides: {
    address: addressBuilder.one({
      overrides: { city: "Warsaw", country: "Poland" },
    }),
  },
});
```

## Database Application Type Builder

> **Note:** Check project-context.md for your specific database type patterns.

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker";
import type {
  Resource,
  ResourceBase,
} from "~/features/resource/types/resource";

// Base type builder (for DTOs — without id, timestamps)
export const resourceBaseBuilder = build<ResourceBase>({
  fields: {
    name: () => faker.commerce.productName(),
    status: "active",
    category: () => faker.commerce.department(),
  },
  traits: {
    inactive: { overrides: { status: "inactive" } },
    pending: { overrides: { status: "pending" } },
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
    inactive: { overrides: { status: "inactive" } },
    pending: { overrides: { status: "pending" } },
  },
});
```

## Discriminated Union Types

For TypeScript discriminated unions, create a separate builder per variant:

```typescript
import { build, sequence, int } from "mimicry-js";
import { faker } from "@faker-js/faker";

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number };

export const circleBuilder = build<Extract<Shape, { kind: "circle" }>>({
  fields: {
    kind: "circle",
    radius: int(1, 100),
  },
});

export const rectangleBuilder = build<Extract<Shape, { kind: "rectangle" }>>({
  fields: {
    kind: "rectangle",
    width: int(1, 200),
    height: int(1, 200),
  },
});

// For a random shape, use a helper:
const randomShape = (): Shape =>
  Math.random() > 0.5 ? circleBuilder.one() : rectangleBuilder.one();
```

## Builder Composition (Extending Builders)

When types share a common base, avoid duplicating fields — define the base fields once and spread them:

```typescript
import { build, sequence, oneOf } from "mimicry-js";
import { faker } from "@faker-js/faker";
import type { BaseUser, AdminUser, GuestUser } from "~/types/user";

// Shared base fields
const baseUserFields = {
  id: sequence(),
  email: () => faker.internet.email(),
  name: () => faker.person.fullName(),
  createdAt: () => faker.date.past(),
} as const;

export const adminUserBuilder = build<AdminUser>({
  fields: {
    ...baseUserFields,
    role: "admin" as const,
    permissions: () =>
      faker.helpers.arrayElements(["users", "billing", "settings"], {
        min: 1,
        max: 3,
      }),
    department: () => faker.commerce.department(),
  },
});

export const guestUserBuilder = build<GuestUser>({
  fields: {
    ...baseUserFields,
    role: "guest" as const,
    expiresAt: () => faker.date.future(),
  },
});
```

## Recursive Types

For tree-like recursive structures, use a depth-limited approach:

```typescript
import { build, sequence } from "mimicry-js";
import { faker } from "@faker-js/faker";

interface TreeNode {
  id: number;
  label: string;
  children: TreeNode[];
}

// Leaf node builder (no children)
export const leafNodeBuilder = build<TreeNode>({
  fields: {
    id: sequence(),
    label: () => faker.lorem.word(),
    children: [],
  },
});

// Branch node builder (with children)
export const treeNodeBuilder = build<TreeNode>({
  fields: {
    id: sequence(),
    label: () => faker.lorem.word(),
    children: () => leafNodeBuilder.many(3),
  },
});

// For deeper nesting, use postBuild:
const deepTree = treeNodeBuilder.one({
  postBuild: (node) => {
    node.children = node.children.map((child) => ({
      ...child,
      children: leafNodeBuilder.many(2),
    }));
    return node;
  },
});
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
import { build, withPrev, int } from "mimicry-js";

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
import { build, sequence, unique } from "mimicry-js";

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

## Static Nested Objects (Generators Work Recursively)

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
    settings: {
      theme: oneOf("light", "dark"),
      language: oneOf("en", "pl", "de"),
    },
  },
});
```

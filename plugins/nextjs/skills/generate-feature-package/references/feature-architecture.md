---
paths:
  - "features/**/*.ts"
  - "features/**/*.tsx"
---

# Feature architecture

Portable spec for feature-driven packages on a **Next.js App Router + typed ORM + Zod + Server
Actions** stack. Each feature (`features/{domain}/`) is a self-contained domain slice. `{domain}` /
`{entity}` are placeholders; examples use a neutral domain (`orders`). Return-type contracts are
named by *role* ("tuple result", "typed action response") — bind them to your project's types.

## Guiding principle

> **One barrel per zone = that zone's public API. A zone's nature (client-safe vs server-only) is
> declared by the presence of `import "server-only"` in its barrel.**

A feature is split into zones; each exposes exactly one entry point (`index.ts`); the files behind
it are private. There is **no feature-root `index.ts`** — consumers aim at a specific zone barrel,
choosing client vs server entry deliberately.

## Directory structure

```
features/{domain}/
├── components/
│   ├── forms/
│   ├── {component}.tsx
│   ├── {component}.stories.tsx
│   └── index.tsx                   # barrel — components only
├── constants/index.ts
├── schemas/
│   ├── {entity}.schema.ts          # Zod + exported *FormData types
│   ├── {entity}.schema.test.ts
│   └── index.ts
├── types/
│   ├── {entity}.ts                 # shared, client-safe domain types
│   └── index.ts
├── server/                         # server-only zone
│   ├── actions/{verb}-{noun}.action.ts, logger.ts, map-service-error.ts
│   ├── api/{helper}.ts             # optional: external-integration helpers
│   ├── db/schema.ts, queries.ts, mutations.ts, index.ts
│   ├── services/{entity}.service.ts
│   ├── permissions.ts
│   └── index.ts                    # barrel — server public API, `import "server-only"`
└── test/builders/{entity}.builder.ts, index.ts
```

## Zones & barrels

| Zone barrel | Public API | `server-only`? | From `"use client"`? |
|---|---|---|---|
| `types/index.ts` | domain types, enum const+type | ✗ | ✓ |
| `schemas/index.ts` | Zod schemas + `*FormData` | ✗ | ✓ |
| `constants/index.ts` | constants | ✗ | ✓ |
| `components/index.tsx` | components only (no types, no `server/` re-exports) | ✗ | ✓ |
| **`server/index.ts`** | actions + services + db | **✓** | ✗ (build error) |
| `test/builders/index.ts` | builders | ✗ | tests only |

- **Consumers import from a zone barrel, never a file path inside the zone.** Files inside `server/`
  are private — the internal layout can be refactored without breaking callers.
- `server/db/index.ts` is an internal sub-barrel (schema + queries + mutations), re-exported by
  `server/index.ts`. No `server/actions/index.ts` or `server/services/index.ts` — deeper barrels are noise.

```ts
// ✓ client / page — client-safe barrels
import { OrderStatus, type OrderListItem } from "~/features/orders/types";
import { OrderRow } from "~/features/orders/components";
// ✓ server / page — single server entry
import { getOrders, createOrderAction } from "~/features/orders/server";
// ✗ deep path into server/ (private)        ✗ feature-root barrel (does not exist)
import { getOrders } from "~/features/orders/server/services/order.service";
import { OrderRow } from "~/features/orders";
```

## Server / client boundary

**A client component (`"use client"`) must NEVER import from `server/` — not even via `import
type`.** Type-only imports are runtime-erased (the bundle survives), but they couple the component
to ORM internals and encourage keeping DTOs in `server/` instead of `types/`. Same ban applies to
`*.stories.tsx`. Client-safe zones (`types/`, `schemas/`, `constants/`, `components/`) must have
zero transitive dependency on `server/`.

Defense in depth: put `import "server-only"` not only in `server/index.ts` but in every leaf server
file (`*.service.ts`, `permissions.ts`, `db/queries.ts`, `db/mutations.ts`, `api/*.ts`).

## `types/` — shared types

The **only** path from which client components may import domain types; importable everywhere; zero
dependencies on `server/`.

| Lives in `types/` | Stays in `server/db/schema.ts` |
|---|---|
| Domain enum const + type (`OrderStatus`) | ORM relational query result types |
| Service result / DTO / view types (`OrderListItem`, `OrderDetail`) | Raw row types (`$inferSelect` / equiv.) |
| Filter / option types | ORM enum definitions (`pgEnum` / equiv.) |

ORM-bound types reference ORM internals and never appear in component props.

### Domain enum const + type

```ts
// features/orders/types/order.ts
export const OrderStatus = { DRAFT: "DRAFT", PLACED: "PLACED", SHIPPED: "SHIPPED" } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const OrderStatuses = Object.values(OrderStatus) as Array<OrderStatus>;
```

Don't annotate the const with `Record<OrderStatus, OrderStatus>` — it widens values to the union and
breaks computed-key records and `Extract<>` narrowing. `as const` alone preserves literals; add
`satisfies` only to enforce an external constraint without widening. The ORM enum uses string
literals directly and does not import from `types/`.

## Naming & file extensions

**Rule A — when a file gets a role-suffix:**
- *Structural singleton* (one per folder, filename IS the role) → **no suffix**: `queries.ts`,
  `mutations.ts`, `schema.ts`, `permissions.ts`, `logger.ts`, `map-service-error.ts`, `index.ts`.
  A component is also suffix-free — role comes from the `components/` folder.
- *Domain-named file among same-role siblings* → **suffix** re-attaches the role:
  `*.action.ts`, `*.service.ts`, `*.builder.ts`, `*.schema.ts`, `*.stories.tsx`, `*.test.ts`.
- Test: *"will this folder hold many files of this role, each differently named?"* yes → suffix.

**Rule B — notation:** `<domain-name>.<role>.<ext>`. Dot = name↔role boundary; dash = words within
the name. `line-item.schema.ts` is unambiguous; `line-item-schema.ts` is not — so **all suffixes are
dotted, schemas included**.

| Role | File |
|---|---|
| action / service / schema / builder / story / test | `create-order.action.ts`, `line-item.service.ts`, `order.schema.ts`, `order.builder.ts`, `order-card.stories.tsx`, `line-item.service.test.ts` |
| db queries/mutations/schema, permissions, component | `queries.ts`, `permissions.ts`, `order-card.tsx` (no suffix) |

`index.ts` when no JSX; `index.tsx` only when it contains JSX.

## Layers & return types

```
Action → Service → Permission → DB        (each imports only downward)
             ↓              ↓
           Schema (Zod)   DB schema (ORM)
types/ ← imported by all layers, no restriction
```

| Layer | Return shape |
|---|---|
| DB queries / mutations | tuple result → `[error, null] \| [null, data]` |
| Permissions | tuple result of `void` |
| Service reads | tuple result — wrap with `React.cache()` |
| Service mutations | service result (typed error + data) |
| Actions | typed action response (discriminated `success` union) |

Keep the error/action-response contracts in shared modules, not re-declared per feature.

### Service mutation guard chain (always in this order)

```ts
const [roleErr] = await requireRole(userId, [Role.OWNER]);                 if (roleErr) return [roleErr, null];
const [profileErr, profile] = await getCachedProfile(userId);             if (profileErr) return [profileErr, null];
const [permErr] = await canAddOrder(profile.id);  // canDoX from permissions.ts
if (permErr) return [permErr, null];
const [dbErr, result] = await ...;                                         if (dbErr) return [dbErr, null];
return [null, result];
```

### Action pattern

```ts
"use server";
export async function createOrderAction(data: OrderFormData): ActionResponse<Order> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) return { success: false, error: "Not signed in" };
  const [error, order] = await createOrder(userId, data);
  if (error) return mapServiceError(error);          // translate code → user string, never expose codes
  revalidatePath("/app/orders");                     // only on success
  return { success: true, data: order, message: "Order created" };
}
```

No business logic in actions — delegate to the service.

## Components

Both server and client components live here. Default to **Server Components** (no directive, can be
`async`); add `"use client"` only for hooks, browser APIs, or event handlers.

| Component | Import `server/`? | Import `types/`? |
|---|---|---|
| Server | ✓ (via `server/index.ts`) | ✓ |
| Client (`"use client"`) | ✗ never, not even `import type` | ✓ |

Server actions reach client components as **props** from the page/layout — never imported directly.
Co-locate `{component}.stories.tsx`. Skip `useMemo`/`useCallback`/`memo` under the React Compiler.

## DB layer

- Categorize every caught error into a service-error type in each `catch` — never throw across a layer.
- Multi-step writes use a transaction **owned by the service layer**; it passes the tx client down
  via `dbClient`, and a thrown DB error rolls back.
- DTO / view types live in `types/`; queries import them for return annotations.
- Cross-feature DB ops live in a shared feature (e.g. `features/shared/server/db/{entity}/`), not duplicated.

```ts
// every DB function: single object arg incl. optional client for tx participation
export async function updateOrder({ orderId, data, dbClient = db }: {
  orderId: string; data: OrderData; dbClient?: DbClient;
}): Promise<ServiceResult<Order>> { ... }
```

## Permissions

```ts
import "server-only";
export async function canAddOrder(ownerId: string): Promise<ServiceResult<void>> {
  if (overLimit) return [limitExceededError(max), null];
  return [null, undefined];
}
```

## Test builders

One builder per entity, re-exported from `test/builders/index.ts`. **A builder lives in the feature
that owns its type** — other features import it from there, never duplicate it. Builders import from
`types/`, never from `server/` (they run in the test environment).

```ts
export const orderBuilder = build<Order>({
  fields: { id: () => faker.string.uuid(), total: () => faker.number.int({ min: 1, max: 1000 }) },
  traits: { cancelled: { overrides: { status: OrderStatus.CANCELLED } } }
});
```

## Logging

```ts
const logger = createLogger({ module: "{domain}-service" });
logger.error({ userId, operation: "createOrder", errorCode: err.code }, "DB insert failed");
```

Always include `userId`, `operation`, `errorCode` on failures. Log where the error originates — don't re-log higher up.

## New feature checklist

- [ ] `types/` (+ `index.ts`) — enums, DTO/view types, filters
- [ ] `schemas/{entity}.schema.ts` (+ `index.ts`) — Zod + `*FormData`
- [ ] `server/db/` — `schema.ts`, `queries.ts`, `mutations.ts`, `index.ts`
- [ ] `server/permissions.ts` — `canDoX`, `import "server-only"`
- [ ] `server/services/{entity}.service.ts` — guard chain, `cache()` on reads, `server-only`
- [ ] `server/actions/{verb}-{noun}.action.ts` + `map-service-error.ts` + `logger.ts`
- [ ] `server/index.ts` — single server barrel, `import "server-only"`
- [ ] `components/` — co-located stories; client components never import from `server/`
- [ ] `test/builders/` — import from `types/`, not `server/`
- [ ] No feature-root `index.ts`; names follow Rule A & B
- [ ] Schema + action unit tests

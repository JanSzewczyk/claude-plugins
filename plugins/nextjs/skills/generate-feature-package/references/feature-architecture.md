# Feature architecture

Portable spec for feature-driven packages on a **Next.js App Router + typed ORM + Zod + Server
Actions** stack. Each feature (`features/{domain}/`) is a self-contained domain slice. `{domain}` /
`{entity}` are placeholders; examples use a neutral domain (`orders`). Return-type contracts are
named by *role* ("tuple result", "typed action response") — bind them to your project's types.

## Directory structure

```
features/{domain}/
├── components/
│   ├── forms/
│   ├── {component}.tsx
│   ├── {component}.stories.tsx
│   └── index.tsx                   # barrel — components only
├── constants/
├── schemas/
│   ├── {domain}-schema.ts          # Zod + exported *FormData types
│   └── {domain}-schema.test.ts
├── server/
│   ├── actions/
│   │   ├── {verb}-{domain}.action.ts
│   │   ├── logger.ts               # createLogger({ module: "domain-actions" })
│   │   ├── map-service-error.ts    # error code → user-facing message
│   │   └── {domain}-actions.test.ts
│   ├── db/
│   │   ├── schema.ts               # data model + inferred row types — never re-exported from index.ts
│   │   ├── queries.ts              # read operations, one per function
│   │   ├── mutations.ts            # write operations, one per function
│   │   └── index.ts                # re-exports queries + mutations only
│   ├── api/                        # optional — wrappers around external/third-party APIs
│   │   ├── {verb}-{resource}.ts    # one external-API concern per file
│   │   └── index.ts                # optional barrel
│   ├── services/
│   │   └── {domain}.service.ts     # orchestration only, no raw persistence calls
│   └── permissions.ts              # canDoX guard functions
├── types/
│   ├── {entity}.ts                 # shared types (see section below)
│   ├── {filter}.ts
│   └── index.ts                    # barrel — re-exports all types/
├── utils/                          # optional — pure, framework-free logic (reducers, formatters,
│   ├── {name}.ts                   # URL/query builders); every file here should be unit-tested
│   └── {name}.test.ts
├── context/                        # optional — only files that call `React.createContext`
│   └── {name}.context.tsx          # Context + Provider + consumer hook, co-located in one file
├── hooks/                          # optional — client hooks that don't define a Context
│   └── use-{name}.ts               # standalone hook, or one that builds on a context/ consumer hook
└── test/
    └── builders/
        ├── {entity}.builder.ts     # mimicry-js + faker
        └── index.ts
```

`constants/`, `utils/`, `context/`, and `hooks/` are only added when a feature actually needs them —
add on demand, don't scaffold empty folders for them.

- `utils/` — pure, framework-free (no React imports), unit-tested.
- `context/` — files named `{name}.context.tsx`, each holding the code around **one**
  `React.createContext` call: the context object, its `Provider`, and the consumer hook that reads
  it (e.g. `useTemplateEditor`), co-located in one file.
- `hooks/` — general-purpose React hooks that do **not** define their own Context: standalone
  client-side logic (state, effects, polling, subscriptions), or hooks that build extra
  functionality on top of a `context/` consumer hook. A hook whose job is to create/expose a
  Context belongs in `context/`, not here.

**No top-level `index.ts`** for the feature — import from sub-paths directly:
`import { TemplateCard } from "~/features/templates/components"` ✓, never `.../templates` ✗.
Within `server/`, consumers import from the specific file that owns what they need (e.g.
`~/features/orders/server/services/order.service`) — there is **no** `server/index.ts` barrel;
only `server/db/index.ts` exists, and only to re-export `queries` + `mutations`.

---

## Server / client boundary

The most important architectural rule. Code splits into three zones:

| Zone         | Directory                               | Notes                                              |
| ------------ | ---------------------------------------- | --------------------------------------------------- |
| Server-only  | `server/`                                | May carry `import "server-only"`; never client-imported |
| Shared types | `types/`                                 | No dependency on `server/`; importable anywhere    |
| Universal    | `components/`, `schemas/`, `constants/`  | Used by both server and client code                |

**Client components (`"use client"`) must NEVER import from `server/`.** Server modules often
carry `import "server-only"` (services, permissions) — importing them client-side is a build
error; even without that guard, leaking ORM types or server logic into client code is wrong.
`schemas/` and `constants/` are not client-only: Zod schemas validate on both server actions and
client forms, and constants are consumed everywhere.

```ts
// ✓ client component — from types/ and components/
import { OrderStatus, type ClientOrderListItem } from "~/features/orders/types/order";
import { OrderStatusBadge } from "~/features/orders/components";

// ✓ server component/page — server/ is fine, imported directly (no single barrel)
import { getClientOrders } from "~/features/orders/server/services/order.service";

// ✗ client component — never from server/
import { OrderStatus } from "~/features/orders/server/db/schema";
```

---

## `types/` — shared types between server and client

The **only** path from which client components may import domain types. All code may import here.

| Type category               | Example                                        | Why here                                          |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Domain enum const + type    | `OrderStatus`                                  | Used in component props and server queries alike  |
| Service result / DTO types  | `ClientOrderListItem`, `ClientOrderDetail`     | Returned by services, received as component props |
| Public view types           | `PublicOrderView`                              | Used in both server pages and client components   |
| Filter / option types       | `OrderStatusFilter`, `OrderListOptions`        | Passed from server to components as query params  |
| Cross-domain list items     | `ClientContractorListItem`                     | Passed from server to client card/table components|

Types tightly coupled to the persistence layer (raw row types, relation-query result types,
ORM-specific enum definitions) stay in `server/db/schema.ts` — they're used only inside
`server/db/queries.ts` and `server/services/*.service.ts` and never appear in component props.

### Pattern for domain enum const + type

Define the enum as a `const` object in `types/`, derive the type from it — never annotate with
`Record<Enum, Enum>` (widens the union and breaks `Extract<>` narrowing):

```ts
// features/orders/types/order.ts
export const OrderStatus = {
  DRAFT: "DRAFT",
  PLACED: "PLACED",
  SHIPPED: "SHIPPED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const OrderStatuses = Object.values(OrderStatus) as Array<OrderStatus>;
```

The equivalent enum in `server/db/schema.ts` uses string literals directly and does not import
from `types/` — it stays independent so `server/` never depends on a client-importable module.

### `types/index.ts` barrel

Every `types/` directory has an `index.ts` re-exporting all sub-files: `export * from "./order";`.

### Service re-exports (optional)

A service may re-export the types it uses so callers have one stable import point, e.g.
`export type { ClientOrderListItem } from "~/features/orders/types/order";` inside
`order.service.ts`. The underlying types still live in `types/`.

---

## Layer dependency rules (one direction only)

```
Action → Service → Permission → DB / API
             ↓              ↓
           Schema (Zod)   Data model schema

types/ ← imported by all layers, no restriction
```

Each layer imports only downward, never from the layer above. `types/` is the exception — no
dependencies of its own, importable by any layer.

---

## Return types per layer

| Layer                  | Type                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| DB queries / mutations | tuple result → `[error, null] \| [null, data]`                           |
| Permissions            | tuple result of `void`                                                   |
| Service reads          | tuple result — wrap with `React.cache()`                                |
| Service mutations      | service result (typed error + data)                                     |
| Actions                | typed action response (discriminated `success` union)                   |

Keep the concrete error/action-response contracts (e.g. `ServiceResult`, `ActionResponse`,
`BaseServiceError`) in shared modules outside the feature, not re-declared per feature.

---

## Service mutation guard chain (always in this order)

```ts
const [roleErr] = await requireRole(userId, [Role.OWNER]);
if (roleErr) return [roleErr, null];

const [profileErr, profile] = await getCachedProfile(userId);
if (profileErr) return [profileErr, null];

const [permErr] = await canAddOrder(profile.id); // feature-specific guard from permissions.ts
if (permErr) return [permErr, null];

const [dbErr, result] = await ...; // DB mutation
if (dbErr) return [dbErr, null];

return [null, result];
```

---

## Action pattern

```ts
"use server";
export async function createOrderAction(data: OrderFormData): ActionResponse<Order> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) return { success: false, error: "Not signed in" };

  const [error, order] = await createOrder(userId, data);
  if (error) return mapOrderServiceError(error);

  revalidatePath("/app/orders");
  return { success: true, data: order, message: "Order created" };
}
```

No business logic in actions — delegate entirely to the service. `revalidatePath` only on success.
`map-service-error.ts` translates the service error code to a user-facing string; never expose
internal codes.

---

## Components

`components/` holds **both server and client components** — no fixed rule about which, each file
is what it needs to be. Names are domain-driven, not pattern-constrained. Subdirectories (`forms/`,
`portal/`) are used when grouping helps.

Default to **Server Components** (no directive, can be `async`). Add `"use client"` only for React
hooks, browser APIs, or event handlers that can't be passed down as server-action props.

| Component type                    | Import from `server/`? | Import from `types/`? |
| ---------------------------------- | ------------------------ | ------------------------ |
| Server component                  | ✓ Yes                   | ✓ Yes                   |
| Client component (`"use client"`) | ✗ Never                 | ✓ Yes                   |

Server actions are passed as props to client components from the page/layout — client components
never import actions directly:

```ts
// page (server) wires the action in
<OrderSidebar onUpdateStatusAction={updateOrderStatusAction} />
// client component receives it typed via types/
type Props = { onUpdateStatusAction(id: string, status: OrderStatus): ActionResponse<void> };
```

Other rules:
- Never `useMemo` / `useCallback` / `memo` — React Compiler handles memoization.
- Button icons via `startIcon` / `endIcon` props, not children.
- Forms: React Hook Form + Zod resolver for complex forms; `useActionState` for simple ones.
- Co-locate `{component}.stories.tsx` next to every component file.
- `components/index.tsx` barrel exports named components only — no types, no `server/` re-exports.

---

## `db/` — persistence layer

The only place a feature talks to its data store. **Technology-agnostic at the architecture
level** — the rules below describe each file's role, not any particular ORM/database/driver. If
this project has a canonical DB-patterns rule (e.g. `.claude/rules/db-patterns.md`), that's the
reference for concrete implementation (schema syntax, client imports, transaction helper, error
categorization); this section is the structure/role definition that holds even if the database
changed.

| File           | Role                                                                        |
| -------------- | ----------------------------------------------------------------------------- |
| `schema.ts`    | Data model definitions + row/entity types inferred from them                 |
| `queries.ts`   | Read operations, one per function                                            |
| `mutations.ts` | Write operations (create/update/delete), one per function                    |
| `index.ts`     | Re-exports `queries` + `mutations` only — **never** re-exports `schema.ts`   |

Anything needing a `schema.ts` type imports it directly from `./schema` (or from the feature's
`types/`, if it's a DTO meant for callers outside `server/`) — `db/index.ts` is the entry point
for operations, not for the data model itself.

### Flat vs. nested layout

- **One domain schema** → flat: `schema.ts` / `queries.ts` / `mutations.ts` / `index.ts` sit
  directly in `db/`.
- **Two or more domain schemas** → nested: each schema gets its own subfolder under `db/`, named
  after it, with its own full set of those four files — same rule applies at every level
  (`index.ts` re-exports `queries`/`mutations` only). Don't mix a flat top-level schema with
  subfolders — once a second schema appears, every schema moves into its own subfolder.

```
server/db/                          server/db/  (2+ schemas)
├── schema.ts                       ├── index.ts            # re-exports all subfolders
├── queries.ts                      ├── {schema-a}/{schema.ts,queries.ts,mutations.ts,index.ts}
├── mutations.ts                    └── {schema-b}/{schema.ts,queries.ts,mutations.ts,index.ts}
└── index.ts
```

Rules that apply regardless of the underlying persistence technology:

- **One operation per function, no orchestration.** DB functions never call other DB functions —
  atomic multi-step composition belongs in the service layer.
- **Single object argument**, including an optional client/connection param so the function can
  run standalone or inside a transaction.
- **Transactions belong to the service layer.** A DB function throws on failure when called inside
  a transaction; the service owns `try/catch` and rollback.
- **Never throw across the layer boundary otherwise** — every DB function returns the project's
  result-tuple type and categorizes errors where they originate.
- **DTO/view types** live in `types/`, not in `queries.ts` — query functions import them for their
  return-type annotations.
- **Cross-entity operations** (touching an entity owned by another feature) live in
  `features/shared/server/db/{entity}/mutations.ts`, never duplicated into the calling feature.
- Register new tables/collections in the project's central schema registry, if one exists.
- Logger: `createLogger({ module: "domain-db" })`.

---

## `api/` — external API integrations (optional)

Added only when a feature calls a third-party API directly (auth provider, billing API, payment
gateway), as opposed to its own persistence layer. Not scaffolded by default.

```
server/api/
├── {verb}-{resource}.ts     # one external-API concern per file, e.g. detect-plan.ts
└── index.ts                 # optional barrel
```

Same shape as `db/`: one function per file, single object argument where useful, result-tuple
return type, errors categorized at origin, never thrown across the layer boundary. `api/`
functions never call each other — composition happens in `services/`. Wrap read-heavy calls with
`cache()` the same way `db/` queries are, when safe to dedupe within a request.

---

## Permissions file

```ts
import "server-only";

export async function canAddOrder(ownerId: string): Promise<ServiceResult<void>> {
  if (overLimit) return [limitExceededError(max), null];
  return [null, undefined];
}
```

---

## Test builders

```ts
export const orderBuilder = build<Order>({
  fields: { id: () => faker.string.uuid(), total: () => faker.number.int({ min: 1, max: 1000 }) },
  traits: { cancelled: { overrides: { status: OrderStatus.CANCELLED } } }
});
```

One builder per entity, exported from `test/builders/index.ts`. Builders run in the test
environment, so the same import rule as client components applies: pull types from `types/`,
never from `server/db/schema`.

---

## Logging

`createLogger({ module: "{domain}-{layer}" })` per file (e.g. `domain-actions`, `domain-db`,
`orders-service`) — include `userId`/`operation`/`errorCode` on every failure log, and log where
the error originates rather than re-logging it higher up the call stack.

---

## New feature checklist

- [ ] `types/{entity}.ts` — domain const+type enums, DTO types, filter types
- [ ] `types/index.ts` — barrel re-exporting all type files
- [ ] `schemas/{domain}-schema.ts` — Zod + `*FormData` types
- [ ] `server/db/schema.ts` — data model + inferred types, registered in the central schema registry
- [ ] `server/db/queries.ts` + `mutations.ts` + `index.ts`
- [ ] `server/api/` — only if the feature calls an external API directly (optional)
- [ ] `server/permissions.ts` — `canDoX` guards
- [ ] `server/services/{domain}.service.ts` — guard chain, `cache()` on reads, re-export shared types
- [ ] `server/actions/{verb}-{domain}.action.ts` — thin, auth check, revalidate
- [ ] `server/actions/map-service-error.ts` + `logger.ts`
- [ ] `components/` — co-located stories, no imports from `server/` in client components
- [ ] `test/builders/` — builders import from `types/`, not from `server/`
- [ ] Schema unit tests + action unit tests

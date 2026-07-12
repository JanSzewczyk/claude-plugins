---
paths:
  - "**/server/**/*.ts"
---

# Database Patterns

Canonical implementations for Drizzle ORM + PostgreSQL (Supabase). Reference these patterns
exactly — do not invent alternatives.

Code blocks below use generic placeholders (`{Entity}`, `{entity}`, `{domain}`, `{parentId}`, …),
the same convention as `feature-architecture.md` — substitute your actual table, type, and
feature names. They are illustrative patterns, not literal excerpts from any specific project.

## Layer responsibilities

```
DB layer    → single SQL operation per function, no orchestration
Service     → orchestration, guard chain, transactions, cache()
```

DB functions never call other DB functions. If two SQL operations must be atomic, the service uses `withTransaction` — not the DB layer.

---

## Imports (copy exactly)

```ts
// DB layer
import { db, type DbClient } from "~/lib/supabase/db";
import { categorizeSupabaseError, SupabaseServiceError, type SupabaseServiceResult } from "~/lib/supabase/errors";

// Service layer (mutations)
import { withTransaction } from "~/lib/supabase/db";
import { categorizeSupabaseError } from "~/lib/supabase/errors";
import { type BaseServiceError, type ServiceResult } from "~/lib/services/errors";

// Service layer (reads)
import * as React from "react";
```

These live in the project's shared `lib/supabase/` (DB client, transaction helper, error
categorization) and `lib/services/` (service-layer error types) modules.

---

## Schema

Every table: `$inferSelect` for the read type, no separate type definitions.

```ts
// features/{domain}/server/db/schema.ts
export const {entities} = pgTable("{entities}", {
  id: uuid("id").primaryKey().defaultRandom(),
  {parentId}: varchar("{parent_id}", { length: 255 })
    .notNull()
    .references(() => {parentEntity}.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  items: jsonb("items").$type<Array<{EmbeddedItem}>>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export type {Entity} = typeof {entities}.$inferSelect;
```

`{Entity}` (the inferred row type) stays in `schema.ts` — but only as an internal implementation
detail, not because it's forbidden from ever reaching the client. It **can't** be relocated to
`types/` the way `{EmbeddedItem}` was: `$inferSelect` is derived from the `{entities}` table
object itself, so defining `{Entity}` in `types/` would require importing `{entities}` from
`server/db/schema.ts` there — exactly the `types/` → `server/` dependency the architecture
forbids.

When client code needs entity data, don't pass `{Entity}` to a component prop directly. Follow
`feature-architecture.md`'s DTO pattern instead: define a view type in `types/{entity}.ts` (e.g.
`Client{Entity}ListItem`) and have the service map `{Entity}` into it before returning —
structurally, the DTO can be identical to the row type (a plain `Pick`/mirrored shape), it just
must be declared independently in `types/` rather than imported from `schema.ts`.

`{EmbeddedItem}` (the shape of one item inside the `jsonb` column) is different: it almost always
also has to match a `schemas/{domain}-schema.ts` Zod field and a form/component prop for editing
the list — both of which live in zones that **cannot** import from `server/`. So define it in
`types/{entity}.ts` instead, and import it into `schema.ts` purely for the `.$type<Array<...>>()`
annotation:

```ts
// features/{domain}/types/{entity}.ts
export type {EmbeddedItem} = { title: string; description: string | null; orderIndex: number };
```

```ts
// features/{domain}/server/db/schema.ts
import type { {EmbeddedItem} } from "~/features/{domain}/types/{entity}";
```

Only keep an embedded type local to `schema.ts` (defined **before** the table, exported alongside
it) when it is genuinely internal — never referenced by a Zod schema, action, or component prop.

Register every new table in the project's central schema registry (e.g. `lib/supabase/schema.ts`).

Relations (for `with:` queries) go in a separate `relations()` call in the same file:

```ts
// features/{domain}/server/db/{entity}/schema.ts
export const {entity}Relations = relations({entity}, ({ one }) => ({
  {relatedEntity}: one({relatedEntities}, {
    fields: [{entity}.{relatedEntity}Id],
    references: [{relatedEntities}.id]
  })
}));
```

---

## DB function signature

Every function takes **one object argument** containing `dbClient?: DbClient = db`. This lets the same function run standalone or inside a transaction without any change at the call site.

```ts
export async function update{Entity}({
  id,
  updateInput,
  dbClient = db
}: {
  id: string;
  updateInput: Pick<{Entity}, "name" | "description" | "items">;
  dbClient?: DbClient;
}): Promise<SupabaseServiceResult<{Entity}>>
```

Parameter types are **derived from the Drizzle type**, never hand-written:
- `Pick<Table, "col1" | "col2">` for a subset
- `Partial<Pick<Table, ...>>` for optional updates — use this when every field can be
  independently omitted, e.g. a profile-style entity where each column is updated separately
- `Pick<Table, "col">` alone when the embedded type is needed (e.g. `{EmbeddedItem}`)

---

## Mutations (single SQL, no transaction)

Standard shape — every function logs at origin, returns `[error, null] | [null, result]`:

```ts
export async function create{Entity}({
  {parentId},
  create{Entity}Data,
  dbClient = db
}: {
  {parentId}: string;
  create{Entity}Data: Pick<{Entity}, "name" | "description" | "items">;
  dbClient?: DbClient;
}): Promise<SupabaseServiceResult<{Entity}>> {
  try {
    const [row] = await dbClient.insert({entities}).values({ {parentId}, ...create{Entity}Data }).returning();

    if (!row) {
      const error = SupabaseServiceError.unknown("Failed to insert {entity} — no row returned");
      logger.error({ {parentId}, errorCode: error.code }, "Insert returned no rows");
      return [error, null];
    }

    logger.info({ {parentId}, {entity}Id: row.id }, "Created {entity}");
    return [null, row];
  } catch (error) {
    const serviceError = categorizeSupabaseError(error, RESOURCE_NAME);
    logger.error({ {parentId}, errorCode: serviceError.code }, "Failed to create {entity}");
    return [serviceError, null];
  }
}
```

Always start the file with a `RESOURCE_NAME` constant (`const RESOURCE_NAME = "{Entity}"`). Use `categorizeSupabaseError` in every `catch` — never throw across layer boundaries.

### Upsert pattern

```ts
await dbClient
  .insert({parentEntities})
  .values({ id: {parentId}, ...data, updatedAt: new Date() })
  .onConflictDoUpdate({ target: {parentEntities}.id, set: { ...data, updatedAt: new Date() } })
  .returning();
```

---

## Queries

### getById

```ts
export async function get{Entity}ById({
  {entity}Id,
  dbClient = db
}: {
  {entity}Id: string;
  dbClient?: DbClient;
}): Promise<SupabaseServiceResult<{Entity}>> {
  try {
    const [{entity}] = await dbClient.select().from({entities}).where(eq({entities}.id, {entity}Id));
    if (!{entity}) return [SupabaseServiceError.notFound("{Entity}"), null];
    return [null, {entity}];
  } catch (error) {
    const serviceError = categorizeSupabaseError(error, "{Entity}");
    logger.error({ {entity}Id, errorCode: serviceError.code }, "Failed to get {entity}");
    return [serviceError, null];
  }
}
```

### Query with relations (`with:`)

Use `dbClient.query.<table>.findFirst()` when the schema has a `relations()` definition:

```ts
const row = await dbClient.query.{parentEntity}.findFirst({
  where: eq({parentEntity}.id, {parentId}),
  with: { {relatedEntity}: true }
});
```

Return type via `BuildQueryResult`:

```ts
export type {ParentEntity} = BuildQueryResult<TSchema, TSchema["{parentEntity}"], { with: { {relatedEntity}: true } }>;
```

Where `TSchema` comes from `~/lib/supabase/types`. Use this pattern when a query includes relations — do not manually compose the type.

### Paginated list

Fetch rows + count in `Promise.all`. Compute derived fields from fetched data, not SQL:

```ts
const [rows, countResult] = await Promise.all([
  dbClient.select().from({entities}).where(whereClause).orderBy(desc({entities}.updatedAt)).limit(perPage).offset(offset),
  dbClient.select({ value: count() }).from({entities}).where(whereClause)
]);

const items = rows.map((row) => ({
  itemsCount: row.items.length,          // computed from jsonb, not a subquery
  previewItems: row.items.slice(0, 3).map((s) => s.title),
  ...
}));
```

### Cached reads

Wrap with React `cache()` at the **query function level** for request deduplication:

```ts
export const getCached{ParentEntity} = React.cache(get{ParentEntity});
```

---

## Transactions (service layer only)

Use `withTransaction` from `~/lib/supabase/db`. Pass `tx` as `dbClient` to each DB function. Throw on error to trigger rollback — `categorizeSupabaseError` in the outer `catch` handles both Postgres errors and re-thrown `SupabaseServiceError` instances.

```ts
try {
  await withTransaction(async (tx) => {
    if ({relatedEntity} === null) {
      const [parentErr] = await update{ParentEntity}({ {parentId}, data: { ...fields, {relatedEntity}Id: null }, dbClient: tx });
      if (parentErr) throw parentErr;

      if (existing{RelatedEntity}Id) {
        const [delErr] = await delete{RelatedEntity}({ {relatedEntity}Id: existing{RelatedEntity}Id, dbClient: tx });
        if (delErr) throw delErr;
      }
    } else if (!existing{RelatedEntity}Id) {
      const [insErr, inserted{RelatedEntity}] = await insert{RelatedEntity}({ data: {relatedEntity}, dbClient: tx });
      if (insErr) throw insErr;

      const [parentErr] = await update{ParentEntity}({ {parentId}, data: { ...fields, {relatedEntity}Id: inserted{RelatedEntity}.id }, dbClient: tx });
      if (parentErr) throw parentErr;
    } else {
      const [updErr] = await update{RelatedEntity}({ {relatedEntity}Id: existing{RelatedEntity}Id, data: {relatedEntity}, dbClient: tx });
      if (updErr) throw updErr;

      const [parentErr] = await update{ParentEntity}({ {parentId}, data: fields, dbClient: tx });
      if (parentErr) throw parentErr;
    }
  });
} catch (error) {
  const serviceError = categorizeSupabaseError(error, "{ParentEntity}");
  logger.error({ userId, operation: "update{ParentEntity}", errorCode: serviceError.code }, "Transaction failed");
  return [serviceError, null];
}
```

After a successful transaction, **re-fetch** to return fresh data (not the pre-transaction snapshot):

```ts
const [fetchErr, updated] = await get{ParentEntity}({ {parentId}: userId });
```

---

## Cross-feature DB operations

DB functions that touch an entity owned by another feature live in `features/shared/server/db/{sharedEntity}/mutations.ts`. Never copy SQL into the calling feature.

```ts
// features/shared/server/db/{sharedEntity}/mutations.ts
export async function insert{SharedEntity}({ data, dbClient = db }: { data: {SharedEntity}Data; dbClient?: DbClient })
export async function update{SharedEntity}({ {sharedEntity}Id, data, dbClient = db }: ...)
export async function delete{SharedEntity}({ {sharedEntity}Id, dbClient = db }: ...)
```

Imported in the service as:

```ts
import { delete{SharedEntity}, insert{SharedEntity}, update{SharedEntity} } from "~/features/shared/server/db/{sharedEntity}";
```

---

## Multi-step mutations without transaction

When the second operation cannot leave partial state on failure (e.g. read-then-insert for duplication), no transaction is needed. Logic belongs in the **service**, not the DB layer:

```ts
// {domain}.service.ts — duplicate{Entity}
// existing comes from checkOwnership (already fetched — no extra SELECT)
const [createErr, {entity}] = await create{Entity}Db({
  {parentId}: existing.{parentId},
  create{Entity}Data: {
    name: `[Copy] ${existing.name}`,
    description: existing.description,
    items: existing.items         // jsonb copied as-is
  }
});
```

---

## Return type summary

| Layer | Return type | Import |
|-------|------------|--------|
| DB queries / mutations | `SupabaseServiceResult<T>` = `[SupabaseServiceError, null] \| [null, T]` | `~/lib/supabase/errors` |
| Service reads | `SupabaseServiceResult<T>` wrapped in `React.cache()` | same |
| Service mutations | `ServiceResult<BaseServiceError, T>` | `~/lib/services/errors` |

`ServiceResult` is the same tuple shape. The distinction is that mutations use the wider `BaseServiceError` (service layer can surface non-DB errors like permission failures).

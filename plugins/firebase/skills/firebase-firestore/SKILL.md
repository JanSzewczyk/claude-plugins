---
name: firebase-firestore
description: >
  Firestore database layer for Next.js. Use when user asks to "Firestore query",
  "Firebase Admin SDK", "CRUD for Firestore", "seed Firestore",
  FieldValue.serverTimestamp(), Firestore transactions, "db collection query",
  "implement database queries", "Firestore error handling", "ServiceError for
  Firestore". Implements the ServiceError contract defined in the error-handling skill.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__*
---

# Firebase Firestore Skill

Production-ready Firestore queries with TypeScript, a proper type lifecycle, structured error handling,
and the tuple return pattern. This file holds the rules; detailed code lives in the references.

| Reference                                  | Purpose                                     |
| ------------------------------------------ | ------------------------------------------- |
| [types.md](./references/types.md)          | Type utilities and lifecycle patterns       |
| [errors.md](./references/errors.md)        | ServiceError class and error categorization |
| [config.md](./references/config.md)        | Firebase Admin SDK configuration            |
| [examples.md](./references/examples.md)    | Complete CRUD operation examples            |
| [patterns.md](./references/patterns.md)    | Best practices and anti-patterns            |
| [seeding.md](./references/seeding.md)      | Database seeding patterns                   |

## Workflow

1. **Define types** with the lifecycle pattern (Base → Firestore → Application → DTOs).
2. **Write a transform** that converts a Firestore document to the application type (Timestamp → Date).
3. **Implement queries** returning the tuple `[ServiceError | null, Data | null]`.
4. **Handle errors** via `ServiceError` + `categorizeServiceError()`, logging structured context at every
   error point.
5. **Cover edge cases** — empty input, not found, permission denied.

Place queries in `features/[feature]/server/db/[resource]-queries.ts`; types in
`features/[feature]/types/[resource].ts`.

## Type Lifecycle

Firestore needs different representations at different stages (full utilities in
[types.md](./references/types.md)):

```typescript
type ResourceBase = { name: string; status: "active" | "inactive" };  // 1. business fields only
type ResourceFirestore = WithFirestoreTimestamps<ResourceBase>;       // 2. with Timestamp objects
type Resource = WithDates<ResourceBase>;                              // 3. app type: id + Date objects
type CreateResourceDto = CreateDto<ResourceBase>;                     // 4. create DTO
type UpdateResourceDto = UpdateDto<ResourceBase>;                     // 5. update DTO
```

## Error Handling

> **Contract:** the `ServiceError` class and `categorizeServiceError()` here implement the universal
> `ServiceError` contract defined in the `error-handling` skill. Consumers branch on boolean properties
> (`isNotFound`, `isRetryable`, `isPermissionDenied`) without knowing the backend is Firestore.

- **Every query returns a tuple** — `[ServiceError, null]` on failure, `[null, data]` on success.
  Validate input first, wrap the Firestore call in `try/catch`, run the caught error through
  `categorizeServiceError(error, resourceName)`. Worked code in [errors.md](./references/errors.md) and
  [examples.md](./references/examples.md).
- **Consumers branch on the error flags:**
  - **Server Action** — `isNotFound` → specific message; otherwise return `error.message` (or a generic).
  - **Page loader** — `isNotFound` → `notFound()`; `isRetryable` → `throw` (let `error.tsx` handle);
    otherwise throw a generic error.

## Transform Functions

Convert a Firestore document to the application type — spread the data, add `id`, and turn Timestamps
into Dates:

```typescript
function transformToResource(docId: string, data: FirebaseFirestore.DocumentData): Resource {
  return { id: docId, ...data, createdAt: data.createdAt?.toDate(), updatedAt: data.updatedAt?.toDate() } as Resource;
}
```

## Related Skills

- `error-handling` — defines the `ServiceError` contract this skill implements.
- `server-actions` — server actions that consume these queries.
- `db-migration` — migrating Firestore data.

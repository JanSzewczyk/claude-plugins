# Technical Design: [Feature Name]

## Architecture

[Describe which files and folders are involved or need to be created.]

```
src/
  features/
    [feature-name]/
      actions/          ← Server Actions
        create-[entity].ts
        update-[entity].ts
      components/       ← React components
        [entity]-form.tsx
        [entity]-list.tsx
      schemas/          ← Zod validation schemas
        [entity]-schema.ts
      types.ts          ← TypeScript types
  components/
    [shared-component]/ ← Shared UI components (if any)
```

## Data Model

[Define Firestore collections and TypeScript types.]

```typescript
// TypeScript types
type [Entity] = {
  id: string
  // Required fields
  name: string
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  userId: string        // Owner reference
}

type Create[Entity]Input = Omit<[Entity], 'id' | 'createdAt' | 'updatedAt'>
type Update[Entity]Input = Partial<Omit<[Entity], 'id' | 'userId' | 'createdAt'>>
```

**Firestore collections:**

| Collection                  | Document ID    | Description                            |
| --------------------------- | -------------- | -------------------------------------- |
| `[entities]`                | auto-generated | Main entity collection                 |
| `users/{userId}/[entities]` | auto-generated | Per-user subcollection (if applicable) |

**Indexes required:**

- `[entities]` — composite index on `[userId, createdAt DESC]`

## API Contracts

[Define Server Action and Route Handler signatures.]

### Server Actions

```typescript
// src/features/[feature-name]/actions/create-[entity].ts
async function create[Entity](
  input: Create[Entity]Input
): Promise<Result<[Entity], ServiceError>>

// src/features/[feature-name]/actions/update-[entity].ts
async function update[Entity](
  id: string,
  input: Update[Entity]Input
): Promise<Result<[Entity], ServiceError>>

// src/features/[feature-name]/actions/delete-[entity].ts
async function delete[Entity](
  id: string
): Promise<Result<void, ServiceError>>
```

### Route Handlers (if needed)

```typescript
// GET /api/[entities]
// Response: { data: [Entity][], total: number }

// GET /api/[entities]/[id]
// Response: { data: [Entity] }
```

## Security

[Define auth/authz rules per operation.]

| Operation   | Rule                                 |
| ----------- | ------------------------------------ |
| Read list   | Authenticated user; own records only |
| Read single | Authenticated user; must be owner    |
| Create      | Authenticated user                   |
| Update      | Authenticated user; must be owner    |
| Delete      | Authenticated user; must be owner    |

**Firestore Security Rules:**

```javascript
match /[entities]/{entityId} {
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null;
}
```

## Error Handling

[How errors are handled per layer.]

| Layer         | Pattern                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| Validation    | Zod schema at Server Action boundary; return `ServiceError` with code `VALIDATION_ERROR` |
| Not found     | Return `ServiceError` with code `NOT_FOUND`                                              |
| Unauthorized  | Return `ServiceError` with code `UNAUTHORIZED`                                           |
| Server Action | Return `Result<T, ServiceError>`; never throw                                            |
| UI            | Display via toast notification on error; optimistic updates with rollback                |
| Network       | Handle with error boundary + retry option                                                |

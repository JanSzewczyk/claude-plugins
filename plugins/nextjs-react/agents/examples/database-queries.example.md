# Database Query Examples

Examples of database query patterns with proper error handling.

> **Note:** These examples use a generic pattern. Adapt to your specific database (Firestore, PostgreSQL, MongoDB, etc.)

## Basic Read Operation

```typescript
import { categorizeDbError, DbError } from "~/lib/firebase/errors";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "resource-db" });
const COLLECTION_NAME = "resources";
const RESOURCE_NAME = "Resource";

export async function getResourceById(
  id: string,
): Promise<[null, Resource] | [DbError, null]> {
  // Input validation
  if (!id?.trim()) {
    const error = DbError.validation("Invalid id provided");
    logger.warn({ id, errorCode: error.code }, "Invalid id");
    return [error, null];
  }

  try {
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      const error = DbError.notFound(RESOURCE_NAME);
      logger.warn({ id, errorCode: error.code }, "Document not found");
      return [error, null];
    }

    const data = doc.data();
    if (!data) {
      const error = DbError.dataCorruption(RESOURCE_NAME);
      logger.error({ id, errorCode: error.code }, "Data undefined");
      return [error, null];
    }

    return [null, transformFirestoreToResource(doc.id, data)];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error(
      {
        id,
        errorCode: dbError.code,
        isRetryable: dbError.isRetryable,
      },
      "Database error",
    );
    return [dbError, null];
  }
}
```

## List Operation With Filters

```typescript
export async function getResourcesByUser(
  userId: string,
  options: { status?: string; limit?: number } = {},
): Promise<[null, Resource[]] | [DbError, null]> {
  if (!userId?.trim()) {
    return [DbError.validation("Invalid userId"), null];
  }

  try {
    let query = db
      .collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc");

    if (options.status) {
      query = query.where("status", "==", options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const resources = snapshot.docs.map((doc) =>
      transformFirestoreToResource(doc.id, doc.data()),
    );

    logger.info({ userId, count: resources.length }, "Resources fetched");
    return [null, resources];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error(
      { userId, errorCode: dbError.code },
      "Failed to fetch resources",
    );
    return [dbError, null];
  }
}
```

## Create Operation

```typescript
export async function createResource(
  data: CreateResourceDto,
): Promise<[null, Resource] | [DbError, null]> {
  try {
    const docRef = await db.collection(COLLECTION_NAME).add(data);
    const doc = await docRef.get();

    if (!doc.exists || !doc.data()) {
      return [DbError.dataCorruption(RESOURCE_NAME), null];
    }

    const resource = transformFirestoreToResource(doc.id, doc.data()!);
    logger.info({ resourceId: doc.id }, "Resource created");
    return [null, resource];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error({ errorCode: dbError.code }, "Failed to create resource");
    return [dbError, null];
  }
}
```

## Update Operation

```typescript
export async function updateResource(
  id: string,
  data: UpdateResourceDto,
): Promise<[null, Resource] | [DbError, null]> {
  if (!id?.trim()) {
    return [DbError.validation("Invalid id"), null];
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    // Check existence
    const existing = await docRef.get();
    if (!existing.exists) {
      return [DbError.notFound(RESOURCE_NAME), null];
    }

    // Update
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Fetch updated document
    const updated = await docRef.get();
    const resource = transformFirestoreToResource(updated.id, updated.data()!);

    logger.info({ resourceId: id }, "Resource updated");
    return [null, resource];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error({ id, errorCode: dbError.code }, "Failed to update resource");
    return [dbError, null];
  }
}
```

## Delete Operation

```typescript
export async function deleteResource(
  id: string,
): Promise<[null, void] | [DbError, null]> {
  if (!id?.trim()) {
    return [DbError.validation("Invalid id"), null];
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    const existing = await docRef.get();
    if (!existing.exists) {
      return [DbError.notFound(RESOURCE_NAME), null];
    }

    await docRef.delete();
    logger.info({ resourceId: id }, "Resource deleted");
    return [null, undefined];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error({ id, errorCode: dbError.code }, "Failed to delete resource");
    return [dbError, null];
  }
}
```

## Transform Helper

```typescript
function transformFirestoreToResource(
  docId: string,
  data: FirebaseFirestore.DocumentData,
): Resource {
  return {
    id: docId,
    ...data,
    // Transform Firestore Timestamps to JS Dates
    updatedAt: data.updatedAt?.toDate(),
    createdAt: data.createdAt?.toDate(),
    // Handle custom date fields if any
    scheduledAt: data.scheduledAt?.toDate(),
  } as Resource;
}
```

## Batch Operations

```typescript
export async function batchUpdateStatus(
  ids: string[],
  status: string,
): Promise<[null, number] | [DbError, null]> {
  if (ids.length === 0) {
    return [null, 0];
  }

  try {
    const batch = db.batch();
    let count = 0;

    for (const id of ids) {
      const docRef = db.collection(COLLECTION_NAME).doc(id);
      batch.update(docRef, {
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      count++;
    }

    await batch.commit();
    logger.info({ count }, "Batch update completed");
    return [null, count];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error({ errorCode: dbError.code }, "Batch update failed");
    return [dbError, null];
  }
}
```

## Cursor-Based Pagination

```typescript
interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function getResourcesPaginated(
  userId: string,
  options: { limit?: number; cursor?: string } = {},
): Promise<[null, PaginatedResult<Resource>] | [DbError, null]> {
  if (!userId?.trim()) {
    return [DbError.validation("Invalid userId"), null];
  }

  const pageSize = options.limit ?? 20;

  try {
    let query = db
      .collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(pageSize + 1); // Fetch one extra to determine hasMore

    // Resume from cursor (document ID)
    if (options.cursor) {
      const cursorDoc = await db
        .collection(COLLECTION_NAME)
        .doc(options.cursor)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;

    // Trim to actual page size
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const items = pageDocs.map((doc) =>
      transformFirestoreToResource(doc.id, doc.data()),
    );

    const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].id : null;

    logger.info(
      { userId, count: items.length, hasMore },
      "Resources page fetched",
    );
    return [null, { items, nextCursor, hasMore }];
  } catch (error) {
    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error(
      { userId, errorCode: dbError.code },
      "Failed to fetch resources page",
    );
    return [dbError, null];
  }
}
```

### Using Pagination in a Server Action

```typescript
"use server";

export async function loadMoreResources(
  cursor?: string,
): ActionResponse<PaginatedResult<Resource>> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const [error, result] = await getResourcesPaginated(userId, {
    limit: 20,
    cursor: cursor ?? undefined,
  });

  if (error) {
    return { success: false, error: "Unable to load resources" };
  }

  return { success: true, data: result };
}
```

## Transaction — Atomic Transfer Between Resources

```typescript
export async function transferAmount(
  userId: string,
  fromId: string,
  toId: string,
  amount: number,
): Promise<[null, { from: Resource; to: Resource }] | [DbError, null]> {
  if (amount <= 0) {
    return [DbError.validation("Amount must be positive"), null];
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const fromRef = db.collection(COLLECTION_NAME).doc(fromId);
      const toRef = db.collection(COLLECTION_NAME).doc(toId);

      const [fromDoc, toDoc] = await Promise.all([
        transaction.get(fromRef),
        transaction.get(toRef),
      ]);

      if (!fromDoc.exists || !toDoc.exists) {
        throw new Error("NOT_FOUND");
      }

      const fromData = fromDoc.data()!;
      const toData = toDoc.data()!;

      if (fromData.userId !== userId || toData.userId !== userId) {
        throw new Error("PERMISSION_DENIED");
      }

      if (fromData.amount < amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      transaction.update(fromRef, {
        amount: fromData.amount - amount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(toRef, {
        amount: toData.amount + amount,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        from: transformFirestoreToResource(fromDoc.id, {
          ...fromData,
          amount: fromData.amount - amount,
        }),
        to: transformFirestoreToResource(toDoc.id, {
          ...toData,
          amount: toData.amount + amount,
        }),
      };
    });

    logger.info({ userId, fromId, toId, amount }, "Transfer completed");
    return [null, result];
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "NOT_FOUND":
          return [DbError.notFound(RESOURCE_NAME), null];
        case "PERMISSION_DENIED":
          return [DbError.permissionDenied(), null];
        case "INSUFFICIENT_BALANCE":
          return [DbError.validation("Insufficient balance"), null];
      }
    }

    const dbError = categorizeDbError(error, RESOURCE_NAME);
    logger.error(
      { fromId, toId, amount, errorCode: dbError.code },
      "Transfer failed",
    );
    return [dbError, null];
  }
}
```

### Transaction Best Practices

- **Read before write** — all reads must happen before any writes inside a transaction
- **Keep transactions short** — avoid slow operations (no network calls, no file I/O)
- **Handle contention** — Firestore retries transactions on conflict (up to a limit)
- **Idempotency** — transaction function may run multiple times; ensure no side effects outside the transaction
- **Max 500 writes** per transaction — batch if you need more

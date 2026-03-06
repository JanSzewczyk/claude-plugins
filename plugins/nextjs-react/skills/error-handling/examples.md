# Practical Examples

## Complete CRUD Error Handling

> **Note — DB Layer Examples:** The database layer examples below use Firestore-specific imports
> (`~/lib/firebase/errors`, `~/lib/firebase`, `firebase-admin/firestore`). For a different DB layer,
> replace these with your own implementation of the ServiceError contract. See the `firebase-firestore`
> skill for the complete Firestore implementation.

### Database Layer

```typescript
// features/budget/server/db/budgets.ts
import { categorizeServiceError, ServiceError } from "~/lib/services/errors"; // ~/lib/firebase/errors for Firestore
import { createLogger } from "~/lib/logger";
import { db } from "~/lib/db"; // ~/lib/firebase for Firestore
import { FieldValue } from "firebase-admin/firestore"; // Firestore-specific
import type { Budget, CreateBudgetDto, UpdateBudgetDto } from "../types/budget";

const logger = createLogger({ module: "budget-db" });
const COLLECTION_NAME = "budgets";
const RESOURCE_NAME = "Budget";

// CREATE
export async function createBudget(
  userId: string,
  data: CreateBudgetDto,
): Promise<[null, Budget] | [ServiceError, null]> {
  if (!userId?.trim()) {
    const error = ServiceError.validation("Invalid userId");
    logger.warn({ errorCode: error.code }, "Create budget: invalid userId");
    return [error, null];
  }

  logger.debug({ userId, budgetName: data.name }, "Creating budget");

  try {
    const docRef = await db.collection(COLLECTION_NAME).add({
      ...data,
      userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const doc = await docRef.get();
    const budget = transformToBudget(doc.id, doc.data()!);

    logger.info({ userId, budgetId: budget.id }, "Budget created");
    return [null, budget];
  } catch (error) {
    const serviceError = categorizeServiceError(error, RESOURCE_NAME);
    logger.error(
      {
        userId,
        errorCode: serviceError.code,
        isRetryable: serviceError.isRetryable,
      },
      "Failed to create budget",
    );
    return [serviceError, null];
  }
}

// READ
export async function getBudgetById(
  userId: string,
  budgetId: string,
): Promise<[null, Budget] | [ServiceError, null]> {
  if (!userId?.trim() || !budgetId?.trim()) {
    const error = ServiceError.validation("Invalid userId or budgetId");
    logger.warn({ userId, budgetId, errorCode: error.code }, "Invalid input");
    return [error, null];
  }

  logger.debug({ userId, budgetId }, "Fetching budget");

  try {
    const doc = await db.collection(COLLECTION_NAME).doc(budgetId).get();

    if (!doc.exists) {
      const error = ServiceError.notFound(RESOURCE_NAME);
      logger.warn(
        { userId, budgetId, errorCode: error.code },
        "Budget not found",
      );
      return [error, null];
    }

    const data = doc.data()!;

    // Check ownership
    if (data.userId !== userId) {
      const error = ServiceError.permissionDenied("Budget");
      logger.warn({ userId, budgetId, ownerId: data.userId }, "Access denied");
      return [error, null];
    }

    return [null, transformToBudget(doc.id, data)];
  } catch (error) {
    const serviceError = categorizeServiceError(error, RESOURCE_NAME);
    logger.error(
      {
        userId,
        budgetId,
        errorCode: serviceError.code,
        isRetryable: serviceError.isRetryable,
      },
      "Failed to fetch budget",
    );
    return [serviceError, null];
  }
}

// UPDATE
export async function updateBudget(
  userId: string,
  budgetId: string,
  data: UpdateBudgetDto,
): Promise<[null, Budget] | [ServiceError, null]> {
  // First verify ownership
  const [existsError, existing] = await getBudgetById(userId, budgetId);
  if (existsError) {
    return [existsError, null];
  }

  logger.debug({ userId, budgetId }, "Updating budget");

  try {
    await db
      .collection(COLLECTION_NAME)
      .doc(budgetId)
      .update({
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Fetch updated document
    const doc = await db.collection(COLLECTION_NAME).doc(budgetId).get();
    const budget = transformToBudget(doc.id, doc.data()!);

    logger.info({ userId, budgetId }, "Budget updated");
    return [null, budget];
  } catch (error) {
    const serviceError = categorizeServiceError(error, RESOURCE_NAME);
    logger.error(
      {
        userId,
        budgetId,
        errorCode: serviceError.code,
      },
      "Failed to update budget",
    );
    return [serviceError, null];
  }
}

// DELETE
export async function deleteBudget(
  userId: string,
  budgetId: string,
): Promise<[null, void] | [ServiceError, null]> {
  // Verify ownership first
  const [existsError] = await getBudgetById(userId, budgetId);
  if (existsError) {
    return [existsError, null];
  }

  logger.debug({ userId, budgetId }, "Deleting budget");

  try {
    await db.collection(COLLECTION_NAME).doc(budgetId).delete();
    logger.info({ userId, budgetId }, "Budget deleted");
    return [null, undefined];
  } catch (error) {
    const serviceError = categorizeServiceError(error, RESOURCE_NAME);
    logger.error(
      {
        userId,
        budgetId,
        errorCode: serviceError.code,
      },
      "Failed to delete budget",
    );
    return [serviceError, null];
  }
}
```

### Server Actions Layer

```typescript
// features/budget/server/actions/budget-actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createLogger } from "~/lib/logger";
import { setToastCookie } from "~/lib/toast/server/toast.cookie";
import {
  createBudget as createBudgetDb,
  updateBudget as updateBudgetDb,
  deleteBudget as deleteBudgetDb,
} from "../db/budgets";
import { createBudgetSchema, updateBudgetSchema } from "../schemas/budget";
import type { ActionResponse, RedirectAction } from "~/lib/action-types";
import type { Budget } from "../types/budget";

const logger = createLogger({ module: "budget-actions" });

// CREATE
export async function createBudgetAction(
  formData: FormData,
): ActionResponse<Budget> {
  const userId = await getCurrentUserId(); // your auth helper

  if (!userId) {
    logger.warn({ action: "createBudget" }, "Unauthorized");
    return { success: false, error: "Please sign in to continue" };
  }

  // Validate
  const parsed = createBudgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    logger.warn(
      {
        userId,
        action: "createBudget",
        fieldErrors: Object.keys(parsed.error.flatten().fieldErrors),
      },
      "Validation failed",
    );

    return {
      success: false,
      error: "Please check the form for errors",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Create
  const [error, budget] = await createBudgetDb(userId, parsed.data);

  if (error) {
    logger.error(
      {
        userId,
        action: "createBudget",
        errorCode: error.code,
      },
      "Create failed",
    );

    await setToastCookie("Failed to create budget", "error");
    return { success: false, error: "Unable to create budget" };
  }

  logger.info({ userId, budgetId: budget.id }, "Budget created via action");
  await setToastCookie(`Budget "${budget.name}" created!`, "success");
  revalidatePath("/budgets");

  return { success: true, data: budget };
}

// UPDATE
export async function updateBudgetAction(
  budgetId: string,
  formData: FormData,
): ActionResponse<Budget> {
  const userId = await getCurrentUserId(); // your auth helper

  if (!userId) {
    return { success: false, error: "Please sign in" };
  }

  const parsed = updateBudgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid data",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [error, budget] = await updateBudgetDb(userId, budgetId, parsed.data);

  if (error) {
    if (error.isNotFound) {
      await setToastCookie("Budget not found", "warning");
      return { success: false, error: "Budget not found" };
    }
    if (error.isPermissionDenied) {
      await setToastCookie("You don't have permission", "error");
      return { success: false, error: "Permission denied" };
    }

    await setToastCookie("Failed to update budget", "error");
    return { success: false, error: "Unable to update budget" };
  }

  await setToastCookie("Budget updated!", "success");
  revalidatePath("/budgets");
  revalidatePath(`/budgets/${budgetId}`);

  return { success: true, data: budget };
}

// DELETE with redirect
export async function deleteBudgetAction(budgetId: string): RedirectAction {
  const userId = await getCurrentUserId(); // your auth helper

  if (!userId) {
    await setToastCookie("Please sign in", "error");
    return redirect("/sign-in");
  }

  const [error] = await deleteBudgetDb(userId, budgetId);

  if (error) {
    if (error.isNotFound) {
      await setToastCookie("Budget already deleted", "info");
      return redirect("/budgets");
    }
    if (error.isPermissionDenied) {
      await setToastCookie("You can't delete this budget", "error");
      return redirect("/budgets");
    }

    await setToastCookie("Failed to delete budget", "error");
    return { success: false, error: error.message };
  }

  await setToastCookie("Budget deleted", "success");
  revalidatePath("/budgets");
  return redirect("/budgets");
}
```

### Page with Error Handling

```typescript
// app/budgets/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { getBudgetById } from "~/features/budget/server/db/budgets";
import { BudgetDetails } from "~/features/budget/components/budget-details";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BudgetPage({ params }: PageProps) {
  const userId = await getCurrentUserId(); // your auth helper

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const [error, budget] = await getBudgetById(userId, id);

  if (error) {
    if (error.isNotFound) {
      notFound();
    }
    if (error.isPermissionDenied) {
      redirect("/unauthorized");
    }
    if (error.isRetryable) {
      // Let error.tsx handle with retry button
      throw new Error("Service temporarily unavailable");
    }
    // Unknown error
    throw new Error("Unable to load budget");
  }

  return <BudgetDetails budget={budget} />;
}
```

### Error Boundary

```typescript
// app/budgets/[id]/error.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BudgetError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error (could send to monitoring service)
    console.error("Budget page error:", error.message, error.digest);
  }, [error]);

  const isTemporary = error.message.includes("temporarily");

  return (
    <div>
      <h2>
        {isTemporary ? "Service Temporarily Unavailable" : "Unable to Load Budget"}
      </h2>

      <p>
        {isTemporary
          ? "We're experiencing some issues. Please try again in a moment."
          : "There was a problem loading this budget. It may have been deleted or you may not have access."}
      </p>

      <div>
        <button onClick={reset}>Try Again</button>
        <button onClick={() => router.push("/budgets")}>Back to Budgets</button>
      </div>
    </div>
  );
}
```

### Form Component with Error Display

```typescript
// features/budget/components/budget-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBudgetAction } from "../server/actions/budget-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create Budget"}
    </button>
  );
}

export function BudgetForm() {
  const [state, formAction] = useActionState(createBudgetAction, null);

  return (
    <form action={formAction}>
      {/* General error banner */}
      {state?.error && !state.fieldErrors && (
        <div role="alert">{state.error}</div>
      )}

      {/* Name field */}
      <div>
        <label htmlFor="name">Budget Name</label>
        <input
          id="name"
          name="name"
          placeholder="e.g., Monthly Groceries"
          aria-invalid={!!state?.fieldErrors?.name}
          aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
        />
        {state?.fieldErrors?.name && (
          <p id="name-error">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Amount field */}
      <div>
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          aria-invalid={!!state?.fieldErrors?.amount}
          aria-describedby={state?.fieldErrors?.amount ? "amount-error" : undefined}
        />
        {state?.fieldErrors?.amount && (
          <p id="amount-error">{state.fieldErrors.amount[0]}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
```

### Not Found Page

```typescript
// app/budgets/[id]/not-found.tsx
import Link from "next/link";

export default function BudgetNotFound() {
  return (
    <div>
      <h2>Budget Not Found</h2>
      <p>The budget you're looking for doesn't exist or has been deleted.</p>
      <Link href="/budgets">View All Budgets</Link>
    </div>
  );
}
```

### API Error Logging Endpoint

```typescript
// app/api/log-error/route.ts
import { NextResponse } from "next/server";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "client-error" });

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId(); // your auth helper (optional)
    const { message, digest, stack, url, userAgent } = await request.json();

    logger.error(
      {
        source: "client",
        userId: userId ?? "anonymous",
        digest,
        url,
        userAgent: userAgent?.slice(0, 200),
        stack: stack?.slice(0, 1000),
      },
      `Client error: ${message}`,
    );

    return NextResponse.json({ logged: true });
  } catch (error) {
    logger.error(
      { error: "Failed to log client error" },
      "Error logging failed",
    );
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}
```

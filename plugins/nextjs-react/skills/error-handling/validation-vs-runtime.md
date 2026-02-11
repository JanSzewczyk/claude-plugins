# Validation Errors vs Runtime Errors

## Clear Distinction

| Aspect             | Validation Errors                                       | Runtime Errors                                     |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------- |
| **Cause**          | User provided bad input or violated a business rule     | System/infrastructure failure beyond user control  |
| **Predictable?**   | Yes - caught by schema/rule checks before any operation | No - occur unexpectedly during operations          |
| **User's fault?**  | Yes (or at least user-correctable)                      | No                                                 |
| **User message**   | Specific, actionable (field-level or business rule)     | Generic ("Something went wrong, please try again") |
| **Log level**      | `warn` (expected, not an emergency)                     | `error` (unexpected, needs investigation)          |
| **Response shape** | `fieldErrors` for form display                          | Toast notification + generic `error` string        |
| **Retryable?**     | Not as-is (user must fix input first)                   | Possibly (transient failures may resolve)          |

## Validation Errors

Validation errors occur when input does not meet the expected schema or business rules. They are caught _before_ any database or external operation runs.

### Zod Schema Failures

Schema validation catches structural issues: missing fields, wrong types, invalid formats.

```typescript
import { z } from "zod";

const createBudgetSchema = z.object({
  name: z
    .string()
    .min(1, "Budget name is required")
    .max(100, "Name must be 100 characters or fewer"),
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .max(1_000_000, "Amount cannot exceed 1,000,000"),
  category: z.enum(["housing", "food", "transport", "entertainment", "other"], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
});
```

When schema validation fails, return `fieldErrors` so the form can display inline error messages:

```typescript
"use server";

import { createLogger } from "~/lib/logger";
import type { ActionResponse } from "~/lib/action-types";

const logger = createLogger({ module: "budget-actions" });

export async function createBudgetAction(
  formData: FormData,
): ActionResponse<Budget> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Please sign in to continue" };
  }

  const parsed = createBudgetSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    // Log as warn - this is expected user behavior, not a system error
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

  // ... proceed with database operation
}
```

### Business Rule Violations

Business rules go beyond schema validation. They enforce domain-specific constraints that depend on existing data or application state.

```typescript
import { DbError } from "~/lib/firebase/errors";
import { createLogger } from "~/lib/logger";

const logger = createLogger({ module: "budget-db" });

export async function createBudget(
  userId: string,
  data: CreateBudgetDto,
): Promise<[null, Budget] | [DbError, null]> {
  // Schema validation already passed at this point

  // Business rule: user cannot exceed 20 budgets
  const existingCount = await countUserBudgets(userId);
  if (existingCount >= 20) {
    const error = DbError.validation(
      "You have reached the maximum of 20 budgets",
    );
    logger.warn(
      { userId, existingCount, errorCode: error.code },
      "Budget limit exceeded",
    );
    return [error, null];
  }

  // Business rule: budget name must be unique per user
  const [, existing] = await getBudgetByName(userId, data.name);
  if (existing) {
    const error = DbError.alreadyExists("Budget");
    logger.warn(
      { userId, budgetName: data.name, errorCode: error.code },
      "Duplicate budget name",
    );
    return [error, null];
  }

  // Business rule: total budget amount cannot exceed subscription tier limit
  const totalAmount = await getTotalBudgetAmount(userId);
  if (totalAmount + data.amount > TIER_LIMITS[userTier]) {
    const error = DbError.validation(
      "Adding this budget would exceed your plan's total budget limit",
    );
    logger.warn(
      { userId, currentTotal: totalAmount, newAmount: data.amount },
      "Tier limit would be exceeded",
    );
    return [error, null];
  }

  // ... proceed with database write
}
```

### Type Mismatches

Type mismatches occur when data arrives in an unexpected format, often from form submissions or external sources:

```typescript
// FormData always gives strings - coerce before validating
const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // coerce string "500" to number 500
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  // coerce string "true" to boolean true
  isRecurring: z.coerce.boolean().default(false),
});
```

## Runtime Errors

Runtime errors occur during operations on external systems. They are unexpected and the user cannot fix them by changing their input.

### Network Failures

```typescript
// Connection drops, DNS failures, socket timeouts
catch (error) {
  const dbError = categorizeDbError(error, "Budget");
  // dbError.code might be "unavailable"
  // dbError.isRetryable will be true
  logger.error(
    { userId, errorCode: dbError.code, isRetryable: dbError.isRetryable },
    "Network error during budget fetch",
  );
  return [dbError, null];
}
```

### Database Errors

```typescript
// Firestore unavailable, deadline exceeded, internal errors
catch (error) {
  if (error instanceof FirebaseError) {
    // "unavailable", "deadline-exceeded", "internal"
    const dbError = categorizeDbError(error, "Budget");
    logger.error(
      { userId, firebaseCode: error.code, errorCode: dbError.code },
      "Firestore error",
    );
    return [dbError, null];
  }
}
```

### Third-Party API Failures

```typescript
// Stripe, SendGrid, or any external service
async function processPayment(
  userId: string,
  amount: number,
): Promise<[null, PaymentResult] | [DbError, null]> {
  try {
    const result = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
    });

    return [null, { id: result.id, status: result.status }];
  } catch (error) {
    logger.error(
      {
        userId,
        amount,
        error: error instanceof Error ? error.message : "Unknown",
      },
      "Payment processing failed",
    );

    // Treat third-party failures as retryable by default
    return [
      new DbError("external-api", "Payment service unavailable", true),
      null,
    ];
  }
}
```

### Timeouts

```typescript
// Operation exceeded its deadline
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10_000);

try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} catch (error) {
  if (error instanceof DOMException && error.name === "AbortError") {
    logger.error({ url, timeoutMs: 10_000 }, "Request timed out");
    return [new DbError("deadline-exceeded", "Request timed out", true), null];
  }
  throw error;
} finally {
  clearTimeout(timeoutId);
}
```

## How Each Type Flows Through the Error Handling Layers

### Validation Error Flow

```
User submits form with invalid data
    |
Server Action receives FormData
    |
Zod schema.safeParse() fails
    |
Log as WARN (expected behavior, not a system error)
    |
Return { success: false, error: "...", fieldErrors: { ... } }
    |
Client renders inline field errors
    |
NO toast (field errors are shown inline)
NO error boundary triggered
```

### Business Rule Violation Flow

```
User submits valid form data (passes schema)
    |
Database layer checks business rules
    |
Rule violated (e.g., budget limit exceeded)
    |
Return [DbError.validation("Budget limit exceeded"), null]
    |
Log as WARN (business constraint, not system error)
    |
Server Action returns { success: false, error: "Budget limit exceeded" }
    |
Client shows error banner (not field-level - the fields are valid)
    OR
Server Action sets toast + returns generic error
```

### Runtime Error Flow

```
User submits valid form data (passes schema + business rules)
    |
Database operation (write/read) throws
    |
categorizeDbError() wraps the error
    |
Log as ERROR with full context (errorCode, isRetryable, userId)
    |
Return [dbError, null] to server action
    |
Server Action calls setToastCookie("Something went wrong", "error")
    |
Return { success: false, error: "Unable to complete operation" }
    |
Client displays toast notification
    |
User sees generic message, not internal details
```

## Decision Table

| Error Type              | Log Level | User Message                                         | Action                                              |
| ----------------------- | --------- | ---------------------------------------------------- | --------------------------------------------------- |
| Zod schema failure      | `warn`    | Field-specific messages via `fieldErrors`            | Return `fieldErrors`, render inline                 |
| Business rule violation | `warn`    | Specific rule message (e.g., "Budget limit reached") | Return as `error` string, show banner or toast      |
| Auth / unauthorized     | `warn`    | "Please sign in to continue"                         | Redirect to sign-in or return error                 |
| Not found               | `warn`    | "Resource not found" or 404 page                     | Call `notFound()` in pages, return error in actions |
| Permission denied       | `warn`    | "You don't have access"                              | Redirect to `/unauthorized` or return error         |
| Network / timeout       | `error`   | "Service temporarily unavailable"                    | Set toast, return generic error, may retry          |
| Database failure        | `error`   | "Unable to [action]" (generic)                       | Set toast, return generic error, log details        |
| Third-party API failure | `error`   | "External service unavailable"                       | Set toast, return generic error, may retry          |
| Unknown / unexpected    | `error`   | "Something went wrong"                               | Set toast, return generic error, throw in pages     |

## Complete Example: Both Paths in a Single Server Action

This example shows how validation errors and runtime errors are handled differently in the same server action:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createLogger } from "~/lib/logger";
import { setToastCookie } from "~/lib/toast/server/toast.cookie";
import {
  createBudget as createBudgetDb,
  countUserBudgets,
} from "../db/budgets";
import type { ActionResponse } from "~/lib/action-types";
import type { Budget } from "../types/budget";

const logger = createLogger({ module: "budget-actions" });

const createBudgetSchema = z.object({
  name: z
    .string()
    .min(1, "Budget name is required")
    .max(100, "Name must be 100 characters or fewer"),
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than zero"),
  category: z.enum(["housing", "food", "transport", "entertainment", "other"], {
    errorMap: () => ({ message: "Please select a valid category" }),
  }),
});

const MAX_BUDGETS_PER_USER = 20;

export async function createBudgetAction(
  formData: FormData,
): ActionResponse<Budget> {
  // ── Authentication ──────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    logger.warn({ action: "createBudget" }, "Unauthorized access attempt");
    return { success: false, error: "Please sign in to continue" };
  }

  // ── VALIDATION PATH: Zod schema ────────────────────────────
  // These are user input errors. Return fieldErrors for inline display.
  const parsed = createBudgetSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    logger.warn(
      {
        userId,
        action: "createBudget",
        invalidFields: Object.keys(fieldErrors),
      },
      "Schema validation failed",
    );

    // No toast - field errors are displayed inline in the form
    return {
      success: false,
      error: "Please check the form for errors",
      fieldErrors,
    };
  }

  // ── VALIDATION PATH: Business rule ─────────────────────────
  // Valid input, but violates a domain constraint.
  // Still logged as warn - this is an expected user-correctable scenario.
  const [countError, budgetCount] = await countUserBudgets(userId);

  if (countError) {
    // This is a RUNTIME error (couldn't even check the rule)
    logger.error(
      { userId, errorCode: countError.code },
      "Failed to check budget count",
    );
    await setToastCookie("Something went wrong. Please try again.", "error");
    return { success: false, error: "Unable to create budget" };
  }

  if (budgetCount >= MAX_BUDGETS_PER_USER) {
    logger.warn(
      { userId, budgetCount, limit: MAX_BUDGETS_PER_USER },
      "Budget limit exceeded",
    );

    // Business rule violation: specific message, no fieldErrors
    // (the form fields are valid - the problem is the limit)
    return {
      success: false,
      error: `You have reached the maximum of ${MAX_BUDGETS_PER_USER} budgets. Please delete an existing budget first.`,
    };
  }

  // ── RUNTIME PATH: Database write ───────────────────────────
  // Input is valid, business rules pass. Now we're in runtime territory.
  // Any failure here is a system error.
  const [error, budget] = await createBudgetDb(userId, parsed.data);

  if (error) {
    // Runtime errors: log as error, return generic message, set toast
    logger.error(
      {
        userId,
        action: "createBudget",
        errorCode: error.code,
        isRetryable: error.isRetryable,
      },
      "Database error during budget creation",
    );

    if (error.isAlreadyExists) {
      // Edge case: another request created a budget with the same name
      // between our check and the write. Treat as a business rule error.
      return {
        success: false,
        error: "A budget with this name already exists",
      };
    }

    // Generic message for all other runtime errors
    await setToastCookie("Failed to create budget. Please try again.", "error");
    return { success: false, error: "Unable to create budget" };
  }

  // ── SUCCESS ────────────────────────────────────────────────
  logger.info(
    { userId, budgetId: budget.id, budgetName: budget.name },
    "Budget created",
  );
  await setToastCookie(`Budget "${budget.name}" created!`, "success");
  revalidatePath("/budgets");

  return { success: true, data: budget };
}
```

### How the Client Handles Each Error Type

```typescript
"use client";

import { useActionState } from "react";
import { Button, Input, Label, Card, Select } from "@szum-tech/design-system";
import { AlertCircle } from "lucide-react";
import { createBudgetAction } from "../server/actions/budget-actions";

export function CreateBudgetForm() {
  const [state, formAction, isPending] = useActionState(
    createBudgetAction,
    null,
  );

  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        {/*
          General error banner - shown for:
          - Business rule violations (no fieldErrors, but has error)
          - Runtime errors (generic message from server)
        */}
        {state?.error && !state.fieldErrors && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Name field - shows inline validation errors from Zod */}
        <div className="space-y-2">
          <Label htmlFor="name">Budget Name</Label>
          <Input
            id="name"
            name="name"
            disabled={isPending}
            aria-invalid={!!state?.fieldErrors?.name}
            aria-describedby={
              state?.fieldErrors?.name ? "name-error" : undefined
            }
            className={state?.fieldErrors?.name ? "border-destructive" : ""}
          />
          {state?.fieldErrors?.name && (
            <p id="name-error" className="text-sm text-destructive">
              {state.fieldErrors.name[0]}
            </p>
          )}
        </div>

        {/* Amount field */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            disabled={isPending}
            aria-invalid={!!state?.fieldErrors?.amount}
            aria-describedby={
              state?.fieldErrors?.amount ? "amount-error" : undefined
            }
            className={state?.fieldErrors?.amount ? "border-destructive" : ""}
          />
          {state?.fieldErrors?.amount && (
            <p id="amount-error" className="text-sm text-destructive">
              {state.fieldErrors.amount[0]}
            </p>
          )}
        </div>

        {/* Category field */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            id="category"
            name="category"
            disabled={isPending}
            aria-invalid={!!state?.fieldErrors?.category}
          >
            <option value="">Select a category</option>
            <option value="housing">Housing</option>
            <option value="food">Food</option>
            <option value="transport">Transport</option>
            <option value="entertainment">Entertainment</option>
            <option value="other">Other</option>
          </Select>
          {state?.fieldErrors?.category && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.category[0]}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creating..." : "Create Budget"}
        </Button>
      </form>
    </Card>
  );
}
```

### Summary of the Two Paths

```
                    User submits form
                          |
                    ┌─────┴─────┐
                    │  Zod      │
                    │  Parse    │
                    └─────┬─────┘
                   fail   │   pass
                    │     │
         ┌──────────┘     │
         │                │
   ┌─────┴──────┐  ┌─────┴──────────┐
   │ VALIDATION  │  │ Business Rule  │
   │ fieldErrors │  │ Check          │
   │ log: warn   │  └─────┬─────────┘
   │ no toast    │  fail  │   pass
   └─────────────┘  │     │
         ┌──────────┘     │
         │                │
   ┌─────┴──────┐  ┌─────┴──────────┐
   │ VALIDATION  │  │ RUNTIME        │
   │ error msg   │  │ DB Operation   │
   │ log: warn   │  └─────┬─────────┘
   │ no toast    │  fail  │   pass
   └─────────────┘  │     │
         ┌──────────┘     │
         │                │
   ┌─────┴──────┐  ┌─────┴──────────┐
   │ RUNTIME     │  │ SUCCESS        │
   │ generic msg │  │ toast: success │
   │ log: error  │  │ revalidate     │
   │ toast: error│  │ return data    │
   └─────────────┘  └────────────────┘
```

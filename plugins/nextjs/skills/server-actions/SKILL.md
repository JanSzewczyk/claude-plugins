---
name: server-actions
description: >
  Create Next.js Server Actions in TypeScript with a typed result contract, Zod validation, auth guards, error handling,
  and React integration. Use this skill whenever writing or modifying Server Actions in a Next.js App Router project —
  form submissions, data mutations, CRUD operations, auth-gated actions, multi-step/redirect flows. Trigger even when
  the user says "create a server action", "add form handling", "handle form submit on the server", "validate form with
  Zod", "add a server-side mutation", or asks about useActionState / useTransition / useFormStatus / useOptimistic with
  actions. Stack-agnostic: works with any auth provider, ORM, logger, and toast library. Targets Next.js 15/16+ with the
  App Router. Not for: fetching/reading data (use a Server Component), building the toast UI or post-redirect toast
  plumbing, React error boundaries, or route handlers / REST API endpoints.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Server Actions

Server Actions run only on the server, invoked from the client over a POST. They are the App Router's tool for
**mutations** — create, update, delete, form submissions.

> **Reads don't belong here.** Fetch data directly in a Server Component (no HTTP round-trip). Reach for a Server Action
> only when state changes.

Stack-agnostic: examples use placeholder modules (`~/auth`, `~/lib/logger`, your ORM, your toast library) — swap them.
The one thing standardized is the **result contract**, because a consistent return shape lets every form, hook, and
error path compose.

## Setup: the result contract

Every action returns a typed discriminated union, not a bare object or a thrown error. Do this once per project before
writing actions:

1. **Check for an existing definition** — `grep -rl "ActionResponse" --include="*.ts" lib src app`.
2. **If none, copy the canonical file** [assets/action-types.ts](./assets/action-types.ts) into the project:
   `cp <skill-path>/assets/action-types.ts lib/action-types.ts` (match the project's layout).
3. **If one exists, use it as-is** — read it for the exact exported names and import path.

```typescript
export type ActionResponse<T = unknown> = Promise<
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
>;
// `never` on success because redirect() throws — the function never returns normally.
export type RedirectAction = Promise<never | { success: false; error: string; fieldErrors?: Record<string, string[]> }>;
```

The `success` boolean lets TypeScript narrow the result, so the client always knows whether to read `data` or
`error`/`fieldErrors` — a thrown error would only surface as an opaque message a form can't display. Reserve throws (or
`notFound()` / `unauthorized()` / `forbidden()`) for cases the user can't act on. Full usage in
[references/types.md](./references/types.md).

## Workflow

1. **Clarify the shape** — what's mutated? Returns data or redirects? What needs validation? What auth/ownership rules?
   Which cache paths become stale?
2. **Pick the response type:** `ActionResponse<T>` to return data; `RedirectAction` to navigate on success;
   `ActionResponse<T>` with a `(prevState, formData)` signature for `useActionState`.
3. **Write the action** (anatomy below).
4. **Write the Zod schema** → [references/validation.md](./references/validation.md).
5. **Wire into React** → [references/hooks.md](./references/hooks.md) /
   [references/react-hook-form.md](./references/react-hook-form.md).

## Anatomy of an action

Fixed sequence so every action reads the same: **directive → auth → validate → mutate → revalidate → return**. Keep
business logic in the data/service layer; the action only orchestrates.

```typescript
"use server"; // must be the first statement in the file (or first line inside an inline action)

import { revalidatePath } from "next/cache";
import { auth } from "~/auth";
import { createLogger } from "~/lib/logger";
import type { ActionResponse } from "~/lib/action-types";
import { createThing } from "../db/things"; // data layer → [error, data] tuple
import { thingSchema, type ThingInput } from "../../schemas/thing";

const logger = createLogger({ module: "things-actions" });

export async function createThingAction(input: ThingInput): ActionResponse<Thing> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Authentication required" };

  const parsed = thingSchema.safeParse(input); // never trust the client
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [error, thing] = await createThing({ ...parsed.data, ownerId: userId });
  if (error) {
    logger
      .withMetadata({ userId, operation: "createThing", errorCode: error.code })
      .error("Failed to create thing");
    return { success: false, error: "Could not create the item" }; // user-safe message
  }

  revalidatePath("/things"); // only on success
  return { success: true, data: thing, message: "Item created" };
}
```

A redirect action ends with `redirect("/next")` instead of returning success (it throws, so nothing after it runs).

## Rules that matter on every action

- **Validate every input with Zod**; return `fieldErrors` from `error.flatten()`.
- **Data layer returns `[error, data]`** (not throws) so the action branches on error kind.
- **Never leak internal errors** — log the real cause (`userId`, `operation`, `errorCode`); return a short, safe
  message.
- **Revalidate only on success**, only affected paths/tags — never `revalidatePath("/")`.
- **Toast follows navigation** — non-redirect: return `message`/`error`, toast client-side; redirect: set a short-lived
  cookie _before_ `redirect()`. Never a toast cookie without a redirect.
- **Order: authenticate → authorize → validate → mutate.**

Detail in [references/patterns.md](./references/patterns.md).

## React integration

`useActionState` (simple native form) · React Hook Form + `useTransition` (rich/typed/dynamic) · `useTransition` (single
button: delete/toggle) · `useOptimistic` (instant feedback). See [references/hooks.md](./references/hooks.md) and
[references/react-hook-form.md](./references/react-hook-form.md).

## Reference files

- [references/types.md](./references/types.md) — contract usage, narrowing, guards, `useActionState` signature.
- [references/examples.md](./references/examples.md) — CRUD, redirect, client toast, `useActionState`, file upload.
- [references/patterns.md](./references/patterns.md) — errors, logging, cache, security, performance, anti-patterns.
- [references/validation.md](./references/validation.md) — Zod schemas, cross-field rules, FormData parsing.
- [references/hooks.md](./references/hooks.md) — `useActionState`, `useFormStatus`, `useTransition`, `useOptimistic`.
- [references/react-hook-form.md](./references/react-hook-form.md) — RHF integration, `useFieldArray`, wizards, UI
  binding.

For the logger itself (`createLogger`, required libraries, full config) see the `structured-logging` skill's
[references/setup.md](../structured-logging/references/setup.md).

## Before reporting done

Run the project's type checker (`npm run type-check` / `tsc --noEmit`) — a mistyped result contract compiles against the
client incorrectly. If a form was touched, exercise it once.

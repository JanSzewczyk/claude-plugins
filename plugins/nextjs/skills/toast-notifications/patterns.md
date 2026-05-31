# Usage Patterns

> **Conventions in these snippets** (adapt to your project):
> - Import path `@/lib/toast/server/toast.cookie` — change the alias to match yours.
> - Actions return a generic shape `{ success: boolean; error?: string; fieldErrors?: … }`.
>   Swap in your own action-response type if you have one. Redirecting actions return
>   `Promise<void>` because `redirect()` throws (nothing after it runs).
> - `getCurrentUserId()` stands in for your auth helper.

## Decision: cookie (server) vs. handle on the client

The cookie exists to carry a message **across a navigation the client can't observe**. Reach
for it only then. If the action's result comes back to the component, the client already has
everything it needs — toast there, no cookie required.

| Situation | Where to toast |
| --- | --- |
| Action ends in `redirect()` (or otherwise navigates away) | **Server** — `setToastCookie` before redirecting; it shows on the destination page |
| Action `return`s a result object the component receives (`{ success, error, … }`) | **Client** — read the returned state and call your toast lib. **Don't** set the cookie. |

Why prefer the client when a result is returned: it's synchronous (no cookie write/read/clear
round-trip), it can't be overwritten by a concurrent action, and the message lives next to the
state that produced it. The cookie path only earns its complexity when the response is thrown
away by a redirect.

---

## Server-side (cookie) — use when the action redirects

### Pattern 1 — Toast after redirect (the canonical case)

Set the cookie only on the branch that redirects. The error branch here returns to the client,
so it does **not** set a cookie — the client toasts that.

```ts
"use server";

import { redirect } from "next/navigation";
import { setToastCookie } from "@/lib/toast/server/toast.cookie";

export async function createResource(data: FormData) {
  const [error, resource] = await createResourceInDb(data);

  if (error) {
    return { success: false, error: "Failed to create resource" }; // returned → client toasts it
  }

  await setToastCookie("Resource created successfully!", "success");
  redirect(`/resources/${resource.id}`); // response is discarded → cookie carries the message
}
```

### Pattern 2 — Set the cookie BEFORE redirect

```ts
await setToastCookie("Action completed", "success");
redirect("/dashboard");

// ❌ wrong — code after redirect() never runs (it throws)
redirect("/dashboard");
await setToastCookie("This never runs", "success");
```

### Pattern 3 — Auth / access feedback before sending the user away

```ts
const userId = await getCurrentUserId();
if (!userId) {
  await setToastCookie("Please sign in to continue", "warning");
  redirect("/sign-in"); // user lands on /sign-in and sees why
}
```

### Pattern 4 — Guidance through a multi-step flow that redirects

```ts
const [error] = await saveStep(data);
if (error) {
  return { success: false, error: "Failed to save. Please try again." }; // stays on page → client toasts
}
redirect("/onboarding/step-2");

// …and a celebratory toast when the flow finishes and routes to the dashboard:
await setToastCookie("Welcome! Your account is ready.", "success", 8_000);
redirect("/dashboard");
```

### Pattern 5 — Bulk action that redirects to a results page

When the outcome is summarized on a *different* page, the cookie carries the summary.

```ts
let ok = 0;
let failed = 0;
for (const id of ids) {
  const [error] = await processItem(id);
  error ? failed++ : ok++;
}

if (failed === 0) await setToastCookie(`Processed ${ok} items`, "success");
else if (ok === 0) await setToastCookie("Failed to process items", "error");
else await setToastCookie(`Processed ${ok} items, ${failed} failed`, "warning");

redirect("/items");
```

(If this action stays on the same page instead, return `{ ok, failed }` and toast on the client.)

### Duration

`setToastCookie(message, type, durationMs)` — the third arg is milliseconds, forwarded to your
toast library:

```ts
await setToastCookie("Saved", "success", 2_000);                    // short
await setToastCookie("Your subscription expires in 3 days.", "warning", 10_000); // longer
```

---

## Client-side (no cookie) — use when the action returns a result

### Pattern 6 — Form with `useActionState`: toast from returned state

The action just returns its result; the component toasts it. No `setToastCookie` server-side.

```ts
"use server";

import { revalidatePath } from "next/cache";

export async function updateProfile(_prev: unknown, data: FormData) {
  const [error] = await updateProfileInDb(data);
  if (error) return { success: false, error: "Failed to update profile" };

  revalidatePath("/settings");
  return { success: true };
}
```

```tsx
"use client";

import * as React from "react";
import { toast } from "REPLACE_WITH_YOUR_TOAST_LIBRARY";
import { updateProfile } from "../server/actions/update-profile";

export function ProfileForm() {
  const [state, formAction, isPending] = React.useActionState(updateProfile, null);

  React.useEffect(() => {
    if (!state) return;
    if (state.success) toast.success("Profile updated!");
    else if (state.error) toast.error(state.error);
  }, [state]);

  return <form action={formAction}>{/* … */}</form>;
}
```

### Pattern 7 — Validation feedback

Return `fieldErrors` for inline messages, and a general `error` the client can toast. Still no
server cookie — the result is returned, so the client owns the toast.

```ts
const parsed = formSchema.safeParse(Object.fromEntries(data));
if (!parsed.success) {
  return {
    success: false,
    error: "Please check the form for errors",        // client may toast this
    fieldErrors: parsed.error.flatten().fieldErrors    // shown inline next to fields
  };
}
```

### Pattern 8 — Imperative call (not a form): toast the awaited result

```tsx
"use client";

import { toast } from "REPLACE_WITH_YOUR_TOAST_LIBRARY";
import { archiveItem } from "../server/actions/archive-item";

async function onArchive(id: string) {
  const result = await archiveItem(id); // returns { success, error? }, no redirect
  if (result.success) toast.success("Item archived");
  else toast.error(result.error ?? "Couldn't archive the item");
}
```

---

## Anti-patterns

**Don't set the cookie when the action returns a result to the client.** It's an unnecessary
round-trip and can be clobbered by another action writing the same cookie.

```ts
// ❌ result is returned anyway — the client can toast it directly
if (error) {
  await setToastCookie("Failed to update", "error");
  return { success: false, error: "Failed to update" };
}

// ✅ return it; toast on the client from the returned state
if (error) return { success: false, error: "Failed to update" };
```

**Don't include sensitive / internal info** — cookie messages are client-readable:

```ts
await setToastCookie(`User ${userId} failed auth with code ${code}`, "error"); // ❌
await setToastCookie("Authentication failed. Please try again.", "error");     // ✅
```

**Don't use a toast for inline field validation** — return `fieldErrors` instead:

```ts
await setToastCookie("Email is required", "error"); // ❌
return { success: false, error: "Validation failed", fieldErrors: { email: ["Email is required"] } }; // ✅
```

**Don't stack multiple cookie toasts** — the cookie holds one message; the last write wins, so
earlier ones are lost. Send a single summary instead:

```ts
await setToastCookie("Step 1 complete", "success"); // ❌ overwritten
await setToastCookie("Step 2 complete", "success");
await setToastCookie("All steps completed successfully!", "success"); // ✅
```

**Don't use toasts for debugging** — use your logger:

```ts
await setToastCookie(`Debug: ${JSON.stringify(data)}`, "info"); // ❌
```

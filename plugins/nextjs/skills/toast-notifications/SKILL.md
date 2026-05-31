---
name: toast-notifications
description: >
  Send a one-shot toast/flash message from a Next.js (App Router) Server Action to the
  client so it appears on the next page render — crucially, surviving a redirect(), which
  normally drops all response data. Works by writing a short-lived cookie that the next
  render reads, fires once, and clears. Library-agnostic plumbing (sonner, react-hot-toast,
  or any toast UI) — it does NOT build the toast component itself. Use this skill whenever a
  Server Action needs to give page-level feedback after a mutation, especially when it ends
  in redirect() or revalidatePath(): "show a success/error message after delete/create/
  update", "toast after redirect", "notify the user after a server-side action", "flash
  message like Rails flash[:notice]", "message waiting on the destination/sign-in page after
  redirect", "setToastCookie", "wire up ToastHandler". Trigger even when the user names their
  toast library (e.g. "fire a sonner toast from a server action that redirects") or doesn't
  say "toast" at all but clearly needs post-redirect feedback. Do NOT use for: building or
  styling a toast/banner UI component (use a component skill), configuring a toast library's
  Toaster, inline per-field form validation errors (return fieldErrors instead), client-side
  loading/optimistic toasts during a fetch, persistent dismissible banners, browser/web-push
  notifications, or setting cookies for non-message state like theme. Bundles ready-to-copy
  source files under assets/.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
metadata:
  author: Szum-Tech Team
  version: "2.1.0"
argument-hint: "show toast after action | toast after redirect | add toast system"
---

# Toast Notifications

A cookie-based toast system that lets a **Server Action send a one-shot message to the
client**, surviving a `redirect()`. The server writes a short-lived cookie; the next page
render reads it, fires the toast, and clears the cookie so it shows exactly once.

It is **library-agnostic** and **dependency-free** (no `js-cookie` — it reads
`document.cookie` directly). You plug in whatever toast UI you already use.

> **Reference files** (read as needed):
> - [architecture.md](./architecture.md) — how it works, cookie config, security, debugging
> - [patterns.md](./patterns.md) — when/how to use it + complete examples (redirect vs.
>   client-handled, validation, bulk, upload) and the do/don't list
>
> **Copy-into-project source** lives under [`assets/lib/toast/`](./assets/lib/toast/).

A redirect response can't carry data back to the component, but a cookie survives the
navigation and auto-expires. See [architecture.md](./architecture.md) for the full rationale,
cookie config, and security notes.

## Installation (run when the toast system isn't present yet)

1. **Check whether the project already has it.** Search for `setToastCookie` or a
   `lib/toast/` (or similar) folder. If it exists, skip to *Usage* — don't duplicate it.

2. **Copy the four bundled files** from this skill's `assets/lib/toast/` into the project
   (a `lib/toast/` folder is the conventional home, but anywhere works):

   ```
   <project>/lib/toast/
   ├── constants.ts                 # cookie name + max-age (seconds)
   ├── types.ts                     # ToastType, ToastMessage
   ├── server/toast.cookie.ts       # setToastCookie() — server-only
   └── components/toast-handler.tsx # ToastHandler — client, reads cookie on route change
   ```

   The files import each other with **relative paths**, so they work no matter what path
   alias (`@/`, `~/`, …) the project uses.

3. **Wire your toast library into `toast-handler.tsx`** (two marked steps inside the file):
   replace `REPLACE_WITH_YOUR_TOAST_LIBRARY` with your import and adjust the `switch` if your
   library lacks `.warning` / `.info`. Recommended: `@szum-tech/design-system` (exposes
   `.success` / `.error` / `.warning` / `.info`); alternatives include `sonner` or
   `react-hot-toast`.

4. **Mount `<ToastHandler />` once** near the app root, alongside your toast library's
   container, so it runs on every route change:

   ```tsx
   // app/layout.tsx (or your providers component)
   import { ToastHandler } from "@/lib/toast/components/toast-handler";
   // import { Toaster } from "sonner"; // your library's container

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html>
         <body>
           {children}
           {/* <Toaster /> */}
           <ToastHandler />
         </body>
       </html>
     );
   }
   ```

   Adjust the import alias (`@/`) to match the project.

## Usage

Use `setToastCookie` **only when the action redirects** — the response is discarded, so the
cookie carries the message to the destination page. When an action instead *returns* a result
to the component, skip the cookie and toast on the client from that result (simpler, no
round-trip). See [patterns.md](./patterns.md) for the full decision rule.

```ts
"use server";

import { redirect } from "next/navigation";
import { setToastCookie } from "@/lib/toast/server/toast.cookie"; // adjust alias

export async function createOrder(formData: FormData) {
  const [error, order] = await createOrderInDb(formData);

  if (error) {
    // Returned to the component → let the client toast it. No cookie here.
    return { success: false, error: "Couldn't create the order. Please try again." };
  }

  await setToastCookie("Order created!", "success");
  redirect(`/orders/${order.id}`); // response discarded → cookie shows it on the destination
}
```

### Toast types & duration

```ts
await setToastCookie("Saved!", "success");
await setToastCookie("Something went wrong", "error");
await setToastCookie("Please review your input", "warning");
await setToastCookie("New features available", "info");

// Optional duration in milliseconds (passed to your toast library):
await setToastCookie("This stays longer", "info", 10_000);
```

## API

```ts
function setToastCookie(message: string, type?: ToastType, duration?: number): Promise<void>;
// type defaults to "success"; duration is milliseconds, forwarded to the toast library.

type ToastType = "success" | "error" | "info" | "warning";
type ToastMessage = { type: ToastType; message: string; duration?: number };
```

## Key rules

- **Cookie only when you redirect.** If the action returns a result to the component, toast on
  the client from that result instead — don't set the cookie (see `patterns.md`).
- **Set the cookie before `redirect()`** — code after `redirect()` never runs (it throws).
- **One `<ToastHandler />` only** — multiple mounts can fire a toast twice.
- **No sensitive data in messages** — the cookie is readable by client JS (`httpOnly: false`)
  and messages are user-facing. Keep them generic.
- **Toasts are for page-level feedback**, not inline field validation — return field errors
  to the form for those.

See `patterns.md` for the full do/don't list and complete server-action examples.

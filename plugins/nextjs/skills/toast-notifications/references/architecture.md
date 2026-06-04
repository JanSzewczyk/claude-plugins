# Toast System Architecture

How the system works and why. The full source is in `assets/lib/toast/` — this file explains
the mechanics, not the line-by-line code.

## Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Server Action  │     │   Set cookie    │     │   redirect()    │
│ setToastCookie()│ ──▶ │ toast_notif…    │ ──▶ │   or return     │
│                 │     │ {type,message}  │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐     ┌─────────────────┐     ┌────────▼────────┐
│  Display toast  │     │  Read + clear   │     │  Client render  │
│  (your lib)     │ ◀── │     cookie      │ ◀── │  ToastHandler   │
│                 │     │                 │     │  useEffect      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Server writes a short-lived cookie; the next client render reads it, fires the toast, and
clears it — so the message appears exactly once on whatever page the redirect lands on.

## Two mechanics that make it work

**Read-and-clear-once.** `ToastHandler` clears the cookie *before* parsing its value and
returns `null` on any parse failure. A malformed or already-read cookie therefore can't loop
or re-fire — the message shows once and is gone.

**Pathname-based triggering.** The handler's effect depends on `usePathname()`, so it re-runs
after every navigation — exactly when a post-redirect toast needs to appear.

## Cookie configuration

```ts
// constants.ts
export const TOAST_COOKIE_NAME = "toast_notification";
export const TOAST_COOKIE_MAX_AGE = 60; // SECONDS
```

| Option     | Value        | Reason                                            |
| ---------- | ------------ | ------------------------------------------------- |
| `maxAge`   | 60 (seconds) | Auto-expires if never consumed. **Not** ms.       |
| `path`     | "/"          | Available on whatever route the redirect lands on |
| `httpOnly` | false        | Must be readable by client JS to display          |
| `sameSite` | "lax"        | Sent with same-site navigations                   |
| `secure`   | prod only    | HTTPS-only in production                           |

> **Gotcha:** Next.js cookie `maxAge` is in **seconds**. `maxAge: 5000` means ~83 minutes, not
> 5 seconds — a common mistake. Keep this value small.

## Why a cookie (and not…)

| Alternative     | Why not                                                              |
| --------------- | ------------------------------------------------------------------- |
| Session storage | Doesn't survive a server redirect; needs client JS to set           |
| URL parameters  | Pollutes the URL; errors become bookmarkable/shareable              |
| Server state    | Complex; doesn't survive a redirect cleanly                         |
| **Cookie**      | Survives `redirect()`, no URL pollution, auto-cleanup, lib-agnostic |

Trade-offs: requires `httpOnly: false`, ~4KB size limit, and a little plumbing.

## Security

- **`httpOnly: false` is required** so client JS can read and display the message. Acceptable
  because the cookie holds only UI text, is cleared immediately after reading, and is short-lived.
- **Never put sensitive data in messages** — they're user-facing and client-readable. Prefer
  `"User created successfully"` over `"User ${id} created with role ${role}"`.
- **Avoid echoing raw user input** into messages (XSS hygiene): `"Welcome!"` over
  `` `Welcome, ${userInput}!` ``.

## Debugging

| Symptom                      | Likely cause            | Fix                                       |
| ---------------------------- | ----------------------- | ----------------------------------------- |
| Toast not showing            | Cookie never set        | Confirm the action runs `setToastCookie`  |
| Toast on wrong page          | Missing `pathname` dep  | Keep `pathname` in the `useEffect` deps   |
| Toast shows twice            | Multiple `ToastHandler` | Mount it exactly once                     |
| Stale/repeat toast           | Cookie not cleared      | Ensure the clear line runs before parsing |
| `.warning`/`.info` undefined | Library lacks them      | Fall back to base `toast(message, options)` |

Inspect manually: DevTools → Application → Cookies → look for `toast_notification` and confirm
the value is valid JSON.

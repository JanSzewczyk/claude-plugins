# Cookie toasts

Rules for when to set a toast cookie: `nextjs-rules` (toast and action notes). Needs the env module
(`toast.cookie.ts` reads `env.NODE_ENV`). Paths are relative to the source root.

## Install

```bash
npm install sonner
```

## Files

Copy `assets/lib/toast/` to `lib/toast/`:

| File | Role |
| --- | --- |
| `constants.ts` | `TOAST_COOKIE_NAME = "toast_notification"`, `TOAST_COOKIE_MAX_AGE = 60` (seconds, not ms) |
| `types.ts` | `ToastType` (`success`, `error`, `info`, `warning`), `ToastMessage` |
| `server/toast.cookie.ts` | `setToastCookie(message, type = "success", duration?)`: server-only; `httpOnly: false`, `path: "/"`, `sameSite: "lax"`, `secure` in production |
| `components/toast-handler.tsx` | Client: clears the cookie first, then parses it and calls sonner; effect depends on `usePathname()` |

The handler imports `sonner`; for another toast library change that import and the four `toast.*` calls.

## Mount once

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

import { ToastHandler } from "~/lib/toast/components/toast-handler";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
        <ToastHandler />
      </body>
    </html>
  );
}
```

If the project has a `<Toaster />` (its own or a design-system one), keep it and mount only
`<ToastHandler />` beside it; switch the handler's import to match that library.

## Use

```ts
import { setToastCookie } from "~/lib/toast/server/toast.cookie";

await setToastCookie("Budget deleted", "success");
redirect("/budgets");
```

Several cookies in one action: the last write wins, so show one summary toast.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No toast | Cookie not set, or the action did not reach `setToastCookie` | Check Application > Cookies for `toast_notification` with valid JSON |
| Toast on the wrong page | `pathname` missing from the effect dependencies | Keep `[pathname]` in `toast-handler.tsx` |
| Toast shows twice | More than one `<ToastHandler />` | Mount it once |
| Same toast repeats | Cookie cleared after parsing | Keep the clear line before the parse |
| Toast lingers for minutes | `maxAge` set in milliseconds | Keep it in seconds, 60 |
| Build error `Module not found: ~/data/env/server` | Env module or `~/` alias missing | Install `env` first, check `tsconfig` paths |

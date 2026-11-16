---
name: setup-app-infrastructure
description: "Sets up shared infrastructure in a Next.js App Router project: T3 Env validation, LogLayer logging, ServiceError plus retry helper, server action result types, cookie toasts. Use when adding or checking this infrastructure in a Next.js project; NOT for the rules (nextjs-rules) or feature scaffolding (generate-feature-package)."
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
argument-hint: "[env | logging | errors | actions | toast | all]"
---

# Set up app infrastructure

Installs the shared modules a Next.js app needs before features are written. This skill holds
the steps and the copy-in files; how to use what it installs is in `nextjs-rules` (rules: nextjs-rules).

| Argument | Module | Already present when | Reference |
| --- | --- | --- | --- |
| `env` | T3 Env: `data/env/server.ts`, `data/env/client.ts` | `createEnv` found | [env.md](./references/env.md) |
| `logging` | LogLayer: `lib/logger.ts`, `proxy.ts` request id | `createLogger` found | [logging.md](./references/logging.md) |
| `errors` | `ServiceError`, `withRetry`, `app/error.tsx` | `ServiceError` found | [errors.md](./references/errors.md) |
| `actions` | `ActionResponse`, `RedirectAction`, form packages | `ActionResponse` found | [actions.md](./references/actions.md) |
| `toast` | `lib/toast/`, sonner, `<ToastHandler />` | `setToastCookie` found | [toast.md](./references/toast.md) |

No argument or `all`: every module that is missing. Ask nothing unless the argument names none of these.

Copy-in files are in `assets/`: `action-types.ts`, `service-error.ts`, `with-retry.ts`, `lib/toast/`.

## Steps

1. **Read the project.** Find the source root (`src/` or the repository root), the package manager
   (lockfile), the type-check script (`type-check`, `typecheck`, or `tsc --noEmit`), and the existing
   modules with `grep -rlE "createEnv|createLogger|ServiceError|ActionResponse|setToastCookie" --include="*.ts" --include="*.tsx" .`
   outside `node_modules`.
2. **Set the alias.** The templates import with `~/`. Check `tsconfig.json`; when `paths` has no
   `~/*`, add `"paths": { "~/*": ["./src/*"] }` (`["./*"]` without a `src/` folder). If the project
   already uses another alias for the same folder, replace `~/` in the copied files instead.
3. **Order the modules.** `env` first, then `logging`, then `errors`, `actions`, `toast`. `logging`,
   `errors` and `toast` need `env`; `errors` needs `logging`. A requested module whose dependency
   is missing installs the dependency first.
4. **Install only what is missing.** For each module, read its reference and:
   - install the packages with the project's package manager;
   - create each file from the reference or `assets/`, in the project's folders;
   - never overwrite an existing file: when a file exists with another shape, add only the missing parts
     (a `redact` config, `x-request-id`, a variable) and list what you left alone.
5. **Wire it.** Do the wiring the reference ends with: `.env.example` and `.gitignore` entries, the
   Vitest setup, `proxy.ts` or `middleware.ts`, `<ToastHandler />` in the root layout, `app/error.tsx`.
6. **Check.** Run the type-check script, fix what the new files break (path aliases, `ServiceError`
   import paths, strict-mode errors), and run it again until it passes. Run the project's tests
   when the env or logging module was added.
7. **Report.** Per module: installed, already present, or partly present, with the files created or
   changed, the packages added, and anything found that breaks a rule (`console.*`, `process.env`
   outside the env files, services that throw) as a list for the user; do not refactor it.

## Do not

- Restate or reinterpret the rules in project files; link to `nextjs-rules` when a comment needs one.
- Add variables, loggers or error codes the project does not need yet.
- Edit generated files of `nextjs-rules`.

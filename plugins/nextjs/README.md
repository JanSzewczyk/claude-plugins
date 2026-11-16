# nextjs

Next.js full-stack development — agents and skills for building modern web apps with the Next.js App Router: a task flow for SDD, developer, tester and reviewer agents, the `nextjs-rules` knowledge skill (routing, feature architecture, server actions, errors, logging, env), app infrastructure setup, performance and Lighthouse audits, and API route tests. The top layer of the stack: it builds on **react**, **typescript** and the **testing** core.

## Contents

### Agents

| Agent | Description |
| --- | --- |
| **nextjs-developer** | Implements pages, layouts, server actions, services and components with their Vitest and Storybook tests; commits as the brief says. |
| **nextjs-tester** | Writes independent tests from the acceptance criteria at the cheapest sensible layer; reports defects as failing tests. |
| **code-reviewer** | Reviews a diff against the team rules with the project's checks run and findings reproduced; returns a verdict, a findings table and an `SDD: PASS/FAIL/SKIPPED` line. Works without a hand-off. |
| **performance-analyzer** | Analyze bundle size, React rendering efficiency, database queries, Core Web Vitals. Uses Next.js DevTools MCP for runtime diagnostics. |

### Skills

| Skill | Invoke with | Description |
| --- | --- | --- |
| **run-nextjs-task** | `/run-nextjs-task` | Runs one planned task (for example handed over by SDD `/sdd:implement`) through developer, tester and reviewer, with no questions. Set `skill:nextjs:run-nextjs-task` in `specs/capabilities.yml`. |
| **nextjs-rules** | — (preloaded) | Generated background knowledge: Server Components and the client boundary, page and layout data loading, feature folders and layer order, server actions, error tuples and ServiceError, LogLayer logging, T3 Env. Preloaded by the three agents. |
| **setup-app-infrastructure** | `/setup-app-infrastructure` | Adds validated env (T3 Env), LogLayer logging, ServiceError and retry helper, server action result types and cookie toasts to a project. |
| **generate-feature-package** | `/generate-feature-package` | Scaffolds a new `features/<name>/` domain package — zone folders and barrel files following the feature-architecture spec |
| **devlogs** | `/devlogs` | Audits a LogLayer + Pino dev-session log (`tmp/app.log`) for missing context, sensitive-data leaks, and logging-rule violations |
| **api-test** | `/api-test` | Testing Next.js Route Handlers with Playwright — real HTTP requests, response validation |
| **performance-optimization** | `/performance-optimization` | Bundle analysis, React rendering optimization, database query tuning, code splitting patterns |
| **lighthouse-audit** | `/lighthouse-audit` | Build the production app, run Lighthouse via `@lhci/cli`, score all five categories, generate a prioritized Next.js fix plan |

The rules in `nextjs-rules` are generated from `knowledge/` and also written to `.claude/rules` files
in `shared-rules` (`/sync-rules` copies them into a project).

This also installs **react**, **typescript**, **testing** and **design**, whose skills the agents preload.

## Usage

**With SDD** — set the implementation flow for the app in `specs/capabilities.yml`:

```yaml
implementation:
  projects:
    "@my-org/web": skill:nextjs:run-nextjs-task
review:
  projects:
    "@my-org/web": agent:nextjs:code-reviewer
```

**Backend work** — the `nextjs-developer` handles server-side tasks:

> "Use nextjs-developer to create a server action for updating user settings"

**Skills** — invoke any skill directly:

> `/setup-app-infrastructure env` — adds T3 Env validation
> `/lighthouse-audit` — build, audit with Lighthouse, and plan fixes

**Code review** after implementing a feature:

> "Use code-reviewer to review the changes in features/checkout/"

**Analyze performance:**

> "Use performance-analyzer to check the bundle size after adding the chart library"

**Test a feature** against its criteria:

> "Use nextjs-tester to test the checkout flow against these acceptance criteria"

## Tech Stack Compatibility

| Technology      | Minimum Version  |
| --------------- | ---------------- |
| Next.js         | 15+ (App Router) |
| React           | 19+              |
| TypeScript      | 5.7+             |
| React Hook Form | 7.x              |
| Zod             | 3.x / 4.x        |
| LogLayer + Pino | current          |

## Troubleshooting

| Problem                                     | Solution                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Agent doesn't pick up project conventions   | Ensure `CLAUDE.md` describes your stack, auth provider, and database                                           |
| Rules assume `auth()` for the session       | Adapt the check to your provider (Clerk, NextAuth, Supabase, JWT) — the order of steps stays the same          |
| Error handling references Firebase          | `ServiceError` pattern works with any database — replace `categorizeServiceError` with your DB's error mapping |
| Toast notifications not showing             | Check that `ToastHandler` is in your root layout providers and `usePathname` triggers are set up               |
| performance-analyzer shows wrong bundle sizes | Run `npm run build` first to generate fresh build output |
| Lighthouse: Chrome not found | Install it with `npx @puppeteer/browsers install chrome@stable` |
| `lhci` times out waiting for server | Increase `startServerReadyTimeout` in the generated `lighthouserc.json`, or start the server yourself and use `--no-build` |

## Related Plugins

- [**react**](../react/) — React 19 Compiler, Storybook tests, accessibility audits
- [**typescript**](../typescript/) — Vitest unit tests, dependency updates, dead-code sweeps
- [**design**](../design/) — Szum-Tech design system, Tailwind CSS v4
- [**testing**](../testing/) — Playwright and test data builders
- [**firebase**](../firebase/) — Firebase Firestore patterns and database architecture

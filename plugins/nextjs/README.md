# nextjs

Next.js full-stack development — agents and skills for building modern web apps with the Next.js App Router: Server Actions, production-grade server-side patterns, code review, performance and Lighthouse audits, API route tests, and test strategy. The top layer of the stack: it builds on **react**, **typescript** and the **testing** core.

## Contents

### Agents

| Agent                       | Description                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| **nextjs-backend-engineer** | Implement server actions, route handlers, API endpoints, database operations, authentication flows. |
| **code-reviewer** | Comprehensive code review — quality, performance, type safety, security, pattern compliance. Runs automated checks (TypeScript, ESLint, Prettier) before manual review. |
| **performance-analyzer** | Analyze bundle size, React rendering efficiency, database queries, Core Web Vitals. Uses Next.js DevTools MCP for runtime diagnostics. |
| **testing-strategist** | Plan test strategies, analyze coverage gaps, select appropriate test types (unit/integration/E2E). Follows the Testing Trophy model. |

### Skills

| Skill                        | Invoke with                 | Description                                                                                                               |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **server-actions**           | `/server-actions`           | Next.js Server Actions — form handling, Zod validation, React Hook Form integration, ActionResponse types                 |
| **t3-env-validation**        | `/t3-env-validation`        | Type-safe env vars with `@t3-oss/env-nextjs` and Zod                                                                      |
| **structured-logging**       | `/structured-logging`       | Pino structured logging — context enrichment, log levels, dev pretty-printing                                             |
| **toast-notifications**      | `/toast-notifications`      | Cookie-based toast notification system for Server Actions                                                                 |
| **error-handling**           | `/error-handling`           | ServiceError patterns, error boundaries, standardized error responses                                                     |
| **generate-feature-package** | `/generate-feature-package` | Scaffolds a new `features/<name>/` domain package — zone folders and barrel files following the feature-architecture spec |
| **devlogs**                  | `/devlogs`                  | Audits a LogLayer + Pino dev-session log (`tmp/app.log`) for missing context, sensitive-data leaks, and structured-logging violations |
| **api-test**                 | `/api-test`                 | Testing Next.js Route Handlers with Playwright — real HTTP requests, response validation |
| **performance-optimization** | `/performance-optimization` | Bundle analysis, React rendering optimization, database query tuning, code splitting patterns |
| **lighthouse-audit**         | `/lighthouse-audit`         | Build the production app, run Lighthouse via `@lhci/cli`, score all five categories, generate a prioritized Next.js fix plan |

## Installation

```bash
/plugin install nextjs@szum-tech
```

This also installs **react**, **typescript**, **testing** and **design**, whose skills the agents preload.

## Usage

**Backend work** — the `nextjs-backend-engineer` handles server-side tasks:

> "Use nextjs-backend-engineer to create a server action for updating user settings"

**Skills** — invoke any skill directly:

> `/server-actions` — opens Server Actions patterns and examples
> `/error-handling` — opens ServiceError and error boundary patterns
> `/lighthouse-audit` — build, audit with Lighthouse, and plan fixes

**Code review** after implementing a feature:

> "Use code-reviewer to review the changes in features/checkout/"

**Analyze performance:**

> "Use performance-analyzer to check the bundle size after adding the chart library"

**Plan a test strategy** for a feature:

> "Use testing-strategist to plan tests for the checkout flow"

## Tech Stack Compatibility

| Technology      | Minimum Version  |
| --------------- | ---------------- |
| Next.js         | 15+ (App Router) |
| React           | 19+              |
| TypeScript      | 5.7+             |
| React Hook Form | 7.x              |
| Zod             | 3.x / 4.x        |
| Pino            | 9.x / 10.x       |

## Troubleshooting

| Problem                                     | Solution                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Agent doesn't pick up project conventions   | Ensure `CLAUDE.md` describes your stack, auth provider, and database                                           |
| `/server-actions` assumes Clerk auth        | Adapt auth check to your provider (NextAuth, Supabase, JWT) — the pattern remains the same                     |
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

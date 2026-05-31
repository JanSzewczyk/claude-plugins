# nextjs

Next.js full-stack development — an agent and skills for building modern web apps with the Next.js App Router, Server Actions, and production-grade server-side patterns.

## Contents

### Agents

| Agent                       | Description                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| **nextjs-backend-engineer** | Implement server actions, route handlers, API endpoints, database operations, authentication flows. |

### Skills

| Skill                        | Invoke with                 | Description                                                                                                               |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **server-actions**           | `/server-actions`           | Next.js Server Actions — form handling, Zod validation, React Hook Form integration, ActionResponse types                 |
| **t3-env-validation**        | `/t3-env-validation`        | Type-safe env vars with `@t3-oss/env-nextjs` and Zod                                                                      |
| **structured-logging**       | `/structured-logging`       | Pino structured logging — context enrichment, log levels, dev pretty-printing                                             |
| **toast-notifications**      | `/toast-notifications`      | Cookie-based toast notification system for Server Actions                                                                 |
| **error-handling**           | `/error-handling`           | ServiceError patterns, error boundaries, standardized error responses                                                     |
| **generate-feature-package** | `/generate-feature-package` | Scaffolds a new `features/<name>/` domain package — zone folders and barrel files following the feature-architecture spec |

## Installation

### 1. Copy the agent

```bash
cp plugins/nextjs/agents/nextjs-backend-engineer.md your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/nextjs/skills/server-actions           your-project/.claude/skills/
cp -r plugins/nextjs/skills/t3-env-validation        your-project/.claude/skills/
cp -r plugins/nextjs/skills/structured-logging       your-project/.claude/skills/
cp -r plugins/nextjs/skills/toast-notifications      your-project/.claude/skills/
cp -r plugins/nextjs/skills/error-handling           your-project/.claude/skills/
cp -r plugins/nextjs/skills/generate-feature-package your-project/.claude/skills/
```

Or copy everything at once:

```bash
cp plugins/nextjs/agents/*.md    your-project/.claude/agents/
cp -r plugins/nextjs/skills/*    your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/nextjs-backend-engineer.md
ls your-project/.claude/skills/server-actions/SKILL.md
```

## Usage

**Backend work** — the `nextjs-backend-engineer` handles server-side tasks:

> "Use nextjs-backend-engineer to create a server action for updating user settings"

**Skills** — invoke any skill directly:

> `/server-actions` — opens Server Actions patterns and examples
> `/error-handling` — opens ServiceError and error boundary patterns

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
| Agent doesn't pick up project conventions   | Ensure `.claude/project-context.md` exists and describes your stack, auth provider, and database               |
| `/server-actions` assumes Clerk auth        | Adapt auth check to your provider (NextAuth, Supabase, JWT) — the pattern remains the same                     |
| Error handling references Firebase          | `ServiceError` pattern works with any database — replace `categorizeServiceError` with your DB's error mapping |
| Toast notifications not showing             | Check that `ToastHandler` is in your root layout providers and `usePathname` triggers are set up               |
| Agent references skills from testing plugin | Install skills from the **testing** plugin for full agent functionality                                        |

## Related Plugins

- [**react**](../react/) — React 19 Compiler, hooks, component-driven UI
- [**design**](../design/) — Szum-Tech design system, Tailwind CSS v4
- [**testing**](../testing/) — Storybook tests, Playwright E2E, accessibility audits
- [**code-quality**](../code-quality/) — Code review, performance analysis
- [**firebase**](../firebase/) — Firebase Firestore patterns and database architecture

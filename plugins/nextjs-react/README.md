# nextjs-react

React & Next.js full-stack development — agents and skills for building modern web apps with React 19, Next.js App Router, Tailwind CSS v4, and Server Actions.

## Contents

### Agents

| Agent | Description |
|-------|-------------|
| **frontend-expert** | Build UI components, style with Tailwind CSS, integrate design systems, fix UI bugs. Defaults to Server Components, uses React Compiler. |
| **nextjs-backend-engineer** | Implement server actions, route handlers, API endpoints, database operations, authentication flows. |

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **react-19-compiler** | `/react-19-compiler` | React 19 hooks, React Compiler optimization, memoization decisions |
| **server-actions** | `/server-actions` | Next.js Server Actions — form handling, Zod validation, React Hook Form integration, ActionResponse types |
| **tailwind-css-4** | `/tailwind-css-4` | Tailwind CSS v4 — CSS-first config, `@theme` directive, design system integration, responsive patterns |
| **t3-env-validation** | `/t3-env-validation` | Type-safe env vars with `@t3-oss/env-nextjs` and Zod |
| **structured-logging** | `/structured-logging` | Pino structured logging — context enrichment, log levels, dev pretty-printing |
| **toast-notifications** | `/toast-notifications` | Cookie-based toast notification system for Server Actions |
| **error-handling** | `/error-handling` | DbError patterns, error boundaries, standardized error responses |

### Examples

- `agents/examples/server-actions.example.md` — Server Action implementation example
- `agents/examples/database-queries.example.md` — Database query patterns example

## Installation

### 1. Copy agents

```bash
cp plugins/nextjs-react/agents/frontend-expert.md       your-project/.claude/agents/
cp plugins/nextjs-react/agents/nextjs-backend-engineer.md your-project/.claude/agents/

# Optional: copy example outputs
cp -r plugins/nextjs-react/agents/examples/              your-project/.claude/agents/examples/
```

### 2. Copy skills

```bash
cp -r plugins/nextjs-react/skills/react-19-compiler     your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/server-actions         your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/tailwind-css-4         your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/t3-env-validation      your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/structured-logging     your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/toast-notifications    your-project/.claude/skills/
cp -r plugins/nextjs-react/skills/error-handling         your-project/.claude/skills/
```

Or copy everything at once:

```bash
cp plugins/nextjs-react/agents/*.md    your-project/.claude/agents/
cp -r plugins/nextjs-react/skills/*    your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/frontend-expert.md
ls your-project/.claude/skills/server-actions/SKILL.md
```

## Usage

**Frontend work** — Claude will use the `frontend-expert` agent automatically for UI tasks, or you can invoke it directly:
> "Use frontend-expert to build a user profile card"

**Backend work** — the `nextjs-backend-engineer` handles server-side tasks:
> "Use nextjs-backend-engineer to create a server action for updating user settings"

**Skills** — invoke any skill directly:
> `/server-actions` — opens Server Actions patterns and examples
> `/tailwind-css-4` — opens Tailwind v4 reference

## Tech Stack Compatibility

| Technology | Minimum Version |
|-----------|----------------|
| Next.js | 15+ (App Router) |
| React | 19+ |
| TypeScript | 5.7+ |
| Tailwind CSS | 4.0+ |
| React Hook Form | 7.x |
| Zod | 3.x / 4.x |
| Pino | 9.x / 10.x |

## Related Plugins

- [**testing**](../testing/) — Storybook tests, Playwright E2E, accessibility audits
- [**code-quality**](../code-quality/) — Code review, performance analysis
- [**dev-experience**](../dev-experience/) — Statusline, safety hooks

# firebase-auth

Firebase Firestore database patterns, data migrations, Clerk authentication proxy, and database architecture.

## Contents

### Agents

| Agent | Description |
|-------|-------------|
| **database-architect** | Design data models, optimize database queries, plan data migrations, manage type lifecycle patterns (Base, DB, Application, Create DTO, Update DTO). |

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **firebase-firestore** | `/firebase-firestore` | Firestore query patterns, type lifecycle, tuple error handling `[Error, Data]`, config, seeding |
| **db-migration** | `/db-migration` | Migration scripts — lazy, batch, dual-write strategies, rollback plans |
| **clerk-auth-proxy** | `/clerk-auth-proxy` | Clerk auth with Next.js proxy pattern (`proxy.ts` not `middleware.ts`), session claims, onboarding gates |

## Installation

### 1. Copy agent

```bash
cp plugins/firebase-auth/agents/database-architect.md  your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/firebase-auth/skills/*  your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/database-architect.md
ls your-project/.claude/skills/firebase-firestore/SKILL.md
```

## Usage

**Design a data model:**
> "Use database-architect to design the data model for a multi-tenant SaaS app"

**Invoke skills directly:**
> `/firebase-firestore` — Firestore patterns, type lifecycle, error handling
> `/db-migration` — Generate migration scripts for schema changes
> `/clerk-auth-proxy` — Clerk authentication patterns

## Prerequisites

These skills document patterns for specific technologies. Install them in your project first:

| Skill | Requires |
|-------|----------|
| firebase-firestore | `firebase-admin` |
| db-migration | `firebase-admin` |
| clerk-auth-proxy | `@clerk/nextjs` |

Skills work as reference documentation even before installing the dependencies — useful for planning and architecture decisions.

## Related Plugins

- [**nextjs-react**](../nextjs-react/) — Server Actions and error handling patterns used with database operations
- [**code-quality**](../code-quality/) — Code review agent validates database patterns

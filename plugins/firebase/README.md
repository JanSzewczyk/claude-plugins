# firebase

Firebase Firestore database patterns, data migrations, and database architecture.

## Contents

### Agents

| Agent                  | Description                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **database-architect** | Design data models, optimize database queries, plan data migrations, manage type lifecycle patterns (Base, DB, Application, Create DTO, Update DTO). |

### Skills

| Skill                  | Invoke with           | Description                                                                                     |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| **firebase-firestore** | `/firebase-firestore` | Firestore query patterns, type lifecycle, tuple error handling `[Error, Data]`, config, seeding |
| **db-migration**       | `/db-migration`       | Migration scripts — lazy, batch, dual-write strategies, rollback plans                          |

## Installation

### 1. Copy agent

```bash
cp plugins/firebase/agents/database-architect.md  your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/firebase/skills/*  your-project/.claude/skills/
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

## Prerequisites

These skills document patterns for specific technologies. Install them in your project first:

| Skill              | Requires         |
| ------------------ | ---------------- |
| firebase-firestore | `firebase-admin` |
| db-migration       | `firebase-admin` |

Skills work as reference documentation even before installing the dependencies — useful for planning and architecture decisions.

## Troubleshooting

| Problem                                | Solution                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Firebase Admin SDK not initializing    | Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `.env.local`. Handle newlines: `key.replace(/\\n/g, "\n")` |
| `categorizeDbError` returns "unknown"  | Verify you're catching `FirebaseError` (from `firebase-admin`). See error code reference in `errors.md`                                    |
| Migration script processes 0 documents | Verify collection name and field names in `shouldSkip()`. Run with `--dry-run` first                                                       |
| Type lifecycle confusing               | Start with `types.md` in firebase-firestore — it has a visual diagram of Base / Firestore / App / CreateDTO / UpdateDTO                    |

## Related Plugins

- [**nextjs-react**](../nextjs-react/) — Server Actions and error handling patterns used with database operations
- [**code-quality**](../code-quality/) — Code review agent validates database patterns

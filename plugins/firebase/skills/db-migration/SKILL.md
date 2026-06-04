---
name: db-migration
description: Generate Firestore data migration scripts for schema changes, field additions, and data transformations. Use when migrating data, adding fields, or restructuring collections.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Firestore Migration Skill

Generate safe, idempotent migration scripts to evolve Firestore data without loss — adding fields,
renaming/restructuring, transforming formats, removing deprecated fields, backfilling, or splitting
and merging collections.

This file holds the rules and process. The script template and worked migrations live in the reference:

> - [references/examples.md](./references/examples.md) — the full migration script template plus six
>   worked examples (add field, rename, transform, backfill, remove field, conditional), CLI commands,
>   and best practices. **Start every script by copying the template from here.**

## Migration Principles

Every script must be:

1. **Idempotent** — running it twice produces the same result (guard with a skip check).
2. **Resumable** — can continue from where it stopped via a `--start-after=<docId>` cursor.
3. **Dry-run first** — preview changes before applying; default to dry run.
4. **Batched** — process in batches (≤ 500 writes) to avoid timeouts.
5. **Logged** — record progress, skips, and errors for debugging.

## Process

### 1. Analyze the change

Identify the source collection, the current vs. target document structure, an estimate of affected
documents, and any relationships/dependencies.

### 2. Assess the risk level

The risk dictates the approach — don't skip this step:

| Risk     | Criteria                 | Approach                      |
| -------- | ------------------------ | ----------------------------- |
| Low      | Adding optional field    | Direct migration              |
| Medium   | Restructuring data       | Migration with validation     |
| High     | Removing/renaming fields | Dual-write period recommended |
| Critical | Changing primary keys    | Manual review required        |

### 3. Generate the script

Copy the template from [references/examples.md](./references/examples.md#migration-template) into
`scripts/migrations/YYYY-MM-DD-description.ts`, then implement the two hooks for your case:

- **`shouldSkip(data)`** — return `true` when a document is already migrated (this is what makes the
  script idempotent).
- **`computeUpdates(data)`** — return the field updates to apply.

The matching `shouldSkip` / `computeUpdates` bodies for common cases (add, rename, restructure,
convert types, remove) are in the worked examples — adapt the closest one.

### 4. Update type definitions

After the data migrates, update the affected types so code matches the new shape:

```typescript
export type ResourceBase = {
  name: string;
  newField: string; // Added in migration YYYY-MM-DD
};
```

## How to Run

```bash
# 1. Preview (dry run — no writes)
npx ts-node scripts/migrations/YYYY-MM-DD-description.ts

# 2. Apply
npx ts-node scripts/migrations/YYYY-MM-DD-description.ts --apply

# 3. Resume after an interruption
npx ts-node scripts/migrations/YYYY-MM-DD-description.ts --apply --start-after=docId123

# 4. Test against a limited set
npx ts-node scripts/migrations/YYYY-MM-DD-description.ts --limit=10
```

## Safety Checklist

Before running with `--apply`:

- [ ] Dry run completed successfully
- [ ] A sample of changes reviewed manually
- [ ] Database backup created (or point-in-time recovery enabled)
- [ ] Type definitions ready to update
- [ ] Rollback script prepared (for high-risk migrations)
- [ ] Team notified of the migration window
- [ ] Error monitoring in place

## Rollback

For reversible migrations, ship a `rollback()` alongside `migrate()` that inverts `computeUpdates`
(e.g. restore `oldFieldName` from `newFieldName`, delete `newFieldName`). High-risk migrations
(renames, removals) should always have one before `--apply`.

## Questions to Ask

- What is the current structure of affected documents, and how many are there?
- Is there a deadline or maintenance window? What happens to the app during migration?
- Do we need dual-write support during the transition?
- What is the rollback strategy if something goes wrong?

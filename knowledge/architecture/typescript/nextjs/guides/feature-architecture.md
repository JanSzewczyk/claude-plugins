---
title: Structure a Next.js app as feature folders with a server-only core
summary: features/{domain}/ per business area; server/ layered action, service, permissions, db; types/ the only bridge.
impact: high
applies: [typescript, nextjs]
decides: [architecture/typescript/nextjs/organize-code-into-feature-folders, architecture/typescript/nextjs/import-feature-code-from-its-sub-paths, architecture/typescript/nextjs/keep-server-code-out-of-client-bundles, architecture/typescript/nextjs/share-types-with-client-code-only-through-types, architecture/typescript/nextjs/import-feature-layers-in-one-direction, architecture/typescript/nextjs/cache-service-reads-with-primitive-arguments, architecture/typescript/nextjs/check-a-service-mutation-in-a-fixed-guard-order, architecture/typescript/nextjs/put-permission-checks-in-a-server-only-permissions-file, architecture/typescript/nextjs/do-one-operation-per-db-function, architecture/typescript/nextjs/run-transactions-in-the-service, architecture/typescript/nextjs/put-cross-feature-entity-operations-in-features-shared]
sources: [https://nextjs.org/docs/app/getting-started/project-structure, https://nextjs.org/docs/app/guides/data-security, https://martinfowler.com/bliki/PresentationDomainDataLayering.html]
---

## Decision

Give every business area a `features/{domain}/` folder; `app/` holds only routes that import from features. Inside a feature, `server/` is server-only and layered in one direction: action, service, permissions, then `db/` or `api/`. Client code reaches a feature only through `components/`, `schemas/`, `constants/` and `types/`, and receives server actions as props. Services return `[error, data]` tuples, cache their reads and own transactions; db functions do one operation each.

## Options

| Choice | Fits when | Cost |
| --- | --- | --- |
| Flat `server/db/` (`schema.ts`, `queries.ts`, `mutations.ts`, `index.ts`) | the feature has one data model | none |
| Nested `server/db/{schema}/`, each with the same four files | the feature has two or more data models | one more folder level |
| `server/api/`, one external-API concern per file | the feature calls a third-party API directly | another layer to keep tuple-shaped |
| `utils/`, `context/`, `hooks/`, `constants/` | the feature needs pure helpers, client state or shared constants | none if added on demand; empty folders if scaffolded |
| `features/shared/server/db/{entity}/` | an entity is written by several features | a shared module both features depend on |

## Layouts

```text
features/{domain}/
├── components/
│   ├── forms/
│   ├── {component}.tsx
│   ├── {component}.stories.tsx
│   └── index.tsx                   # barrel: components only
├── constants/                      # on demand
├── schemas/
│   ├── {domain}-schema.ts          # Zod schema + derived form types
│   └── {domain}-schema.test.ts
├── server/                         # server-only; no index.ts
│   ├── actions/
│   │   ├── {verb}-{domain}.action.ts
│   │   ├── map-service-error.ts    # error code → user-facing message
│   │   └── {domain}-actions.test.ts
│   ├── db/
│   │   ├── schema.ts               # data model + row types; never re-exported
│   │   ├── queries.ts              # one read per function
│   │   ├── mutations.ts            # one write per function
│   │   └── index.ts                # re-exports queries + mutations only
│   ├── api/                        # on demand: {verb}-{resource}.ts, one concern per file
│   ├── services/
│   │   └── {domain}.service.ts     # guard chain, cached reads, transactions
│   └── permissions.ts              # canDoX guards
├── types/
│   ├── {entity}.ts                 # closed sets, DTOs, view and filter types
│   └── index.ts                    # barrel: every type file
├── utils/                          # on demand: pure, unit-tested
├── context/                        # on demand: {name}.context.tsx
├── hooks/                          # on demand: use-{name}.ts
└── test/
    └── builders/
        ├── {entity}.builder.ts     # imports types/, never server/
        └── index.ts
```

With two or more data models, `server/db/` nests:

```text
server/db/
├── index.ts                        # re-exports every subfolder's queries + mutations
├── {schema-a}/{schema.ts, queries.ts, mutations.ts, index.ts}
└── {schema-b}/{schema.ts, queries.ts, mutations.ts, index.ts}
```

## Evolution

- Scaffold a feature with `components/`, `schemas/`, `types/`, `server/` and `test/builders/` only; add the optional folders the first time a file needs them.
- When a second data model appears in a feature, move every model into its own `server/db/{schema}/` subfolder in one change; never mix a flat `schema.ts` with subfolders.
- When a second feature needs to write an entity, move that operation into `features/shared/server/db/{entity}/` and point both services at it.
- When one feature grows several unrelated data models and screens, split it into two features along the business boundary, moving one model with its services, actions and components at a time.

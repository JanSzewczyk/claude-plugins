---
name: generate-feature-package
description: Scaffold a new feature domain package under features/<name>/ in this project, following the feature-architecture spec. Use whenever the user wants to create/start/bootstrap a new feature, domain, module, or slice — e.g. "create a feature for invoices", "scaffold a new domain", "/generate-feature-package payments", "set up the folder structure for a new module". Creates the zone folders (components, constants, schemas, types, server/{actions,api,db,services}, test/builders) with empty barrel index files ready for exports.
allowed-tools: Bash, Read
metadata:
  author: szum-techK
  version: "1.0.0"
argument-hint: "<feature-name> | scaffold <feature-name> | create feature <feature-name>"
---

# Generate feature package

Scaffolds a new feature domain package under `features/<name>/` matching the structure defined in
this skill's `references/feature-architecture.md`: one folder per zone, each with an empty barrel
(`index`) file ready to re-export that zone's public API. A bundled script does the deterministic
file creation — invoke it, don't hand-create the files, so every feature comes out identical.

Paths in this skill are relative to the skill's own directory (provided to you when the skill is
invoked), **not** to the target project. The skill operates on whatever project the user is in: the
script finds that project's root by walking up to the nearest `package.json`.

## Input

The feature name is the argument to the skill: `/generate-feature-package <name>`. It must be
**kebab-case** (lowercase, dash-separated) — e.g. `orders`, `email-templates`, `order-tracking` —
because it becomes the domain folder name. If the user gave a name in another form (PascalCase,
spaces, plural/singular preference), convert it to kebab-case and confirm only if ambiguous.

If no name was provided, ask for one before running.

## Steps

1. **Run the bundled scaffold script** with Node, passing the feature name. The script lives next to
   this SKILL.md at `scripts/scaffold-feature.mjs` — use its absolute path, built from this skill's
   directory (do not assume a `.claude/skills/...` location, since the skill may be installed
   anywhere):

   ```bash
   node "<skill-dir>/scripts/scaffold-feature.mjs" <name>
   ```

   Add `--dry-run` first if you want to preview the file list without writing anything. The script:
   - validates the name is kebab-case and that `features/<name>/` does **not** already exist
     (it refuses to overwrite),
   - locates the target project root (nearest `package.json`) so it works from any working directory,
   - creates the zone folders and barrel files listed below.

2. **Report** the created tree to the user and point them at the next step: filling in tables,
   types, components, etc., then re-exporting them from each zone's `index`.

Do not run `npm run type-check`/`lint` afterwards — empty barrels use `export {};`, which is valid,
but there is nothing to type-check yet.

## What gets created

```
features/<name>/
├── components/index.tsx        # barrel — components only
├── constants/index.ts          # barrel
├── schemas/index.ts            # barrel — Zod + *FormData
├── types/index.ts              # barrel — client-safe domain types
├── server/
│   ├── index.ts                # server zone public API, starts with import "server-only"
│   ├── actions/.gitkeep        # filled with {verb}-{noun}.action.ts later
│   ├── api/.gitkeep            # optional external-integration helpers
│   ├── db/index.ts             # internal sub-barrel: schema + queries + mutations
│   └── services/.gitkeep       # filled with {entity}.service.ts later
└── test/builders/index.ts      # barrel — builders
```

Design choices baked into the scaffold (so they match the spec — don't second-guess them):
- **One barrel per zone.** `components/`, `constants/`, `schemas/`, `types/`, `server/`,
  `server/db/`, and `test/builders/` each get an `index`. There is intentionally **no**
  `server/actions/index.ts` or `server/services/index.ts` (deeper barrels are noise) and **no**
  feature-root `index.ts` (consumers must choose a client-safe vs server entry deliberately).
- **`server/index.ts` is stamped server-only** via `import "server-only"`. It is the single public
  face of the server zone; the files behind it are private implementation details.
- **Barrel-less folders** (`server/actions`, `server/api`, `server/services`) get a `.gitkeep` so
  git tracks them while empty.
- **Empty barrels contain `export {};`** so they are valid ES modules under `isolatedModules`.

For the rules that govern what goes in each zone (naming suffixes, the server/client boundary,
return types per layer), read this skill's `references/feature-architecture.md` — consult it if the
user asks to go beyond scaffolding into populating the feature.

## Examples

**Example 1**
Input: `/generate-feature-package invoices`
Action: run `node "<skill-dir>/scripts/scaffold-feature.mjs" invoices` (with the skill's real
directory), then report the created `features/invoices/` tree.

**Example 2**
Input: "scaffold a new feature called Email Templates"
Action: convert to kebab-case → `email-templates`, run the script with that name, report the tree.

**Example 3**
Input: "/generate-feature-package orders" when `features/orders/` already exists
Action: the script exits with an error refusing to overwrite — relay that to the user and ask
whether they want a different name.

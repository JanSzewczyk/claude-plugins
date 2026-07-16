# False positives — what looks dead but isn't

Static reachability analysis (what Knip does) walks imports, re-exports, and dependency
declarations. It cannot see anything resolved at runtime by name, string, or convention. This
file is the judgement layer that catches what the graph walk structurally cannot.

The governing question for every candidate: **is there a caller this graph can't model, and
would removing this break it?** When Knip's confidence and this question disagree, the
question wins — but only after you've actually looked, not on a hunch.

## Contents

- [Confidence model](#confidence-model)
- [Framework-convention files](#framework-convention-files)
- [Dynamic and string-based references](#dynamic-and-string-based-references)
- [Public API surface](#public-api-surface)
- [Other common false positives](#other-common-false-positives)
- [What's genuinely safe to remove without much thought](#whats-genuinely-safe-to-remove-without-much-thought)
- [Calibration examples](#calibration-examples)

## Confidence model

Rank a candidate by how it was flagged, then adjust up or down using the sections below.

| Issue type (Knip)             | Starting confidence | Why                                                                                   |
| ------------------------------ | -------------------- | -------------------------------------------------------------------------------------- |
| **Unused file** (0 importers)   | High                  | Nothing in the graph reaches it at all — strongest signal.                             |
| **Unused dependency**          | High                  | Not imported anywhere and not a peer/type-only dependency of another package.           |
| **Unused export**              | Medium                | The file is used; this one symbol isn't — but it may be intentional public surface.     |
| **Unused type/interface**      | Medium-low            | No runtime cost either way; low value to remove, low risk.                             |
| **Unused enum/class member**   | Low                   | Often part of a value set that's meant to be complete (status enums, config schemas). |
| **Unresolved import**          | Not dead code         | This is a bug (broken import), not unused code — report separately.                    |

## Framework-convention files

Files invoked by the framework by filename/location, not by import. Knip's Next.js/Remix/
etc. plugins usually exclude these — but verify, especially in a repo without Knip
configured yet, a non-standard project layout, or a custom convention Knip's plugin doesn't
cover:

- Next.js App Router: `page.tsx`, `layout.tsx`, `route.ts`, `middleware.ts`, `loading.tsx`,
  `error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`, `opengraph-image.tsx`,
  `sitemap.ts`, `robots.ts`.
- Config files read by a build tool at a fixed path (`next.config.js`, `tailwind.config.ts`)
  even if nothing in the app `import`s them.
- Anything registered in a plugin/adapter manifest by file path rather than by import
  (custom CLI commands, migration runners that glob a directory).

## Dynamic and string-based references

The single biggest source of real false positives, because these are invisible to any static
import graph:

```typescript
// Registry keyed by string — Knip sees no caller for handleRefund
const handlers = { refund: handleRefund, cancel: handleCancel };
dispatch(action.type, handlers[action.type]);

// Dynamic import built from a variable
const mod = await import(`./adapters/${provider}.ts`);

// Reflection-style lookup
const Component = componentsByName[props.variant];
```

Before flagging a candidate dead, grep the repo for its **name as a string literal**, not
just as an import — `grep -rn "'handleRefund'"` in addition to `grep -rn "handleRefund"`.

## Public API surface

An exported symbol from a package's root barrel (`index.ts`) may have callers outside this
repo entirely — another package in the monorepo, a published npm consumer, a separate
service. Knip's `--workspace`/project settings narrow this within a monorepo, but a
standalone published package needs a human call: check if the symbol is documented, in a
changelog, or matches the package's advertised public API before removing it.

## Other common false positives

- **Feature-flagged code** — the "old" branch of a rollout is unused *today* but not
  removable until the flag is fully rolled out and the flag itself is deleted. Flag as
  "needs a decision," not dead.
- **Test-only exports** — a symbol exported solely so a test file can import it. Genuinely
  only used by tests is fine to keep; Knip's test-runner plugins usually count this as used
  correctly, but double check when the project has a custom test setup.
- **Storybook args/decorators exported for composition** — a story file re-exporting a
  variant object so another story composes it.
- **CVA compound variants and style objects** — variant keys that look unused because
  they're accessed via `cva()`'s generated function rather than referenced by name in code.
- **Barrel re-exports kept for backwards compatibility** — intentionally kept even though
  nothing in this repo currently imports the old name, to avoid breaking external consumers
  mid-migration.
- **Recently added, not yet wired up** — new scaffolding with no callers yet because the
  feature using it hasn't landed. Check recent commit context before calling it dead.

## What's genuinely safe to remove without much thought

- A whole file with zero importers, no dynamic string references, not a framework
  convention file, and no git history suggesting it's mid-migration scaffolding.
- An unused dependency in `package.json` with no import anywhere, not referenced in any
  config file (`next.config.js`, `.eslintrc`, etc.), and not a transitive peer dependency
  another package needs.
- Dead commented-out code blocks — these were already "removed" by whoever commented them
  out; deleting them just finishes the job. Still worth a quick git-blame skim in case the
  comment is a deliberate "temporarily disabled, see issue #X" note.

## Calibration examples

**Report as high confidence, safe to remove:**

> `src/features/legacy-invoices/format-currency-old.ts` — 0 importers per Knip, no string
> references anywhere in the repo, last touched 14 months ago, superseded by
> `shared/currency.ts` which every current caller uses instead.

**Report as needs a decision:**

> `src/features/billing/adapters/stripe-v1.ts` — Knip flags `chargeCardV1` as unused, but
> it's dispatched through `paymentHandlers[config.apiVersion]` in `dispatch-payment.ts`;
> dead only once the `apiVersion` config value can no longer be `"v1"`.

**Do not report:**

> `app/(marketing)/pricing/loading.tsx` exporting a default `Loading` component with no
> importers.

This is a Next.js convention file the framework invokes by path. Zero importers is expected
and reporting it as dead code is a false positive that erodes trust in the rest of the list.

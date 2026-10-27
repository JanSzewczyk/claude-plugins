# Risk model — what makes an uncovered gap _matter_

A coverage report lists every uncovered line. That list is nearly useless on its own: most
of it is noise, and the three lines that would have caught next month's incident are buried
somewhere on page four. This file is the judgement layer — how to tell the two apart.

The governing question for every candidate gap is: **if this code were silently broken,
who would notice, and how much would it cost?** Everything below is a proxy for that
question. When a proxy and the question disagree, the question wins.

## Contents

- [The five signals](#the-five-signals)
- [What to de-prioritize](#what-to-de-prioritize)
- [Branch coverage vs line coverage](#branch-coverage-vs-line-coverage)
- [Common false positives](#common-false-positives)
- [Calibration examples](#calibration-examples)

## The five signals

Rank a gap **high** when several of these stack up. One signal alone is usually not enough —
a churning barrel file is still a barrel file.

### 1. Blast radius (what breaks if this is wrong)

Ordered roughly by cost of failure:

| Tier         | Code                                                                     | Why                                                                     |
| ------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Critical** | auth, session, permission checks, middleware                             | A bug is a security hole, not a glitch. Fails silently and permissively. |
| **Critical** | money: payments, billing, invoices, pricing, checkout                    | Wrong output is unrecoverable and legally interesting.                   |
| **High**     | server actions, route handlers                                           | Public entry points that accept untrusted input.                         |
| **High**     | DB mutations, migrations-adjacent write paths                            | Corrupt data outlives the deploy that caused it.                         |
| **High**     | Zod schemas / validation at trust boundaries                             | The whole point is rejecting bad input; untested means unproven.         |
| **Medium**   | domain services, non-trivial utils, custom hooks with state              | Contained blast radius, but real logic.                                  |
| **Low**      | presentational components, formatting helpers with obvious output        | Failure is visible and cheap.                                            |

### 2. Uncovered _branches_, not just lines

See [the section below](#branch-coverage-vs-line-coverage). This is the single most
under-weighted signal, so treat a file at 100% statements / 60% branches as a **finding**,
not a pass.

### 3. Untested error and edge paths

`catch` blocks, guard clauses, early returns, `default:` cases, retry/fallback logic. These
exist precisely because something can go wrong, and they run only when it does — so they're
both the most likely to be uncovered and the most costly to get wrong. An untested `catch`
that swallows an error is a bug factory.

### 4. Public surface over internals

An exported function has unknown callers; a module-private helper has callers you can read.
Prefer gaps on the exported API. If an internal helper is complex enough to deserve its own
test, that is often a design signal worth mentioning.

### 5. Churn (recent, repeated change)

Code that changed five times in the last month is code someone is actively reasoning about
and getting wrong. Uncovered + churning is the highest-risk quadrant. Uncovered + untouched
for two years is usually stable-by-accident — real, but not urgent.

`rank-gaps.mjs` computes churn from `git log`; the multiplier caps at 10 commits so a
generated-and-regenerated file can't dominate the ranking.

## What to de-prioritize

Reporting these erodes trust in the whole report — the reader stops believing the top of the
list because the bottom is padding. The script filters most of them out; do the same for
anything it misses.

- **Types and interfaces** (`.d.ts`, type-only modules) — nothing executes.
- **Barrel files** (`index.ts` that only re-exports) — coverage here measures nothing.
- **Config** (`*.config.ts`, constants, env plumbing) — a test would assert the file equals itself.
- **Generated code** (Prisma client, GraphQL codegen, OpenAPI clients) — test the generator, not the output.
- **Trivial accessors** — one-line getters, pass-throughs, `() => x`.
- **Test/story files themselves** — covering tests with tests is a category error.
- **Framework glue** — `layout.tsx`, `loading.tsx`, `error.tsx` with no logic beyond markup.

## Branch coverage vs line coverage

Line coverage answers "did this line run?" Branch coverage answers "did every _path through_
this line run?" The gap between them is where bugs hide:

```typescript
export function applyDiscount(order: Order, code?: string) {
  const rate = code ? lookupRate(code) : 0; // 100% line coverage from ONE test
  return order.total * (1 - rate);
}
```

A single test passing a `code` marks this line covered. The `: 0` path never ran. Line
coverage says 100%; the untested path is half the function's behaviour.

Practical consequences:

- **Never report a file as adequately covered based on the statement percentage alone.**
  Read the branch figure next to it.
- Ternaries, `&&`/`||` short-circuits, `??`, optional chaining, and default parameters all
  create branches that line coverage cannot see.
- When branch coverage is materially below line coverage on a critical-tier file, that file
  belongs at the top of the report regardless of its raw uncovered-line count.

## Common false positives

Things that look like important gaps but usually aren't — call these out as _deliberately
excluded_ rather than silently dropping them, so the reader knows you looked:

- **Defensive `if (!x) throw` on values the type system already guarantees** — unreachable by
  construction; a test would only exercise a cast.
- **Uncovered code that E2E tests do cover** — unit coverage isn't the whole picture. If a
  path is exercised by Playwright, say so instead of demanding a unit test.
- **Third-party adapters** where the meaningful test would be testing the vendor's library.
- **Recently added and still unmerged scaffolding** — a stub with no callers yet.

## Calibration examples

**Report as high risk:**

> `src/features/billing/actions/refund-order.ts` — 82% statements but 45% branches. The
> `if (order.status !== "settled")` guard and the `catch` around the Stripe call never run;
> 7 commits in the last month. An untested refund guard means refunding an unsettled order.

That reads as a finding: it names the blast radius, the specific untested paths, and the
churn — a reader can act on it without opening the file.

**Do not report:**

> `src/features/billing/index.ts` — 0% coverage, 12 uncovered lines.

Zero coverage on a barrel file is expected and testing it is meaningless. This is the kind
of entry that makes a report look thorough and be worthless.

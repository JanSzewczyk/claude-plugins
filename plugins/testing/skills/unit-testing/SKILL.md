---
name: unit-testing
description: Write unit tests with Vitest for TypeScript logic — `vi.mock` / `vi.fn` / `vi.spyOn`, `test.each` parameterized cases, async error assertions, Server Actions with mocked dependencies, and `vitest.config.ts` coverage setup. Trigger when the user says "unit test", "test this function", "test the server action", "test my schema", "test this hook", "add tests for this module", or is editing a `*.test.ts` file — even if they only say "this needs tests". NOT for React component rendering or interaction (use create-stories), API route handlers (use api-test), full-page E2E flows (use playwright-cli / true-dom-tester), or finding which code is untested (use coverage-gaps).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
argument-hint: "[file or module to test, e.g. src/features/billing/utils.ts]"
---

# Unit Testing Skill (Vitest)

Write fast, isolated unit tests with **Vitest** for TypeScript logic — utilities, Zod schemas, hooks,
and Server Actions (with dependencies mocked). Unit tests do NOT render components in a browser
(use the `create-stories` skill for that).

This file holds the rules. Code lives in the references — this block is the only index, so the body
below names them without linking again:

> - [references/examples.md](./references/examples.md) — six worked examples: Zod schema, Server Action
>   with mocked DB, transform function, parameterized (`test.each`), async error handling, hooks.
> - [references/patterns.md](./references/patterns.md) — AAA, test isolation, mock boundaries, the
>   `vi.mock` vs `vi.fn` vs `vi.spyOn` decision table, coverage targets, and anti-patterns.
> - [references/mocking.md](./references/mocking.md) — the full mocking catalogue (factories, hoisting,
>   partial/dynamic mocks, async, DB/auth/time/env recipes). Read before writing non-trivial mocks.

## Global Test Utilities

Check `vitest.config.ts` for `globals: true` and `tsconfig.json` for `"types": ["vitest/globals"]`
**before writing the first test**. When both are set, do **not** import test utilities:

```typescript
// ❌ Not needed
import { describe, test, expect, vi, beforeEach } from "vitest";

// ✅ Available globally: describe, test, expect,
//    beforeEach/afterEach/beforeAll/afterAll, vi
```

If either is missing, import what you use from `"vitest"` explicitly rather than editing the
project's config.

## Workflow

1. **Analyze the code** — the module named in the argument, or the one under discussion: inputs,
   outputs, side effects, dependencies, and every branch; whether it is pure or carries auth checks
   and side effects; whether it has a coverage target (targets are in `patterns.md`).
2. **Identify cases** — happy path, edge cases, error paths, boundary values.
3. **Write tests** — AAA pattern (Arrange, Act, Assert); mock external dependencies at module boundaries.
4. **Run** — read the `scripts` block of `package.json` and use the project's own test script and
   package manager; `npm run test:unit` is the assumed default, `npx vitest run <file>` the fallback
   when no script exists. Verify all pass and check coverage.
5. **Iterate** — if a test fails, decide whether the test or the code is wrong before changing
   either; fix and re-run. Repeat until the suite passes and every branch from step 1 is covered.
   Never delete or `.skip` a failing test to make the run green.

## File Naming

Follow the convention already present in the repo. Absent one, tests live **next to the source
file**, named `<source-filename>.test.ts` (`.test.tsx` if it imports React/JSX):

```
src/utils/format-currency.ts        → src/utils/format-currency.test.ts
src/features/budgets/actions/create-budget.ts → .../create-budget.test.ts
```

## Core Rules

- **Always write `test()`, never the `it()` alias** — one spelling across the whole suite. The same
  goes for its variants: `test.each`, `test.skip`, `test.only`, `test.todo`. When a file already
  uses `it()`, convert it to `test()` rather than adding a second convention to the same repo.
- **AAA structure** — Arrange, Act, Assert, separated by a blank line; group with nested `describe`
  (module → function → case).
- **Test behavior, not implementation** — assert on return values and observable effects, never on
  private internals; don't test private functions or abuse snapshots.
- **Name tests after the observable behavior** — `returns a formatted string for a positive amount`,
  not `should work`.
- **Mock only at module boundaries** — external dependencies (DB, auth, network, time, UUID). Never
  mock the internal utility you're testing.
- **Pick the right mock tool** (full decision table in `patterns.md`):
  - `vi.mock("module", factory)` — replace an entire module (DB, auth).
  - `vi.fn()` — a standalone mock (callback / injected dependency).
  - `vi.spyOn(obj, "method")` — observe or replace one method, restorable via `.mockRestore()`.
  - Beyond these three — `vi.hoisted()`, partial mocks, async/DB/auth/time recipes — read
    `mocking.md` before writing the mock.
- **Reset between tests** — `beforeEach(() => vi.clearAllMocks())` wipes call history so one test's
  assertions cannot see another's calls; `afterEach(() => vi.restoreAllMocks())` puts `vi.spyOn`
  originals back so a spy cannot leak into an unrelated suite.
- **Type your mocks** — `vi.mocked(fn).mockResolvedValue(...)`.
- **Parameterize repetitive cases** with `test.each([...])` instead of copy-pasting tests.
- **Async** — `await` the call; use `await expect(p).rejects.toThrow(...)` / `.resolves.toMatchObject(...)`.
- **Pure functions need no mocking** — the easiest and highest-value tests.

## Shared rules

Rules shared with the other testing skills (test independence, what to assert, test data builders),
generated from the knowledge notes. Open a rule in [rules.md](./references/rules.md) when the test
you are writing touches it.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 15 note(s) (sha256 9290c25c6758); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Place mimicry-js generators directly as field values, use Faker inside arrow functions](references/rules.md#place-mimicry-js-generators-directly-as-field-values-use-faker-inside-arrow-functions) — oneOf, int, sequence and friends resolve only at field level; inside () => they return a descriptor, not a value. | typescript, mimicry-js |
| high | [Set every value the test asserts on explicitly when you build test data](references/rules.md#set-every-value-the-test-asserts-on-explicitly-when-you-build-test-data) — Let the builder randomise what the test ignores; pass an override for every value the test checks. | any |
| high | [Wrap function-typed fields in fixed() so the builder does not call them](references/rules.md#wrap-function-typed-fields-in-fixed-so-the-builder-does-not-call-them) — A plain function as a field value is called on every build; fixed(fn) keeps it as the value. | typescript, mimicry-js |
| high | [Build with .one() and .many() and pass overrides or traits for asserted values](references/rules.md#build-with-one-and-many-and-pass-overrides-or-traits-for-asserted-values) — userBuilder.one({ overrides }) for one object, .many(n) for lists, traits for named states. | typescript, mimicry-js |
| high | [Write TypeScript builders with mimicry-js and Faker](references/rules.md#write-typescript-builders-with-mimicry-js-and-faker) — Every builder uses mimicry-js with Faker; not test-data-bot or Fishery, and not a hand-written factory. | typescript, mimicry-js |
| high | [Find elements the way a user or a screen reader does](references/rules.md#find-elements-the-way-a-user-or-a-screen-reader-does) — Query by role and accessible name, then label, then visible text; never by test id, CSS selector or internals. | any |
| high | [Make every test pass alone and in any order](references/rules.md#make-every-test-pass-alone-and-in-any-order) — No test relies on what an earlier one clicked or mocked; reset mocks per test, share setup through helpers. | any |
| medium | [Reset builder counters and random state between tests that depend on them](references/rules.md#reset-builder-counters-and-random-state-between-tests-that-depend-on-them) — Sequences and seeded randomness carry over between tests; reset them where a test depends on their values. | any |
| medium | [Build structured test data with a builder, not inline object literals](references/rules.md#build-structured-test-data-with-a-builder-not-inline-object-literals) — Typed objects with three or more fields come from a shared builder; reuse an existing one before writing one. | any |
| medium | [Fill nested typed objects from their own builder](references/rules.md#fill-nested-typed-objects-from-their-own-builder) — A nested type gets its own builder, used as () => otherBuilder.one(); overrides deep-merge into it. | typescript, mimicry-js |
| medium | [Build lists with .many(count), not Array.from or map](references/rules.md#build-lists-with-manycount-not-arrayfrom-or-map) — .many(n) applies overrides and traits to each item and keeps sequence and unique state right. | typescript, mimicry-js |
| medium | [Compute fields that derive from other fields in postBuild](references/rules.md#compute-fields-that-derive-from-other-fields-in-postbuild) — Totals, counts and display names built from sibling fields go in postBuild, so overrides stay consistent. | typescript, mimicry-js |
| medium | [Call builder.reset() in beforeEach when a test depends on sequence values](references/rules.md#call-builderreset-in-beforeeach-when-a-test-depends-on-sequence-values) — reset() restarts sequence() and unique() counters; seed() makes oneOf, int, float and bool reproducible. | typescript, mimicry-js |
| medium | [Use unique() for values that must differ across built objects](references/rules.md#use-unique-for-values-that-must-differ-across-built-objects) — oneOf() can repeat a value within one .many() call; unique() hands each value out once. | typescript, mimicry-js |
| medium | [Assert what the user sees or can do, never internal state or markup](references/rules.md#assert-what-the-user-sees-or-can-do-never-internal-state-or-markup) — Check visibility, text, values, focus, ARIA state and callback calls; never state, class names or snapshots. | any |

<!-- END:knowledge -->

## Setup (vitest.config.ts essentials)

Never rewrite an existing `vitest.config.ts`. This is the baseline to check against when a test
behaves unexpectedly, and the starting point only when the project has no Vitest config at all.

```typescript
test: {
  globals: true,              // no test-utility imports needed
  environment: "node",        // "jsdom" for hooks/DOM
  include: ["src/**/*.test.{ts,tsx}"],
  coverage: {
    provider: "v8",
    exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.stories.{ts,tsx}", "src/**/index.ts", "src/types/**"],
  },
}
```

## Running Tests

```bash
npm run test:unit                                   # all unit tests
npm run test:unit -- --watch                        # watch mode
npm run test:unit -- src/utils/format-currency.test.ts  # one file
npm run test:unit -- -t "formatCurrency"            # by test name pattern
npm run test:unit -- --coverage                     # coverage report
```

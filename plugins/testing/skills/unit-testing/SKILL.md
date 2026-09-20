---
name: unit-testing
description: Write unit tests with Vitest for TypeScript logic — `vi.mock` / `vi.fn` / `vi.spyOn`, `test.each` parameterized cases, async error assertions, Server Actions with mocked dependencies, and `vitest.config.ts` coverage setup. Trigger when the user says "unit test", "test this function", "test the server action", "test my schema", "test this hook", "add tests for this module", or is editing a `*.test.ts` file — even if they only say "this needs tests". NOT for React component rendering or interaction (use storybook-testing), API route handlers (use api-test), full-page E2E flows (use playwright-cli / true-dom-tester), or finding which code is untested (use coverage-gaps).
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
argument-hint: "[file or module to test, e.g. src/features/billing/utils.ts]"
---

# Unit Testing Skill (Vitest)

Write fast, isolated unit tests with **Vitest** for TypeScript logic — utilities, Zod schemas, hooks,
and Server Actions (with dependencies mocked). Unit tests do NOT render components in a browser
(use the `storybook-testing` skill for that).

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

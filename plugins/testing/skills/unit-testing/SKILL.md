---
name: unit-testing
description: Write unit tests with Vitest for TypeScript projects — mocking, async testing, parameterized tests, server action testing, and coverage. Use when writing unit tests for utilities, server-side logic, schemas, or pure functions.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Unit Testing Skill (Vitest)

Write fast, isolated unit tests with **Vitest** for TypeScript logic — utilities, Zod schemas, hooks,
and Server Actions (with dependencies mocked). Unit tests do NOT render components in a browser
(use the `storybook-testing` skill for that).

This file holds the rules. Code lives in the references:

> - [references/examples.md](./references/examples.md) — seven worked examples: pure utility, Zod schema,
>   Server Action with mocked DB, transform function, parameterized (`it.each`), async error handling, hooks.
> - [references/patterns.md](./references/patterns.md) — AAA, test isolation, mock boundaries, the
>   `vi.mock` vs `vi.fn` vs `vi.spyOn` decision table, coverage targets, and anti-patterns.
> - [references/mocking.md](./references/mocking.md) — the full mocking catalogue (factories, hoisting,
>   partial/dynamic mocks, async, DB/auth/time/env recipes). Read before writing non-trivial mocks.

## Global Test Utilities

This project enables **global test utilities** — do **not** import them:

```typescript
// ❌ Not needed
import { describe, test, expect, vi, beforeEach } from "vitest";

// ✅ Available globally: describe, test (= it), expect, beforeEach/afterEach/beforeAll/afterAll, vi
```

Configured via `globals: true` in `vitest.config.ts` and `"types": ["vitest/globals"]` in `tsconfig.json`.

## Workflow

1. **Analyze the code** — inputs, outputs, side effects, dependencies, and every branch.
2. **Identify cases** — happy path, edge cases, error paths, boundary values.
3. **Write tests** — AAA pattern (Arrange, Act, Assert); mock external dependencies at module boundaries.
4. **Run** — `npm run test:unit`; verify all pass and check coverage.

## File Naming

Tests live **next to the source file**, named `<source-filename>.test.ts` (`.test.tsx` if it imports
React/JSX):

```
src/utils/format-currency.ts        → src/utils/format-currency.test.ts
src/features/budgets/actions/create-budget.ts → .../create-budget.test.ts
```

## Core Rules

- **AAA structure** — Arrange, Act, Assert; group with nested `describe` (module → function → case).
- **Test behavior, not implementation** — assert on return values and observable effects, never on
  private internals; don't test private functions or abuse snapshots.
- **Mock only at module boundaries** — external dependencies (DB, auth, network, time, UUID). Never
  mock the internal utility you're testing.
- **Pick the right mock tool** (full decision table in [patterns.md](./references/patterns.md#when-to-use-vimock-vs-vifn-vs-vispyon)):
  - `vi.mock("module", factory)` — replace an entire module (DB, auth).
  - `vi.fn()` — a standalone mock (callback / injected dependency).
  - `vi.spyOn(obj, "method")` — observe or replace one method, restorable via `.mockRestore()`.
- **Reset between tests** — `beforeEach(() => vi.clearAllMocks())`; `afterEach(() => vi.restoreAllMocks())`.
- **Type your mocks** — `vi.mocked(fn).mockResolvedValue(...)`.
- **Parameterize repetitive cases** with `test.each([...])` instead of copy-pasting tests.
- **Async** — `await` the call; use `await expect(p).rejects.toThrow(...)` / `.resolves.toMatchObject(...)`.
- **Pure functions need no mocking** — the easiest and highest-value tests.

## Mocking

The three core tools (`vi.fn`, `vi.mock`, `vi.spyOn`) are summarized above. Two more worth knowing:
`vi.hoisted(() => ({ ... }))` when a `vi.mock` factory needs shared mock references, and
`vi.mock(import("./m"), async (orig) => ({ ...(await orig()), one: vi.fn() }))` for partial mocks that
keep the real exports.

> The full catalogue — async resolution, hoisting edge cases, third-party libraries, and database/auth
> recipes — is in [references/mocking.md](./references/mocking.md).

## Setup (vitest.config.ts essentials)

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
npm run test:unit -- --grep "formatCurrency"        # by pattern
npm run test:unit -- --coverage                     # coverage report
```

## Questions to Ask

- What are the function's inputs and expected outputs?
- What external dependencies need mocking (database, auth, APIs)?
- What error conditions and edge cases (empty, null, boundaries) must be handled?
- Is this a pure function or does it have side effects / auth checks?
- Are there coverage targets for this module?

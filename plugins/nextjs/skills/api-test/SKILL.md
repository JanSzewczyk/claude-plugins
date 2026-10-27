---
name: api-test
description: Test Next.js Route Handlers and API endpoints using Playwright for real HTTP requests. Use when testing API endpoints, route handlers, or backend integrations.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(playwright-cli:*), mcp__context7__resolve-library-id, mcp__context7__get-library-docs
---

# API Test Skill

Test Next.js Route Handlers with **real HTTP requests** via Playwright's `request` fixture — verifying
status codes, response shape, authentication, validation, and error handling against a running dev server.

This file holds the rules. Full copy-paste test suites live in the reference:

> - [references/examples.md](./references/examples.md) — worked route-handler + test pairs (POST, GET with
>   query params, PATCH, DELETE, headers), reusable test utilities (auth/base-URL/assertion helpers), and
>   the extra patterns referenced below (health check, parameterized validation, rate limiting, ActionResponse).

## First Step: Read Project Context

Before writing tests, check **`CLAUDE.md`** for the conventions that shape every assertion:

- **Auth method** (Clerk, NextAuth, JWT, API key) and how to pass a test credential.
- **Response envelope** (e.g. `{ data }`, or the `ActionResponse` `{ success, data | error }` shape).
- **Error model** (`ServiceError` codes and how they map to HTTP status).

## Prerequisites

- Dev server running (`npm run dev`) — these are real requests, not mocks.
- Playwright installed; tests live in `tests/e2e/api/`, named `[endpoint-name].spec.ts`.
- A test credential available (usually an env var like `TEST_SESSION_TOKEN`).

## Workflow

1. **Analyze the endpoint** — supported methods, request body schema, query params, auth requirement,
   expected response shape, and the error cases it can return.
2. **Write the spec** — group tests with `test.describe` per endpoint/method; use Playwright's `request`
   fixture (`request.get/post/put/patch/delete`). Start from a worked suite in
   [references/examples.md](./references/examples.md) and adapt the paths, payloads, and auth.
3. **Run and iterate** — `npm run test:e2e -- tests/e2e/api/`. Read failures, fix, re-run.

## What Every Suite Should Cover

Treat this as the checklist when deciding which tests to write (see examples for the code):

- **Authentication** — `401` (or `403`) when unauthenticated; the happy status when authenticated.
- **Happy path per method** — GET `200` (+ correct body shape), POST `201` (+ returns an `id`),
  PUT/PATCH `200` (+ updated fields), DELETE `204`.
- **Validation** — `400` with error details for missing/invalid fields. Parameterize a table of bad
  payloads rather than writing one test each.
- **Not found** — `404` for a non-existent id.
- **Conflict** — `409` for a duplicate, when the endpoint enforces uniqueness.
- **Server errors** — degrade gracefully: an error status (`>= 400`) with an error body, never a crash.
- **Query params** — pagination and filters are honoured (assert the returned set respects them).
- **Headers** — `content-type: application/json`; `cache-control`/CORS where the endpoint sets them.
- **Rate limiting** — `429` once the limit is exceeded, if implemented.

## Authentication

Don't guess the scheme — read `CLAUDE.md`, then attach the matching credential to `headers`:

| Provider | Header                                          |
| -------- | ----------------------------------------------- |
| Clerk    | `Cookie: __session=<token>`                     |
| NextAuth | `Cookie: next-auth.session-token=<token>`       |
| JWT      | `Authorization: Bearer <token>`                 |
| API key  | `X-API-Key: <token>`                            |

Read the token from an env var (never hardcode it) and centralize it in a small auth helper so every
spec shares one source — see *Test Utilities* in [references/examples.md](./references/examples.md).

## Response Shape Assertions

Assert the **shape**, not just the status. If the project uses the `ActionResponse` envelope:

- **Success** → `{ success: true, data, message? }` — assert with `toMatchObject({ success: true, data: ... })`.
- **Failure** → `{ success: false, error }`, optionally `fieldErrors` keyed by field name.
- **`ServiceError` → HTTP** — the typed code maps to a status (e.g. `notFound → 404`); assert both the
  status and `body.error`.

Concrete assertions for each are in [references/examples.md](./references/examples.md#actionresponse-pattern).

## Test File Organization

```
tests/e2e/api/
├── auth/                 # login.spec.ts, logout.spec.ts
├── <domain>/             # create-*.spec.ts, get-*.spec.ts, update-*.spec.ts
├── health.spec.ts
└── fixtures/             # shared test data
```

## Best Practices

- **Isolate** — each test stands alone; create what it needs in `beforeEach`, delete it in `afterEach`.
- **Verify the body shape**, not only the status code.
- **Cover error paths**, not just the happy path — and assert that error messages are user-friendly.
- **Use env vars** for base URL and tokens; never hardcode.
- **Test edge cases** — empty arrays, nulls, oversized/special-character input.

## Questions to Ask

- Which HTTP methods, and what is the request-body schema for each?
- What auth is required, and how do I obtain a test credential?
- What are the possible error responses and their status codes?
- Are there rate limits, quotas, or notable headers (cache, CORS)?
- Any side effects (created/deleted records) that need cleanup?

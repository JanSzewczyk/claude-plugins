# Detection Checks

Detail behind the five categories in `SKILL.md`. Each has what to look for, a concrete
example, and how to phrase the finding.

## 1. Errors & anomalies

**Look for:**

- `"level":"error"` or `"level":"fatal"` entries.
- The same `message` (or `message` + `error.message`) appearing more than once — a caught-
  and-retried failure that never actually got fixed during the session.
- A cluster of entries within the same second/sub-second window — often a request storm,
  a render loop, or an unhandled retry without backoff.

**Example finding:**

```
`2026-08-10T14:22:03.1Z` through `14:22:03.4Z` — "Database error" (module: user-db)
repeated 6 times, same `userId`, same `errorCode: "UNAVAILABLE"` — looks like a retry loop
without backoff hitting a down dependency, not 6 independent failures.
```

## 2. Missing context

**Look for:**

- An `error`/`warn` entry with no `requestId`, `module`, or identifying field — compare
  against neighboring entries from the same request to see what context was available but
  not attached.
- The same logical field represented with different names across entries (`userId` in one
  place, `uid` in another) — breaks queryability, see the field table below.
- A child logger (`createLogger({ module })`) used in one file of a feature but a bare
  `logger` import used in a sibling file of the same feature — inconsistent context
  coverage within one module.

**Reference field table** (from `structured-logging`, keep names consistent against this):

| Field         | Type    | When to Use          |
| ------------- | ------- | --------------------- |
| `userId`      | string  | User-initiated actions |
| `requestId`   | string  | HTTP requests          |
| `operation`   | string  | Named operations       |
| `durationMs`  | number  | Timed operations       |
| `errorCode`   | string  | Error responses        |
| `isRetryable` | boolean | Error categorization   |
| `statusCode`  | number  | HTTP responses         |
| `path`        | string  | API endpoints          |
| `method`      | string  | HTTP methods           |

## 3. Sensitive-data leakage

**Why this check exists:** the Pino `redact` config in `lib/logger.ts` strips known field
*paths* (`password`, `*.token`, `apiKey`, `secret`, `authorization`, etc.) — it can't catch
a secret logged under an unexpected field name (`.withMetadata({ debugInfo: apiResponse })`
where `apiResponse` happens to contain a token). This check is the value-level backstop.

**Look for**, scanning field *values* regardless of field name:

- Email addresses in a field not named for masked output (`maskEmail` wasn't used).
- Long opaque alphanumeric strings in unexpected fields (looks like a token/API key/JWT).
- Full IDs where a masked/truncated form was expected (`maskId` pattern from
  `structured-logging` truncates to `xxxx...xxxx`).
- Anything matching common secret shapes: `sk-...`, `AKIA...`, `gh[oprsu]_...`, a PEM block.

**Example finding:**

```
`2026-08-02T20:44:24Z` — field `debugInfo.headers.authorization` contains a raw bearer
token — not covered by the current redact paths (`password`, `*.password`, `token`,
`*.token`, `apiKey`, `*.apiKey`, `secret`, `*.secret`, `authorization`, `*.authorization`,
`req.headers.authorization`, `req.headers.cookie`) because it's nested under `debugInfo`,
not `req.headers`.
```

## 4. Structural quality / readability

**Look for:**

- `message` strings with interpolated values (`` `User ${id} logged in` `` baked into the
  string) instead of the value living in a separate field — breaks structured search, the
  core rule `structured-logging` states first.
- A raw object dumped as the whole log line instead of a short human `message` plus
  metadata fields — hard to skim in a terminal or log viewer.
- Malformed lines (parse failure) — usually a process killed mid-write; worth flagging even
  though it's not a logging-convention issue, since it affects whether the rest of the file
  can be trusted as complete.
- Log level misuse: expected/handled outcomes logged at `error` (e.g. "not found" on a
  lookup) instead of `warn`/`info` — `structured-logging` reserves `error` for things that
  need investigation.

## 5. Source-code compliance

Grep the codebase (not the log file) for call-site violations. Point at `file:line`, not
just the pattern name.

**Look for:**

- `.withMetadata({ error` — should be `.withError(error)` so the configured
  `errorSerializer` actually expands the stack trace; `withMetadata` doesn't serialize it.
- `console.log(` / `console.error(` / `console.warn(` in server-side code (`app/`,
  `features/*/server/`, `lib/`) instead of `logger`/`createLogger` — client-side
  `console.error` in `error.tsx`/`global-error.tsx` is the documented exception, not a
  violation.
- A file under `features/<name>/server/` that imports `logger` directly instead of calling
  `createLogger({ module: "<name>" })` — loses per-module attribution.
- A secret-shaped literal passed to any `logger.*`/`console.*` call directly, without a
  `mask*` helper — same shapes as the sensitive-data check above, but caught at the source
  instead of after the fact.

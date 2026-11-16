---
name: devlogs
description: Analyze a dev-session log file (tmp/app.log) written by the LogLayer + Pino logger in a Next.js project using the logging rules of the nextjs-rules skill. Finds missing correlation context (requestId/module/userId), sensitive-data leaks that slipped past redaction, structural/readability problems, and source-code call-site violations of the logging rules. Read-only — produces a report, never edits logger calls automatically. Use this whenever the user wants to investigate, debug, or make sense of what happened during a local dev session by looking at the logs — trigger even when they only describe a symptom ("something broke overnight", "seeing repeated errors", "did we leak a token in the logs", "check if this log file is safe to share") rather than explicitly saying "audit" or naming tmp/app.log. Also use it to check whether logger.* call sites and the actual log output follow the logging rules.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[path to log file, defaults to tmp/app.log]"
---

# DevLogs

Analyze one development session's log output for quality problems — not a general log
search tool, and not a replacement for the logging rules in `nextjs-rules` (which define the
conventions this skill checks *against*).

> - [references/checks.md](./references/checks.md) — the five check categories in detail,
>   with concrete good/bad examples for each. Read this before writing the report.

## Scope

This skill targets the specific pattern documented by the logging rules in `nextjs-rules`:
**LogLayer wrapping Pino**, with a `LogFileRotationTransport` writing NDJSON to
`<repo>/tmp/app.log` in development, and rotation state tracked in `<repo>/tmp/audit.json`
(`rollingFile`-style: `keepSettings`, a `files` array with `date`/`name`/`hash`). Confirm
`lib/logger.ts` matches this shape before analyzing — if the repo logs differently (a
different framework, a different transport), say so and stop rather than forcing this
skill's checks onto a format they weren't built for.

## Workflow

### 1. Locate the log

Default to `tmp/app.log` relative to the repo root; use the path from `argument-hint` if
given. Also read `tmp/audit.json` — its `files` array shows whether rotation has happened
(more than one entry) and each file's `date`/`hash`, so you know whether "the session"
spans one file or several rotated ones.

If `tmp/app.log` doesn't exist, say so plainly — don't fabricate findings. A missing log
usually means `NODE_ENV` wasn't `development` when the session ran, or nothing has been
logged yet.

### 2. Parse

Each line is one JSON object (Pino NDJSON) — `level`, `message`, `timestamp`, plus
whatever fields were attached via `.withMetadata()`/`.withContext()`. For a large file,
`Bash`+`grep`/`wc -l` to scope before reading the whole thing; malformed lines (a process
killed mid-write) are themselves a finding, not something to silently skip.

### 3. Run the five checks

See [references/checks.md](./references/checks.md) for detection detail on each:

1. **Errors & anomalies** — `error`/`fatal` entries, repeated identical messages (a retry
   loop that never got fixed), timestamp bursts.
2. **Missing context** — entries that should carry correlation fields per the operation
   they represent (an error with no `requestId`/`module`/`userId`), inconsistent field
   naming for the same concept across entries.
3. **Sensitive-data leakage** — values that look like secrets/PII/tokens even though the
   field *name* wasn't one of Pino's configured `redact` paths (redaction is name-based,
   not value-based — this is the defense-in-depth gap it can't cover).
4. **Structural quality / readability** — interpolated values baked into `message` instead
   of separate fields, raw object dumps instead of a human-readable summary, field-naming
   drift against the field table in the logging rules.
5. **Source-code compliance** — grep the codebase (not the log file) for call-site
   violations of the logging rules: `.withMetadata({ error })` instead of
   `.withError(error)`, raw `console.*` instead of `logger`/`createLogger`, missing module
   child loggers.

Only report a finding you can point at — a specific log line (timestamp + message) or a
specific `file:line` in source. An unverified suspicion isn't a finding.

### 4. Write the report

```markdown
## Dev log analysis — <path to log file>

**Session:** <timestamp range> · **Lines:** <N> · **Rotation:** <single file | N rotated files per audit.json>

### Errors & anomalies

- `<timestamp>` — <message> — <why it's notable: repeated N times, unhandled, etc.>

### Missing context

- `<timestamp>` — <message> — missing `<field>`, expected because <reasoning>

### Sensitive-data risk

- `<timestamp>` — field `<name>` looks like `<secret type>` — not covered by the current
  `redact` config in `lib/logger.ts` (paths: `<list>`)

### Structure & readability

- `<file:line or timestamp>` — <issue> — <logging rule it violates>

### Source-code compliance

- `<file:line>` — <call site> — <rule violated, from the logging rules>

### Looks fine

<Categories with nothing to report — say so explicitly rather than omitting the section,
so the reader knows the check ran.>
```

Keep findings to what's actually evidenced — an empty category is a correct, useful
result, not a gap to pad.

## Handoff

This skill never edits logger calls or log files — it's read-only by design, since a dev
log is evidence of what actually happened and shouldn't be silently rewritten. For fixes,
point at the matching rule below (module loggers, request-ID wiring, error logging,
redaction) and let the user apply it, or offer to make the edit only after they confirm which
findings to act on.

## Related Skills

- `nextjs-rules` — defines the logging conventions this skill checks logs and code against; its
  setup steps are in `setup-app-infrastructure`.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 13 note(s) (sha256 4ec5561704f5); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Never log a secret or personal data; log an id, a masked value or a derived flag](references/rules.md#never-log-a-secret-or-personal-data-log-an-id-a-masked-value-or-a-derived-flag) — No passwords, tokens, keys, cookies or PII in a log call; log userId, maskEmail(email) or hasAuthHeader instead. | typescript, loglayer |
| high | [Attach a caught error with withError, never in withMetadata or the message](references/rules.md#attach-a-caught-error-with-witherror-never-in-withmetadata-or-the-message) — log.withError(err) keeps the stack through the configured serializer; { error } or err.message loses it. | typescript, loglayer |
| high | [Keep the log message constant and put every value in withMetadata](references/rules.md#keep-the-log-message-constant-and-put-every-value-in-withmetadata) — log.withMetadata({ budgetId }).info("Budget created"); a value interpolated into the message cannot be filtered. | typescript, loglayer |
| high | [Log through one createLogger({ module }) logger per file, never through console](references/rules.md#log-through-one-createlogger-module--logger-per-file-never-through-console) — Each server file creates const log = createLogger({ module: "<domain>-<layer>" }); no console.* and no bare root logger. | typescript, loglayer |
| high | [Configure Pino redact for sensitive keys as defence in depth](references/rules.md#configure-pino-redact-for-sensitive-keys-as-defence-in-depth) — Pino redact paths for password, token, apiKey, secret, authorization and cookies catch what a call site forgets. | typescript, loglayer, pino |
| medium | [Log an error once, in the layer that finally handles it](references/rules.md#log-an-error-once-in-the-layer-that-finally-handles-it) — Intermediate layers add context and re-raise; only the handler at the boundary logs, so one failure is one entry. | any |
| medium | [Write logs to stdout or stderr and let the platform collect them](references/rules.md#write-logs-to-stdout-or-stderr-and-let-the-platform-collect-them) — A containerised app emits an event stream; rotation and shipping belong to the platform, not the app. | any |
| medium | [Choose the log level by what the event means; log an expected not-found at warn](references/rules.md#choose-the-log-level-by-what-the-event-means-log-an-expected-not-found-at-warn) — error for a failure to investigate, warn for an expected outcome such as not-found, info for normal events. | typescript, loglayer |
| medium | [Create the request id once in proxy.ts and forward it on the request headers](references/rules.md#create-the-request-id-once-in-proxyts-and-forward-it-on-the-request-headers) — proxy.ts mints requestId and forwards x-request-id on the request and response; handlers read it, never mint one. | typescript, nextjs, loglayer |
| medium | [Log a returned error once, in the action or route handler that decides what to do with it](references/rules.md#log-a-returned-error-once-in-the-action-or-route-handler-that-decides-what-to-do-with-it) — Db and service functions return [error, null] silently; the action or handler logs it once with errorCode and ids. | typescript, loglayer |
| medium | [Log to stdout through Pino everywhere and add the tmp/app.log file only in development](references/rules.md#log-to-stdout-through-pino-everywhere-and-add-the-tmpapplog-file-only-in-development) — PinoTransport writes to stdout everywhere; LogFileRotationTransport is added only when NODE_ENV is development. | typescript, loglayer, pino |
| medium | [Set the logger's level from LOG_LEVEL in the server env, chosen per environment](references/rules.md#set-the-loggers-level-from-log_level-in-the-server-env-chosen-per-environment) — LOG_LEVEL is a validated enum in data/env/server.ts (debug locally, info in production) that lib/logger.ts reads. | typescript, loglayer, pino, t3-env |
| medium | [Name log fields from the shared vocabulary, one name per concept](references/rules.md#name-log-fields-from-the-shared-vocabulary-one-name-per-concept) — userId, requestId, operation, durationMs, errorCode, isRetryable, statusCode, path, method; never uid or user_id. | typescript, loglayer |

<!-- END:knowledge -->

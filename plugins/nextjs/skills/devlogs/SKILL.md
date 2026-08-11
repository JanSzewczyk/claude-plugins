---
name: devlogs
description: Analyze a dev-session log file (tmp/app.log) written by the LogLayer + Pino logger in a Next.js project using the structured-logging skill's conventions. Finds missing correlation context (requestId/module/userId), sensitive-data leaks that slipped past redaction, structural/readability problems, and source-code call-site violations of the structured-logging rules. Read-only — produces a report, never edits logger calls automatically. Use this whenever the user wants to investigate, debug, or make sense of what happened during a local dev session by looking at the logs — trigger even when they only describe a symptom ("something broke overnight", "seeing repeated errors", "did we leak a token in the logs", "check if this log file is safe to share") rather than explicitly saying "audit" or naming tmp/app.log. Also use it to check whether logger.* call sites and the actual log output follow the structured-logging conventions.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[path to log file, defaults to tmp/app.log]"
---

# DevLogs

Analyze one development session's log output for quality problems — not a general log
search tool, and not a replacement for `structured-logging` (which defines the
conventions this skill checks *against*).

> - [references/checks.md](./references/checks.md) — the five check categories in detail,
>   with concrete good/bad examples for each. Read this before writing the report.

## Scope

This skill targets the specific pattern documented by the `structured-logging` skill:
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
   drift against the `structured-logging` reference table.
5. **Source-code compliance** — grep the codebase (not the log file) for call-site
   violations of `structured-logging`'s rules: `.withMetadata({ error })` instead of
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

- `<file:line or timestamp>` — <issue> — <structured-logging rule it violates>

### Source-code compliance

- `<file:line>` — <call site> — <rule violated, from structured-logging skill>

### Looks fine

<Categories with nothing to report — say so explicitly rather than omitting the section,
so the reader knows the check ran.>
```

Keep findings to what's actually evidenced — an empty category is a correct, useful
result, not a gap to pad.

## Handoff

This skill never edits logger calls or log files — it's read-only by design, since a dev
log is evidence of what actually happened and shouldn't be silently rewritten. For fixes,
point at the specific pattern in
[structured-logging/references/patterns.md](../structured-logging/references/patterns.md)
(child loggers, request-ID wiring, error logging, redaction) and let the user apply them,
or offer to make the edit only after they confirm which findings to act on.

## Related Skills

- `structured-logging` — defines the conventions this skill checks logs and code against.

# Audit a mod: is it correct, robust and safe to run?

An audit reads an existing mod and reports what is wrong with it, ranked, with a verdict. It
answers three questions in order: **does it load**, **does it do what it claims on every surface
it targets**, and **is what it can reach justified**. It changes nothing until the user asks.

## Contents

- Own mod or third-party: what each audit may do
- Steps: inventory, validate, read the code, run the tests, report
- Checklist A–H: load, silent failures, surfaces, limits, version gates, text Claude reads,
  trust and scope, tests
- Severity and verdict
- Report format

## Own mod or third-party

| | Own mod (the user wrote it or will maintain it) | Third-party mod (about to be installed) |
|---|---|---|
| Runs `claude plugin validate` | Yes | Yes |
| Runs `claude plugin test` | Yes, if `tests/` exists | Only if it ships tests; never writes any |
| Checklist | A–H | A, C, G first; B and D when they touch a guard |
| After the report | Offers to fix; fixes follow Workflow steps 4–6 | Never edits; ends with an install recommendation |

When it is unclear whose mod it is, treat it as third-party: reading changes nothing, editing
would.

## Steps

1. **Inventory.** Read `.claude-plugin/plugin.json`, `hooks/hooks.json` (`modules` present and
   spelled right, one module), the module and every file it imports, `types/index.d.ts`,
   `tests/`. Note `claude --version`; if `.claude-plugin/types/claude-code/index.d.ts` exists,
   it outranks the references (SKILL.md → Sources of truth).
2. **Validate.** `claude plugin validate <dir> --strict`. Record every error and warning, and
   the `hooks:`, `calls:`, `env reads:`/`env writes:`, `state reads:`/`state writes:` and
   `gating hook without .catch:` lines. A validation error is a finding in itself; keep going
   with the code review so the report is complete, not only the first failure.
3. **Read the code** against the checklist below, hook by hook. For each hook write down
   `event{matcher}` → observe / rewrite / answer, and compare it with what the mod claims to do
   (README, `plugin.json` description, the user's words). A hook the mod needs but `hooks:`
   doesn't list never runs.
4. **Run the tests** (own mod): `claude plugin test` from the mod directory. Record failures by
   name. For each command the mod registers, also
   `claude -p "/<command>" --plugin-dir <dir> < /dev/null`.
5. **Report** in the format below, then stop and wait.

## Checklist

Each item names where the rule is explained; cite that section in the finding's fix.

### A. Loads at all — create.md → static-analysis rules

- Every rule 1–9 there: full `$.namespace.method(...)` calls; `$` passed only to top-level
  functions of the same file; no alias, destructure or computed index of `$`; string-literal
  event names; no shadowed `on`; relative top-level ES `import`s plus `claude-code` only; no
  `require`, no dynamic `import()`; literal `$.env` names and `$.state` keys held in `const`.
- `plugin.json` `name` without a `claude-` prefix; `hooks.json` has `modules` with one path that
  exists.
- No Node APIs, `setTimeout` or `setInterval` (SKILL.md → Rules that break mods silently).

### B. Fails silently — SKILL.md → Rules that break mods silently, troubleshooting.md

- Every hook that refuses (`tool.call`, `tool.check`, `prompt.submit`, `plugin.register`,
  `http.fetch`) has a `.catch` that refuses; `validate`'s `gating hook without .catch:` lines
  are the minimum, not the whole check (events.md → Failing safely).
- `e` is never mutated; rewrites go through `next({ ...e, field })`.
- At most one hook per event per matcher; commands and tools registered in one `session.start`
  hook, each `$.command.register` in `try`/`catch` with the clash reported via `$.ui.log`.
- Every `ui.render` hook has a matcher, checks `e.requestId` for panes and returns `next(e)` for
  anything not its own.
- `focus`, `closeOnEscape`, `holdToasts`, `autoFocus` are `true` or absent, never `false`.
- Every `Input`/`Select` and every `Button` without a unique label has a unique string `key`.
- State that must survive `/clear`, `/resume`, `/branch` is reloaded in `classic.SessionStart`;
  nothing relies on module variables or timers surviving a reload (api.md → Keeping state).
- A guard on a hook that interruptions affect handles the stopped turn (api.md → Interruptions).

### C. Works on its surfaces — interface.md → VS Code differences, admin.md

- `Raster`/`Image` only behind an `e.surface` check; layout that relies on terminal-only props
  has a fallback for Desktop and VS Code.
- What the mod promises under `claude -p` holds there (api.md → `claude -p` limits).
- A mod meant for users at a company with managed settings doesn't depend on `classic.*`,
  `prompt.section`, `skill.prompt` or `settings.read`: the built-in guard skips them
  (admin.md → Hooks a user's mod can't run).

### D. Stays within limits — reference.md → Limits

- Hook bodies can't exceed 10 s of their own time (`prompt.edit` 50 ms), `.catch` 1 s, all
  `session.end` work the SessionEnd budget. Long work moves to background calls.
- Sizes checked or bounded: `$.fs` and `$.http.fetch` 4 MiB, `$.store` 4 MiB JSON total,
  `deny` reasons 4,096 chars, tree depth 32, 20,000 elements, names ≤64 chars of
  letters/digits/`_`/`-`.
- `$.process.run` and `$.http.fetch` have timeouts that fit the hook's budget.

### E. Fits the installed version — reference.md → Version gates

- Every event, prop and API used exists in the installed `claude --version`; a mod meant to be
  shared states the minimum version it needs.

### F. Text Claude reads — SKILL.md → Rules that break mods silently

- `{ text }` from `command.run` and `deny`/`result` from `tool.call` tell Claude what happened
  and what to do instead; nothing Claude must know is only in `$.ui.log`.

### G. Trust and scope — admin.md → Reviewing a mod before install, overview.md → Trust

- Every entry in `calls:` and every sensitive event in `hooks:` is needed by what the mod
  claims. An unexplained `$.process.run`, `$.http.fetch`, `$.env.get`, `$.env.set`,
  `$.mcp.call`, `$.model.complete`, `$.prompt.submit`, `$.session.send`, `tool.check` or
  `session.append` is a finding.
- Network destinations are fixed or user-configured, not built from conversation content;
  nothing read from env, settings or files is sent anywhere it doesn't have to go.
- `$.process.run` arguments are never assembled from tool input or prompt text.
- No secrets in `$.store`, `$.ui.log` or toasts.
- A `tool.call`/`prompt.submit` hook that sees everything rewrites only what it claims to.

### H. Tests — testing.md

- `tests/*.test.ts` exists and covers each hook's main path and each refusal path; a policy mod
  tests that its guard refuses when the hook throws.
- `claude plugin test` passes; a test that only passes because a stub hides the behaviour under
  test is a finding.

## Severity and verdict

| Mark | Severity | Means | Examples |
|:-:|---|---|---|
| 🔴 | **error** | The mod doesn't load, a guard fails open, or it reaches more than it should | Validation error; refusing hook without `.catch`; `$.process.run` built from prompt text; a failing test |
| 🟡 | **warning** | It loads but misbehaves under some condition, surface or version | Missing `e.surface` check; state lost after `/clear`; a limit that real input can exceed; feature newer than the stated version |
| 🔵 | **note** | Works, but is harder to maintain or debug than it needs to be | Missing tests for a refusal path; `deny` text Claude can't act on; no minimum version stated |

Verdict, from the worst finding: 🔴 **not ready** (any error), 🟡 **ready with warnings**,
🟢 **ready**; 🔵 notes alone still make it **ready**. For a third-party mod, phrase it as the
install recommendation: **don't install**, **install after reading the warnings**, **safe to
install**.

## Report format

Follow the reporting rules indexed at the end of SKILL.md. For a mod audit that means:

- **Verdict line:** the verdict, the counts, and the evidence line: Claude Code version, the
  `validate` result, the test result, the `-p` runs.
- **Scorecard:** checklist A–H, one row each, in that order. A section the audit did not run (a
  third-party mod reviewed for A, C and G only, no `tests/`) is ⚪ with the reason.
- **Findings:** ordered by severity, then file and line. Every finding names a location, the rule
  it breaks and a fix, never only a category; the `Fix` cell cites the section that explains it.
- **Reach line:** `What the mod can reach` goes above `Not checked`, always — for a third-party mod
  it is the part of the report the install decision rests on.
- **Not checked:** what wasn't run (no tests, no `claude` CLI, no interactive session), instead of
  implying it passed.

```markdown
## 🩺 Mod audit · `<mod name>` (`<dir>`)

> 🔴 **Not ready** · 2 errors · 3 warnings · 1 note
> Claude Code <version> · validate: failed · tests: 4 passed, 1 failed · -p: /tally ok

| Checklist | Status | Found |
| --- | :-: | --- |
| A. Loads at all | 🔴 | 1 error |
| B. Silent failures | 🔴 | 1 error |
| C. Surfaces | 🟡 | 1 warning |
| D. Limits | 🟢 | — |
| E. Version gates | 🟡 | 2 warnings |
| F. Text Claude reads | 🔵 | 1 note |
| G. Trust and scope | 🟢 | — |
| H. Tests | ⚪ | no `tests/` |

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🔴 | `hooks/register.ts:14` | `tool.call` guard has no `.catch`, so a thrown error lets the call through | Add a `.catch` that refuses (events.md → Failing safely) |
| 2 | 🟡 | `hooks/register.ts:52` | Pane draws `Image` without checking `e.surface` | Fall back to `Text` off the terminal (interface.md → VS Code differences) |

**What the mod can reach:** files (`$.fs.read`), network to api.example.com (`$.http.fetch`); sees every tool call.

**Not checked:** drawing, focus and hotkeys need a live `claude --plugin-dir` session.

**Next:** say which numbers to fix, or `all`.
```

For a third-party mod, `Next` is the install recommendation, and no fix is offered.

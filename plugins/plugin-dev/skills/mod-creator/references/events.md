# React to events: hooks, matchers, tool calls, prompts, turns, order, failures

Source: https://code.claude.com/docs/en/plugins/mods/events (checked against Claude Code 2.1.316).
Exact fields per event: `reference.md` → Events by group, or the generated `index.d.ts`.

## Contents

- The middleware chain: observe, rewrite, answer
- Matchers
- Guard or change a tool call (`tool.call`)
- Hold a tool call for the user (`$.ui.ask`)
- Decide permission (`tool.check`, `e.isReadOnly`)
- Rewrite or add to a prompt (`prompt.submit`)
- Follow a turn (`turn.start`, `turn.step`, `turn.complete`)
- Change settings reads (`settings.read`)
- Settings hook events (`classic.*`)
- Order of mods in the chain
- Failing safely (`.catch`, fail closed)

## The middleware chain

Hooks on one event form a chain. `next(e)` calls the next mod's hook, and the last `next`
reaches Claude Code's own behavior.

```javascript
// Observe before
on('tool.call', async ($, e, next) => { $.ui.log('about to use ' + e.tool); return next(e) })

// Observe after: await next, act, return the result unchanged
on('tool.call', async ($, e, next) => { const r = await next(e); $.ui.log(e.tool + ' finished'); return r })

// Rewrite: pass a copy (e is deeply frozen; assigning throws)
on('prompt.submit', async ($, e, next) => next({ ...e, text: e.text.trim() }))

// Answer: return without next — later mods and Claude Code's behavior never run
on('tool.call', { tool: 'Bash' }, async () => ({ deny: 'Bash is turned off in this project. Use the file tools.' }))
```

Each event has its own result shape (`reference.md`).

## Matchers

Second argument to `on`. Every field must match. A field value can be a value, an array of
allowed values, or a RegExp:

```javascript
on('tool.call', { tool: 'Bash' }, hook)
on('tool.call', { tool: ['Edit', 'Write'] }, hook)
on('tool.call', { tool: /^mcp__github__/ }, hook)
```

Wildcards: `'classic.*'` (every settings hook event), `'*'` (every event except telemetry
events, which need their own name and `{ to: 'collector' }`).

## Guard or change a tool call (`tool.call`)

Fires before any tool runs — subagents' calls and MCP tools included. `e.tool` is the name;
arguments are fields of `e` (`e.command` for Bash, `e.file_path` for Edit/Write). Calling
`next(e)` runs the permission check and then the tool.

```javascript
on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
  if (/git push .*--force/.test(e.command)) {
    // Claude reads this as the tool result: write it as an instruction Claude can act on
    return { deny: 'Force pushes are not allowed in this repository. Push to a new branch instead.' }
  }
  return next(e)
})

// After the tool: refused calls come back as { deny }, failed ones with isError
on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
  const result = await next(e)
  if (!result.deny && !result.isError && e.file_path.endsWith('.mdx')) $.ui.log('Claude changed ' + e.file_path)
  return result
})
```

Other options in a `tool.call` hook:

- **Change the call**: `next({ ...e, command: safer })`.
- **Retry**: call `next(e)` again after an `isError` result.
- **Answer it yourself**: `return { result }` without `next` — no prompt, tool doesn't run. For
  a built-in tool, shape `result` like that tool's real result (generated
  `claude-code-tools/index.d.ts`).
- **Withhold the result**: `return { deny: reason }` after `await next(e)`. Undoes nothing; if
  the tool succeeded, Claude sees `Bash ran, and a plugin withheld its result:` + reason.

To fail closed, see Failing safely. Where `PreToolUse` settings hooks run: Order of mods in the
chain.

In auto mode, changing a call's input after the model wrote it can make the classifier deny it
(`a hook changed this call's input after the model wrote it`). See `troubleshooting.md`.

## Hold a tool call for the user (`$.ui.ask`)

```javascript
const RISKY = /\brm\s+-rf?\b|\bgit\s+reset\s+--hard\b|\bgit\s+push\b.*--force/

export function register(on) {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    if (!RISKY.test(e.command)) return next(e)
    let answer = 'Refuse'                       // safe default if nobody answers
    try {
      answer = await $.ui.ask('Run this command? ' + e.command, ['Run it', 'Refuse'])
    } catch {
      // dismissed, "Chat about this", or claude -p with nobody to ask
    }
    if (answer !== 'Run it') return { deny: 'The user declined this command. Ask before trying a different approach.' }
    return next(e)                              // the normal permission check still runs
  })
}
```

`$.ui.ask` shows the question dialog with your options plus a free-text row and **Chat about
this**; it resolves to the picked label or the typed text, and rejects on dismiss / Chat about
this / non-interactive runs. Waiting inside a mods API call doesn't count against the hook's
10 s limit; awaiting your own promises does. A timed-out hook is skipped and the command would
run; to fail closed, see Failing safely.

## Decide permission (`tool.check`)

Fires after `tool.call` hooks and `PreToolUse` hooks, before the permission prompt, auto mode's
classifier and `PermissionRequest` hooks. Prefer a plain permission rule (`Bash(npm test)`) for
fixed decisions; use `tool.check` when the decision depends on runtime state.

- `await next(e)` → Claude Code's own decision `{ decision: 'allow'|'ask'|'deny', reason? }`
  (no prompt appears while `next` runs).
- Return `{ decision, reason }` to decide yourself. Arguments are in `e.input` (not top-level).
- `e.agentId` set for subagent/teammate calls (v2.1.290+); `e.ceiling` is `ask` for connector
  tools the org set to ask (v2.1.290+).
- In plan mode, for a non-read-only call, a hook can tighten but not loosen the decision.

```javascript
on('tool.check', { tool: 'Bash' }, async ($, e, next) => {
  const decided = await next(e)
  if (!e.input.command.includes('git push')) return decided
  const branch = await $.process.run(['git', 'branch', '--show-current'])
  if (branch.stdout.trim() !== 'main') return decided
  return { decision: 'deny', reason: 'Push from a branch other than main' }
})
```

`e.isReadOnly` (v2.1.304+) is `true` when the tool reports the call read-only, otherwise
**absent** (not `false`). Read/Grep/Glob/WebSearch are always read-only; Bash when it passes
the built-in read-only check; MCP tools with `readOnlyHint: true`. WebFetch and Agent also
report read-only — never approve on this field alone.

- Read-only calls only: `{ tool: 'Bash', isReadOnly: true }` in the matcher.
- Non-read-only calls: test `e.isReadOnly` in the body. `isReadOnly: false` in a matcher never
  matches.

```javascript
on('tool.check', { tool: /^mcp__github__/ }, async ($, e, next) => {
  const decided = await next(e)
  if (e.isReadOnly || decided.decision === 'deny') return decided
  return { decision: 'ask', reason: 'This tool can change the GitHub repository' }
})
```

Where the built-in guard loads, a user's mod cannot `allow` past a `deny` rule (message
`tried to lift a deny rule in your settings`) unless `allowModsToOverrideDenyRules` is set.

## Rewrite or add to a prompt (`prompt.submit`)

| To | Return |
|---|---|
| Rewrite the prompt (transcript and history show the new text) | `next({ ...e, text: newText })` |
| Add text only Claude reads, after the prompt | `next({ ...e, context: [...(e.context ?? []), extra] })` |
| Stop the prompt (text goes back to the prompt box; user sees `Prompt dropped by a hook:` + reason) | `{ drop: 'reason for the user' }` |

```javascript
on('prompt.submit', async ($, e, next) => {
  if (!/\bPR\b|pull request/i.test(e.text)) return next(e)
  const git = await $.process.run(['git', 'branch', '--show-current'])
  if (git.exitCode !== 0) return next(e)
  return next({ ...e, context: [...(e.context ?? []), 'Current branch: ' + git.stdout.trim()] })
})
```

A `drop` returned after `next(e)` already let the prompt through doesn't stop the turn (the
hook fails with `a drop after its next() was answered`). To fail closed, see Failing safely.

Related: `prompt.section` (system prompt sections), `prompt.context` (first-message context),
`skill.prompt` (skill text; also `e.source`, `e.pluginName`, `e.path`, `e.frontmatter`,
`e.frontmatterProblem` from v2.1.299). Text that changes between requests **invalidates the
prompt cache**.

## Follow a turn

| Event | When | Use |
|---|---|---|
| `turn.start` | A turn begins | Observe; `e.turnId` links the three |
| `turn.step` | One model request is about to go out (several per turn with tools); `e.agentId` set for subagents | Read usage, switch model `next({ ...e, model })`, set `effort`, or answer without calling the model |
| `turn.complete` | Turn ended (also when interrupted: `e.isAborted`); `e.answer`, `e.durationMs`, `e.usage`; subagent turns have `e.agentId` | Observe, or `{ text }` to show a line under the answer |

`turn.step` streams, so its hook is an **async generator** using `yield* next(e)`:

```javascript
on('turn.step', async function* ($, e, next) {
  const result = yield* next(e)        // forwards the stream, evaluates to the finished result
  if (result.usage) {
    $.ui.log('cache read ' + result.usage.cache_read_input_tokens + ' · wrote ' + result.usage.cache_creation_input_tokens)
  }
  return result
})
```

`result.usage`: `input_tokens`, `output_tokens`, `cache_read_input_tokens`,
`cache_creation_input_tokens`, plus `model`. `result.serverToolUses` (v2.1.290+) lists tool
calls the API ran itself (e.g. advisor); no `tool.call`/`tool.check` fires for those. Check
`e.agentId === undefined` to restrict to the main conversation. Model aliases such as `haiku`
in `next({ ...e, model })` work from v2.1.309; on older versions use a full model id.

## Change settings reads (`settings.read`)

Fires on a mod's `$.settings.read` and (v2.1.304+) on Claude Code's own merge of settings
(after the session's mods load, and again when settings or plugins change).

- `e.layers`: `{ source, settings }` per source, lowest precedence first: `plugin`, `user`,
  `project`, `local`, `flag`, `policy` (empty under `claude plugin test`).
- `e.source`: the one source a mod asked for (absent on merged reads).
- `next.origin` is `{ plugin: 'engine', tier: 'core' }` on Claude Code's own read; otherwise the
  calling mod's name.
- `await next(e)` → `{ value }` or `{ deny }` (pass a later hook's deny through unchanged).
- Return `{ value }` to replace keys (on Claude Code's own read, build from `next`'s `value` —
  omitted keys become unset; a value outside the key's schema is refused for that key), or
  `{ deny: reason }`.
- Permission rules and `env` returned here have no effect (they're read per source); use a
  settings file or `$.env.set`.
- The built-in guard skips this hook in user-installed mods (`settings.read bypassed by
  cc-plugin-sec-default` in the debug log).

```javascript
on('settings.read', async ($, e, next) => {
  const read = await next(e)
  if (e.source || !read.value) return read       // one-source reads and denies pass through
  return { value: { ...read.value, spinnerTipsEnabled: false } }
})
```

## Settings hook events (`classic.*`)

Every settings hook event is also `classic.<Event>` (`classic.Stop`, `classic.PostToolUse`,
`classic.SessionStart`, …). `e` is the same JSON a settings hook gets on stdin (e.g.
`transcript_path`). Return `next(e)` so the user's settings hooks still run. Where the
built-in guard loads, these hooks don't run in user-installed mods.

```javascript
on('classic.Stop', async ($, e, next) => { $.ui.log('Transcript saved at ' + e.transcript_path); return next(e) })
```

## Order of mods in the chain

The first mod is outermost: it sees the event first and the result last, and decides whether
others run.

1. Built-in guard `sec-default@builtin` (where it loads), mods in managed `prependPlugins`,
   then other org mods not in `appendPlugins`
2. Mods the user installed (a mod runs before the mods it lists under `dependencies`)
3. Mods in `appendPlugins`
4. Other built-in mods

Within one module, hooks run in the order `register` called `on`.

`PreToolUse` settings hooks: managed ones run before the first mod's `tool.call` (if one blocks,
no mod hook runs); all others
(user/project settings and plugins' `hooks.json`) run after the last mod calls `next`, as part
of Claude Code's behavior — a mod that answers `tool.call` without `next` keeps them from
running. `tool.check` fires after all `PreToolUse` hooks.

## Failing safely

A hook with no `.catch` that throws, times out (10 s own time) or returns the wrong shape:

- failed before calling `next` → skipped; the next handler runs in its place (**fail open**)
- failed after `next` resolved → that result stands

A one-line `my-mod: tool.call hook skipped: threw Error: boom` appears (transcript for
`--plugin-dir`/hot-reload sessions; debug log otherwise; stderr for `claude -p`). A `ui.render`
tree that fails validation counts as the wrong shape.

To **fail closed**, chain `.catch` (1 s limit) on the registration:

```javascript
on('tool.call', { tool: 'Bash' }, guard).catch(async ($, e, next) => {
  if (next.called) return next(e)     // guard already called next: return the produced result, no re-run
  return { deny: 'The command guard failed, so this command was not run: ' + next.error.kind }
})
```

`next.error.kind`: `throw`, `timeout`, or `re-entry` (v2.1.292+; event came from inside a mods
API call by this hook/mod). If the handler itself fails, the hook is skipped as if it had none.

Closed refusals per event: `prompt.submit` → `{ drop }`, `config.set` → `{ deny }`,
`tool.check` → `{ decision: 'deny', reason }` and `plugin.register` → `{ refuse }` (these two
hold even after `next` resolved, so no `next.called` check is needed). At `tool.call`, a `deny`
after `next` withholds the result.

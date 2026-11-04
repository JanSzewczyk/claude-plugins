# The mods API (`$`): commands, tools, models, background work, sessions, files

Source: https://code.claude.com/docs/en/plugins/mods/api (checked against Claude Code 2.1.316).
Full method list: `reference.md` → Mods API namespaces; signatures and examples: generated
`.claude-plugin/types/claude-code/index.d.ts`.

## Contents

- Add a command
- Add a tool for Claude
- Call a model (`complete`, `fork`, prompt caching)
- Background work (timers) and showing things without a turn
- Start a turn from background work
- Interruptions, refused calls, `claude -p` limits
- Messages between sessions
- Keeping state (variables, `$.state`, `$.store`, `/clear`)
- Files, processes, network, settings

## Add a command

Register in `session.start` (Claude Code waits for that hook before the first prompt), answer
in `command.run`:

```javascript
on('session.start', async ($, e, next) => {
  await $.command.register({ name: 'standup', description: 'Summarize what changed today', argumentHint: '[days]' })
  return next(e)
})

on('command.run', { command: 'standup' }, async ($, e) => {
  // e.args: text after the command name, or ''
  return { text: 'Summary for the last ' + (e.args || '1') + ' day(s): ...' }
})
```

- `{ text }` prints in the transcript (prefixed by the plugin name) **and Claude reads it**.
  Return `{}` to print nothing (e.g. a command that only opens a pane).
- `immediate: true` in the registration lets the command run while Claude is working;
  otherwise it waits for the turn to end.
- `$.command.register` **throws** for a taken name (`"/focus" refused: it is the built-in
  /focus`), which skips the rest of the hook. Register commands last, or wrap in try/catch.
- Names: letters, digits, `_`, `-`, up to 64 chars.
- If no hook answers, the user sees `<mod> registered /x but no command.run hook answered it`.

## Add a tool for Claude

Claude sees it as `mcp__<plugin-name>__<name>`; handle it in a `tool.call` hook filtered to
that full name and answer with `{ result }`:

```javascript
on('session.start', async ($, e, next) => {
  await $.tool.register({
    name: 'ticket',
    description: 'Look up a ticket by its id and return its title and status',  // Claude decides from this
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  })
  return next(e)
})

on('tool.call', { tool: 'mcp__my-mod__ticket' }, async ($, e) => {
  const response = await $.http.fetch('https://tickets.example.com/api/' + encodeURIComponent(e.id))
  return { result: response.ok ? response.text : 'Lookup failed with status ' + response.status }
})
```

With MCP tool search, a registered tool may be deferred (Claude sees only its name). Add
`isDeferred: false` (v2.1.293+) to load it upfront.

## Call a model

| | `$.model.complete({ model, prompt, system?, maxTokens?, timeoutMs?, effort? })` | `$.model.fork({ prompt })` |
|---|---|---|
| Model | The one you pass (`'haiku'`, full id…) | The session's |
| System prompt | Attribution block + your `system` | The session's |
| Messages | One user message: your `prompt` | Whole conversation + your `prompt` |
| CLAUDE.md / project context | No | Yes |
| Tools | None | Claude's tools (not callable) |

Both bill to the user's plan/API key/provider. A fork reuses the conversation's prompt cache.

```javascript
on('command.run', { command: 'triage' }, async ($, e) => {
  const r = await $.model.complete({
    model: 'haiku',
    system: 'Reply with one word: bug, feature, or question.',
    prompt: e.args,
    maxTokens: 20,          // default 1024, max 64,000 or the model's limit
    timeoutMs: 15000,
  })
  // API failures don't reject: check isAnswered, read r.reason when false
  return { text: 'Label: ' + (r.isAnswered ? r.text.trim() : 'unknown') }
})
```

The call **rejects** only for a request Claude Code won't send (e.g. a model the org blocks).
`$.model.classify` also exists (see the generated types).

### Prompt caching

Pass `prompt` (and/or `system`) as an array of `{ text }` blocks and mark the last block of
the static prefix with `cache: true` (v2.1.292+; older versions reject arrays in `prompt`):

```javascript
prompt: [
  { text: RULES, cache: true },   // identical every call → cached prefix
  { text: e.args },               // varies → after the breakpoint
]
```

- TTL is 5 min from last use, set by the user's `subagentPromptCacheTtl` (`1h` for an hour),
  not by the call. Max 4 breakpoints per request (a 5th returns `api-error` in `r.reason`).
- Put the shared static content at the start of **`prompt`**, not `system`, unless requests
  surely go straight to the Claude API: on Bedrock/Vertex/Foundry/gateways the attribution
  block (fingerprinted from the start of the user message) makes a `system` breakpoint miss.
  For mods other people run, always use `prompt`.
- Check `r.usage.cache_creation_input_tokens` (write, first call) and
  `r.usage.cache_read_input_tokens` (reads after). Both zero: prefix below the model's minimum,
  `DISABLE_PROMPT_CACHING` applies, a gateway strips `cache_control`, or another mod rewrote
  the start of the text.
- Hooking `model.complete` (to inspect other mods' requests): `e.prompt`/`e.system` are always
  strings; `e.promptBlocks`/`e.systemBlocks` hold the arrays. Appending keeps breakpoints;
  changing the start drops them.

## Background work and showing things without a turn

The module has **no `setTimeout`/`setInterval`**. Use `$.clock` from `session.start`:

```javascript
on('session.start', async ($, e, next) => {
  $.clock.every(60_000, async () => {
    const status = await $.process.run(['gh', 'pr', 'checks', '--json', 'state'])
    $.ui.status('checks: ' + summarize(status.stdout))   // summarize: your top-level function
  })
  return next(e)          // don't wait for the timer
})
```

- `$.clock.every(ms, fn)`, `$.clock.after(ms, fn)` return a timer with `cancel()`;
  `await $.clock.now()`; `$.clock.sleep(ms)` (counts against the hook time limit).
- Timer callbacks run outside any event, between turns, and don't start turns. A throwing
  callback logs to the debug log and runs again next interval. Timers stop on module reload.
- `next.signal` is an `AbortSignal` for the event being handled (e.g. user interrupts); pass
  it to long-running work.

Showing something:

| Call | User sees |
|---|---|
| `$.ui.status(text)` | One persistent line under the prompt: `⚠ my-mod: …` until changed |
| `$.ui.toast(text, { timeoutMs? })` | Toast with the mod name, 4 s default (top-right box in fullscreen, one line under the prompt in classic renderer) |
| `$.ui.log(text)` | Dim transcript line `● my-mod: …` that **Claude doesn't read** |
| `$.ui.log(text, { to: 'debug' })` | A line in the debug log only |
| `$.ui.notify(text, { title? })` | A terminal notification via the user's `preferredNotifChannel` |

`$.ui.notify` resolves to `{ isSent: true, channel }` (`terminal_bell` shows no text) or
`{ isSent: false, reason }` with `disabled`, `no-channel`, `no-surface` (no terminal: `-p`, SDK,
Desktop, VS Code, cloud; also before session start or during exit) or `refused`. It rejects for
non-string text, another mod's `{ deny }`, or a terminal write error. The user's `Notification`
settings hooks run with type `plugin_notification`.

```javascript
on('turn.complete', ($, e, next) => {
  if (e.agentId === undefined && !e.isAborted) {
    const fallBack = () => $.ui.toast('Turn finished')
    $.ui.notify('Turn finished').then(s => { if (!(s.isSent && s.channel !== 'terminal_bell')) fallBack() }, fallBack)
  }
  return next(e)          // don't await the notification
})
```

In VS Code, status lines and toasts stack above the prompt box (status cut at 200 chars/2 rows,
toast at 500 chars).

## Start a turn from background work

`$.prompt.submit({ text })` waits until the session is idle and starts a turn; Claude reads the
text after a sentence naming your mod as sender. `asUser: true` sends it as the user's own
words. It resolves when the turn **starts** — never `await` it in a hook running during a turn.

Other `$.prompt` methods: `read`, `fill` (put a draft in the prompt box), `suggest` (dim
suggestion; always `isShown: false` in VS Code), `compose`.

## Interruptions, refused calls, `claude -p` limits

After the user stops a turn (Esc/Stop), calls that start new work are refused until the user's
next input, with reason `the session was stopped and nobody has sent input since` (v2.1.304+
for most calls). The user may see the toast
`Stopped: type a message to continue; a mod cannot resume work after Stop`.

| Refused call | Result |
|---|---|
| `$.prompt.submit` | Resolves `{ drop: '<reason>' }` |
| `$.command.run` | Rejects; message ends with the reason |
| `$.agent.spawn` | Resolves `{ deny: '<reason>' }` |
| `$.session.send` to a finished subagent / a teammate | Resolves `{ isDelivered: false, reason }` |
| `$.tool.call` of background Bash, Monitor, CronCreate | Resolves `{ deny: '<tool> was not run: …' }` |

Queued work dropped by the stop: `$.prompt.submit` → `{ drop: 'the prompt was removed from the
queue before it ran' }`; `$.command.run` rejects with `…was removed from the queue before it
ran`. Retry from a `turn.complete` hook — nothing retries for you:

```javascript
let pendingText = null                      // top level, above register

async function submitPrompt($, text) {      // top-level function: may receive $
  let reason
  try { reason = (await $.prompt.submit({ text }))?.drop ?? '' } catch (error) { reason = String(error?.message ?? error) }
  if (reason.includes('the session was stopped and nobody has sent input since') ||
      reason.includes('was removed from the queue before it ran')) pendingText = text
}

// inside register:
on('turn.complete', async ($, e, next) => {
  if (pendingText !== null) { const t = pendingText; pendingText = null; submitPrompt($, t) }  // not awaited
  return next(e)
})
```

`claude -p` / Agent SDK refusal reasons: `the run reached its --max-turns limit` (mod prompts
and spawned subagents count), `the run is past its --max-budget-usd limit` (cumulative; retry
won't help), `the host has ended its input` (stop making the call). A mod that submits a prompt
after every turn makes `claude -p` run forever unless `--max-turns`/`--max-budget-usd` is set
(enforced from v2.1.299; subagent turns counted from v2.1.304).

## Messages between sessions

`$.session.send({ to, text })` — same delivery as the SendMessage tool. `to` is
`{ sessionId }`, `{ agentId }` (from `$.agent.list()`), or the string address a received message
came from. Resolves `{ isDelivered: true }` or `{ isDelivered: false, reason }`.

```javascript
on('command.run', { command: 'ping' }, async ($, e) => {
  const sent = await $.session.send({ to: { sessionId: e.args }, text: 'Status? One line.' })
  if (!sent.isDelivered) $.ui.toast('Not delivered: ' + sent.reason)
  return {}
})
```

Observe with `session.receive` (`e.text`, `e.origin.kind`: `peer`, `peer-send-message`,
`task-notification`, `scheduled-trigger`; return `{ consumed: reason }` to hide it from Claude)
and `session.send` (`e.to`, `e.text`, `e.origin.kind`: `model` or `plugin`). Never trust the
sender name in a received message. A message awaiting approval reaches `session.receive` first.

## Keeping state

| Keep it in | Lasts until | Use for |
|---|---|---|
| Module variable | Module reload (every save in development) | Disposable state (current tab) |
| `$.state` | Session end, or `/clear`, `/resume`, `/branch` | Values a drawing depends on that must survive reloads |
| `$.store` | Deleted, or unused for `cleanupPeriodDays`; JSON file under `~/.claude/plugins/store/`, 4 MiB | Settings, history, anything for next time |

`$.store.get(key)` resolves to the value or `undefined`; `$.store.set(key, value)` takes any
JSON value. The examples use the `hello-tabs` pane from interface.md → Worked example.

### `$.state` (reactive)

1. Declare values in `types/index.d.ts`:

   ```typescript
   declare module 'claude-code' {
     interface PluginState {
       'hello-tabs': { tab: 'one' | 'two'; count: number }
     }
   }
   ```

2. Point the manifest at it: `"types": "./types/index.d.ts"` in `plugin.json` (optional from
   v2.1.299 when the file is at that default path).
3. Use the helpers:

   ```javascript
   import { atom, read, update } from 'claude-code'
   const count = atom({ plugin: 'hello-tabs', key: 'count' }, 0)      // top level, const, literals
   const n = await read($, count)                                      // in ui.render: subscribes
   onPress: () => update($, count, (value) => value + 1)               // write from a callback
   ```

Rules: literal `plugin`/`key`; hold each atom in a `const` (`let` fails with `takes a source the
scan can read`); declare every value (`hello-tabs.count is not declared`); `ui.render` may read
but **not write** state — write from callbacks or other events' hooks. A `ui.render` hook that
reads a value is redrawn whenever it is written. Also available: `derive`, `memberOf`,
`$.state.get/set`.

### Reload after `/clear`, `/resume`, `/branch`

These reset `$.state` to defaults and **`session.start` does not fire again**.
`classic.SessionStart` does, with `e.source` `clear`, `resume` or `fork`:

```javascript
async function loadCount($) {                 // top-level, receives $
  const saved = Number((await $.store.get('count')) ?? 0)
  await update($, count, () => saved)
}
on('session.start', async ($, e, next) => { await loadCount($); return next(e) })
on('classic.SessionStart', { source: ['clear', 'resume', 'fork'] }, async ($, e, next) => { await loadCount($); return next(e) })
```

(Where the built-in guard loads, `classic.*` hooks of user-installed mods don't run.)

### Several sessions writing `$.store`

All sessions on the machine share one store and get-then-set isn't atomic. Give each item its
own key, and read again right before writing:

```javascript
onPress: async () => {
  const saved = Number((await $.store.get('count')) ?? 0)
  await $.store.set('count', saved + 1)
  await update($, count, () => saved + 1)
}
```

## Files, processes, network, settings

The module has no Node.js APIs, no timers, no own file/network access. Standard web APIs exist
(`URL`, `TextEncoder`, `AbortController`, `crypto.subtle`, `Uint8Array.prototype.toBase64`).
Everything else, with the user's permissions:

| Namespace | Methods / notes |
|---|---|
| `$.fs` | `read`, `write`, `exists`, `stat`, `list`, `ancestors`. Relative paths resolve against the session's (or the subagent's) cwd. `list` is one level: `{ name, kind, size, isLink }`. `write` is **not atomic**. 4 MiB per file. |
| `$.process` | `run(argv, init?)`: no shell, resolves `{ exitCode, stdout, stderr }` for any exit code, **rejects** if it can't start or exceeds the timeout (30 s default, 10 min max) — wrap in try/catch. stdout/stderr capped at 4 MiB (`isStdoutTruncated`). `spawn` streams a long-running command (async-generator event). |
| `$.http` | `fetch(url, init)` over http/https → `{ status, ok, headers, text }`. 30 s total, 5 redirects, 4 MiB request and response bodies. Cross-origin redirects keep only `accept`, `accept-language`, `content-type`, `user-agent` (so `Authorization` is dropped). Refused when org policy disallows WebFetch. |
| `$.store` | `get`, `set`, `delete`, `keys`: JSON key-value store shared by every session on the machine, 4 MiB total (see Keeping state above). |
| `$.env` | `get`, `set` (literal names). `set` affects Claude Code and every command/MCP server it starts afterward. |
| `$.settings` | `read()` merged; `read({ source })` one of `user`, `project`, `local`, `flag`, `policy` (`{}` if empty); `read({ key })` one top-level key (v2.1.304+), `undefined` if unset; both combined. |
| `$.session` | `messages()` (newest 4,096 `{ role, text, toolUses }`), `cwd`, `root`, `model`, `turns`, `id`, `repo`, `surfaces`, `usage()` (`{ startedAt, context: { tokens, window, percent }, rateLimits: [{ kind, percentUsed, resetsAt }], cost }`), `version`, `compact`, `send`, `append`, `authorize` |
| `$.mcp` | `call` a tool on a connected server; `connect(server)` for a server your own manifest lists |
| `$.agent` | `register`, `spawn`, `list` (status `pending`/`running`/`waiting`/`idle`/`completed`/`failed`/`killed`) |

Method lists for the other namespaces (`$.tool`, `$.config`, `$.turn`, `$.audio`, `$.plugin`):
`reference.md` → Mods API namespaces.

Every mods API call is itself an event named without `$.` (`fs.read`, `model.complete`,
`ui.open`). A mod earlier in the chain can observe, rewrite or refuse your call — that is how
organizations restrict mods. A refused `$.process.spawn` after output started rejects with
`$.process.spawn started, and a plugin withheld its result:` or `… ran, and …`.

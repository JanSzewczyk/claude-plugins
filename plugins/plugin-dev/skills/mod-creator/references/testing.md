# Test a mod with `claude plugin test`

Source: https://code.claude.com/docs/en/plugins/mods/test (checked against Claude Code 2.1.316).

The examples test `first-mod` (`/tally`, create.md), `hello-tabs` (interface.md → Worked
example) and `acme-guard` (admin.md → Writing a policy mod); `countdown` and `grade` stand for
any command that sets a `$.clock` timer or calls `$.model.complete`.

## Contents

- Running tests
- Anatomy of a test
- Stubs: answering in Claude Code's place
- Test kit rules (the errors new tests hit first)
- Stub lookup table
- Testing timers
- Testing drawings (and after `/clear`)
- Testing a policy mod

## Running tests

- Files ending in `.test.ts` or `.test.tsx`, anywhere in the plugin directory (convention:
  `tests/<mod>.test.ts`). Each file needs at least one `test()` or the run fails with
  `declares no test(): nothing ran`.
- Run from the mod directory: `claude plugin test` (or `claude plugin test <directory>`). No
  session, sign-in or network.
- Exit status 1 when a test fails — usable in CI. If mods can't load in that shell it prints
  `claude plugin test: hooks modules are turned off` and the reason, and exits 1.
- Default per-test timeout 5 s unless the test sets `timeoutMs`.
- Test files may import the mod's own files and sibling `.ts` helpers, so plain functions (game
  rules, parsers) can be unit tested without the kit.

## Anatomy of a test

```typescript
import { expect, test } from 'claude-code/testing'

test('/tally reports the tool calls the mod has seen', async ($, on) => {
  on('tool.call', () => ({ result: 'ok' }))                       // stub: no real tool runs

  await $.tool.call({ tool: 'Bash', command: 'ls' })              // fires tool.call through the mod
  await $.tool.call({ tool: 'Read', file_path: 'README.md' })

  const answer = await $.command.run({ command: 'tally', args: '' })
  expect(answer.text).toBe('Claude has made 2 tool calls since this mod loaded')
})
```

- **`$`** (the test's) acts as Claude Code: each method fires the event of the same name
  through your mod's hooks and resolves to the result — `$.tool.call`, `$.command.run`,
  `$.prompt.submit`, `$.session.start`, `$.session.receive`, `$.turn.step`, `$.turn.complete`,
  `$.classic.<Event>`, `$.ui.mount`. It is not the mods API. Mods API calls such as `ui.close`
  can't be fired directly — trigger them through the mod (press the button that closes).
- **`on`** registers stubs that answer in Claude Code's place, named without `$.`
  (`store.get` answers `$.store.get`).
- `expect` matchers: `toBe`, `toEqual`, `toMatch`, `toMatchObject`, `toContain`, `toBeDefined`,
  `toBeUndefined`, `toThrow`, plus `.not`. An `expect` failing inside a plain-function stub
  fails the test (`in the test's store.set hook`).

## Stubs

- A stub for a **mods API call** returns `{ value }` (what the call resolves to) or
  `{ deny: 'reason' }` (the call rejects). A bare value fails with
  `returned neither { value } nor { deny }`. A stub that throws is skipped instead.
- A stub for a **Claude Code event** (`tool.call`, `turn.step`, `session.start`…) returns that
  event's own result, e.g. `{ result: 'ok' }`. Same for `session.send` and `prompt.fill`.
- Missing stub: `no implementation for <name>`. Errors appear under `the engine reported:` in
  a failed test's output.
- The kit answers `$.ui.invalidate`, `$.state` and `$.session.append` itself.

Ready-made mocks from `claude-code/testing`:

- `mock.clock(on, { now? })` — controllable clock (required for any `$.clock` use).
- `mock.store(on, { count: 7 })` — answers `$.store` from initial entries (returns nothing;
  write your own `store.get`/`store.set` stubs to inspect saves).
- `mock.env(on, { CI: 'true' })` — answers `$.env.get`.
- `mock.session(on)` — `.appended()` lists rows added with `$.session.append` (v2.1.293+).

Model stub example:

```typescript
on('model.complete', () => ({
  value: { isAnswered: true, text: 'PASS\nNice sentence.',
           usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
}))
const answer = await $.command.run({ command: 'grade', args: 'The cat sat on the mat.' })
expect(answer.text).toBe('Passed')
```

## Test kit rules

1. **Register every stub before the first call on `$`**, else
   `on("ui.render") after the test first called $`.
2. **`session.start` doesn't run by itself.** Each test starts with the module freshly loaded
   (module variables at initial values). Fire it, and stub what it calls:

   ```typescript
   on('session.start', () => ({ cwd: '/work' }))
   on('command.register', () => ({ value: undefined }))
   await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
   ```

   Without the `command.register` stub the hook is silently skipped after that call; it shows
   under `the engine reported:` only if a later check fails.
3. **A hook that returns `next(e)` needs a stub to answer.** For `ui.render` returning `next(e)`:
   `on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by Claude Code'] }))`,
   else mounting fails with `no implementation for ui.render`.
4. **A `turn.step` stub is an async generator**; read the stream to the end:

   ```typescript
   on('turn.step', async function* ($, e) {
     yield { kind: 'text', index: 0, text: 'ok' }
     return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null }
   })
   const stream = $.turn.step({ turnId: 't', index: 0, model: 'claude-test', messageCount: 1 })
   let step = await stream.next()
   while (step.done !== true) step = await stream.next()
   const result = step.value
   ```

5. **Fire tool calls with arguments as fields**: `$.tool.call({ tool: 'Bash', command: 'ls' })`,
   with a `tool.call` stub returning `{ result }`.

## Stub lookup table

| Your mod calls / passes on | Stub |
|---|---|
| `$.command.register`, `$.tool.register`, `$.ui.toast`, `$.ui.log`, `$.ui.status`, `$.ui.close`, `$.store.set` | `() => ({ value: undefined })` (toast/log text in `e.text`) |
| `$.store.get` | `($, e) => ({ value: saved.get(e.key) })` |
| `$.fs.read` | `($, e) => ({ value: e.path.endsWith('notes.md') ? '# Notes' : '' })` — `e.path` is absolute |
| `$.ui.open` | `() => ({ value: { isPlaced: true } })` |
| `$.ui.ask` | a **`tool.call`** stub (it arrives as `AskUserQuestion`): `($, e) => ({ result: { answers: { [e.questions[0].question]: 'Run it' } } })` |
| `$.model.complete` | `() => ({ value: { isAnswered: true, text: '...', usage } })` |
| `$.process.run` | `($, e) => ({ value: { exitCode: 0, stdout: '...', stderr: '' } })` (`e.argv`, `e.init`) |
| any call that should fail | `() => ({ deny: 'the reason' })` |
| `session.start` | `() => ({ cwd: '/work' })` |
| `turn.start` | `($, e) => ({ turnId: e.turnId })` |
| `tool.call` | `() => ({ result: '...' })` |
| `turn.complete` | `() => ({ text: '' })`; fire with `$.turn.complete({ turnId, answer, durationMs, isAborted: false, usage: null })` |
| `prompt.submit` | `($, e) => ({ text: e.text })` |
| `prompt.fill` | `() => ({ isFilled: true })` |
| `$.prompt.read` | `() => ({ value: { text: '...', cursor: 0 } })` |
| `$.ui.copy` | `() => ({ value: { isCopied: true } })` |
| `$.ui.notify` | `() => ({ value: { isSent: true, channel: 'terminal_bell' } })` |
| `$.session.messages` | `() => ({ value: [{ role: 'assistant', text: '...', toolUses: [] }] })` |
| `$.session.id`, `$.agent.list` | `() => ({ value: 'abc123' })`, `() => ({ value: [] })` |
| `session.send` | `() => ({ isDelivered: true })` (`e.to` arrives as a string) |
| `session.receive` | `($, e) => ({ text: e.text })`; fire with `$.session.receive({ origin: { kind: 'peer-send-message' }, text })` |
| `ui.render` | `() => ({ type: 'Text', props: {}, children: ['...'] })` |
| `$.clock.*` | `mock.clock(on)` (else `no implementation for clock.now`) |

## Testing timers

```typescript
import { expect, mock, test } from 'claude-code/testing'

test('the countdown ends with a toast', async ($, on) => {
  const clock = mock.clock(on)
  const toasts: string[] = []
  on('ui.toast', ($, e) => { toasts.push(e.text); return { value: undefined } })

  await $.command.run({ command: 'countdown', args: '3' })
  await clock.advance(2000)
  expect(toasts).toEqual([])
  await clock.advance(1000)
  expect(toasts).toEqual(['Time is up'])
})
```

Clock methods: `advance(ms)` and `set(t)` run due timers; `now()`; `settle()` runs already-due
timers (e.g. zero-delay chains) without moving time; `sleep(ms)` inside a stub delays its answer
until the test advances that far (simulate a slow model or process).

## Testing drawings

`$.ui.mount(siteEvent)` draws a render site through your `ui.render` hook and returns a handle.
Pass the props Claude Code would pass (see `reference.md` → Render sites), and set `surface` to
test several apps:

```typescript
const PANE = {
  plugin: 'hello-tabs', component: 'Pane', requestId: 'hello-tabs',
  viewport: { columns: 100, rows: 30 },
  props: { title: 'Hello tabs', isFocused: true, bodyColumns: 60, placement: 'inline', scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('the second tab counts presses and saves the count', async ($, on) => {
  const saved = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: saved.get(e.key) }))
  on('store.set', ($, e) => { saved.set(e.key, e.value); return { value: undefined } })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'tab-two' })
    await ui.press({ key: 'more' })
    expect(await ui.find({ type: 'Text', text: /^Count: \d+$/ })).toBeDefined()
    await ui.unmount()
  }
  expect(saved.get('count')).toBe(2)
})
```

Handle methods (all address controls by `key`, resolve after your handler finishes):
`press({ key })`, `input({ key, text, kind? })` (types and presses Enter; `kind: 'change'` types
without submitting; `\n` allowed with `rows`), `select({ key, value })`,
`find({ key } | { type, text })` (string or RegExp; returns `{ type, props, children }` or
`undefined`), `unmount()`. `press` fails with `key each once` when several buttons share the
key (e.g. same label, no `key`).

The kit validates the tree but doesn't paint it — check a new layout in a real session too.

### After `/clear`

Each test starts with `$.state` at defaults (like after `/clear`). Skip `session.start` and fire
`classic.SessionStart`:

```typescript
test('the saved count comes back after /clear', async ($, on) => {
  on('store.get', () => ({ value: 7 }))
  on('classic.SessionStart', () => ({}))
  await $.classic.SessionStart({ source: 'clear' })
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'tab-two' })
  expect(await ui.find({ type: 'Text', text: 'Count: 7' })).toBeDefined()
})
```

## Testing a policy mod

- `tier('prepend' | 'append' | 'builtin')` once at the top of the file loads the mod under test
  in that tier (default `user`).
- `test(name, { plugins: [...] }, body)` adds inline mods (`{ name, register, tier? }`) to judge.
- All mods load at the test's first call on `$`; a refusal throws there with
  `<refused mod>: refused by <your mod>: <reason>`.

```typescript
import { expect, test, tier } from 'claude-code/testing'
tier('prepend')

const runner = { name: 'runner', register(on) {
  on('tool.call', async ($, e, next) => { await $.process.run(['ls']); return { result: 'runner answered' } })
} }

test('refuses a mod that starts a process', { plugins: [runner] }, async ($, on) => {
  on('tool.call', () => ({ result: 'claude code answered' }))
  let message = ''
  try { await $.tool.call({ tool: 'Bash', command: 'ls' }) } catch (error) { message = error.message }
  expect(message).toBe('runner: refused by acme-guard: Acme policy: mods may not call process.run')
})
```

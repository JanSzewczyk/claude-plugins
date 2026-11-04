# Create a mod: files, code, dev loop, validation, sharing

Source: https://code.claude.com/docs/en/plugins/mods/create (checked against Claude Code 2.1.316).

## Contents

- File layout
- The three files (complete working example)
- TypeScript
- How the hook arguments work
- Load and iterate (`--plugin-dir`, hot reload, the dev-mods folder)
- Generated type definitions (the source of truth)
- `claude plugin validate` and the static-analysis rules
- Sharing a mod

No Node.js, bundler or build step: Claude Code loads `.js`/`.ts` files directly.

## File layout

```text
first-mod/
├── .claude-plugin/
│   └── plugin.json      # manifest; mods add no required fields
├── hooks/
│   ├── hooks.json       # "modules": ["./register.ts"]  ← this key makes it a mod
│   └── register.ts      # the hooks module (entry point), an ES module (.js works too)
├── types/index.d.ts     # only when the mod uses $.state or adds an API namespace
└── tests/first-mod.test.ts   # optional, run by `claude plugin test`
```

Module extensions accepted: `.js`, `.mjs`, `.cjs`, `.jsx`, `.ts`, `.mts`, `.cts`, `.tsx`.
`hooks.json` may also hold ordinary settings hooks under `hooks`. Template for
`types/index.d.ts` (the `PluginState` declaration and the `"types"` field in `plugin.json`):
`api.md` → Keeping state.

## The three files (complete working example)

`first-mod/.claude-plugin/plugin.json`:

```json
{
  "name": "first-mod",
  "version": "0.1.0",
  "description": "Counts Claude's tool calls, shows the count beside the spinner, and adds a /tally command",
  "author": { "name": "Your Name" }
}
```

`first-mod/hooks/hooks.json` (one path, relative to this file). `modules` holds **at most one**
module per plugin: `validate` refuses a second entry ("names one hooks module per plugin") and
`claude plugin test` then loads nothing. A second, unrelated mod goes into a plugin of its own,
which may sit in the same marketplace:

```json
{
  "description": "The first-mod hooks module",
  "modules": ["./register.ts"]
}
```

`first-mod/hooks/register.ts` (the same code works unchanged as `register.js`):

```javascript
// Shared by every hook in this file; resets on each reload
let calls = 0

// Called once when the mod loads, and again on every reload
export function register(on) {
  on('session.start', async ($, e, next) => {
    // Register commands and tools here so they exist from the first turn
    await $.command.register({ name: 'tally', description: 'Show how many tool calls Claude has made' })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    calls += 1
    $.ui.invalidate('ui.render')   // ask for a redraw so the new count shows
    return next(e)                 // observe: let the tool run as usual
  })

  // Matcher { command: 'tally' }: runs only for /tally. Answers without next.
  on('command.run', { command: 'tally' }, async () => {
    return { text: 'Claude has made ' + calls + ' tool calls since this mod loaded' }
  })

  // Rewrite: keep Claude Code's spinner, add a suffix after its word
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    return next({ ...e, props: { ...e.props, suffix: ' · tool calls: ' + calls + '…' } })
  })
}
```

`register(on, options)` also receives `options`: the plugin's `userConfig` values with defaults
filled in (set by users under `pluginConfigs` in settings).

## TypeScript

TypeScript is a first-class choice and the default in this skill: point `modules` at
`./register.ts` (or `.mts`, `.cts`, `.tsx` for JSX trees) and Claude Code loads it directly —
no `tsc`, bundler or Node.js; types are stripped at load. Verified on 2.1.316: `first-mod`
above as `register.ts`, with and without type annotations, passes `claude plugin validate`,
`claude plugin test` and `claude -p "/tally"`.

- Tests are TypeScript already (`*.test.ts`, importing `claude-code/testing`).
- For editor checking, load the mod once with `claude --plugin-dir <dir>` in an interactive
  session: Claude Code writes `.claude-plugin/types/` and, if the mod has none, a `tsconfig.json`
  that extends the generated one. Then `tsc -p <dir>` type-checks the mod. Type `register`, `$`,
  `e` and `next` with the declarations exported from `claude-code` — search the generated
  `claude-code/index.d.ts` for `register` to find their names for your version rather than
  guessing them.
- `.claude-plugin/types/claude-code-tools/index.d.ts` makes `if (e.tool === 'Bash')` narrow `e`
  to Bash's arguments.
- The static-analysis rules below apply unchanged: type annotations don't count as uses of `$`,
  but `const ui: X = $.ui` is still aliasing and fails.
- `.tsx` modules can write trees as JSX after destructuring elements from `$.ui.resolve(e)`.

## How the hook arguments work

- `$` — the mods API, in namespaces (`$.ui`, `$.command`, `$.fs`, …). See `api.md`.
- `e` — the event input as **deeply frozen** plain data. Never assign to it; pass a copy to
  `next`.
- `next(e)` — passes the event to the next mod's hook and finally to Claude Code; resolves to
  the result. Extra members: `next.signal`, `next.origin`, `next.budget`, `next.called`,
  `next.error`, `next.to` (see `reference.md` → The hook function).

Register each event once per matcher: two `on('session.start', …)` without matchers fail with
`on("session.start") is registered twice without a matcher`. Put all session-start work in one
hook.

## Load and iterate

- **Your own directory** (recommended for real work): `claude --plugin-dir ./first-mod`. Claude
  Code watches the directory and hot-reloads the module on save; the transcript shows a line
  naming the mod and its hooks. Each reload re-runs `register`, so module variables reset and
  timers stop (the new copy's `session.start` starts them again).
- **Non-interactive check**: `claude -p "/tally" --plugin-dir ./first-mod < /dev/null` prints
  the command's reply (prefixed with the plugin name), e.g. `first-mod: Claude has made 0 tool
  calls …`. Without `< /dev/null` it waits 3 s for stdin and prints a warning first.
- **Several mods**: repeat `--plugin-dir`. For apps that can't take a flag, set
  `CLAUDE_CODE_PLUGIN_DIRS` (absolute paths, `:`-separated; `;` on Windows).
  `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` makes a long-running non-interactive session reload on save.
- **Edits made by Claude in a `--plugin-dir` session** reload when the turn ends. The directory
  is a protected path, so in `default`/`acceptEdits` modes each edit needs approval.
- **Built-in "ask Claude for a mod" flow**: the built-in `plugin-authoring` skill writes into
  `~/.claude/dev-mods/<session-id>/<mod-name>/` (protected path; each file needs approval in
  `default`/`acceptEdits`). On the first file, Claude Code asks whether to enable hot reloading
  for the session: **Enable** loads the mods at turn end and reloads them after each changing
  turn; **Not now** loads them next time that session starts. They load only in that session
  and the folder is deleted after `cleanupPeriodDays`. To keep a mod, copy it out (e.g.
  `~/mods/git-branch`) and run `claude --plugin-dir ~/mods/git-branch`.
- Mods written by Claude never load when nobody can approve (`claude -p`, `dontAsk` mode), in
  an untrusted workspace, with `--safe-mode`/`--bare`/`disableAllHooks`, or when org policy
  blocks it. After three unanswered hot-reload prompts (e.g. `askUserQuestionTimeout`), it
  stops asking — copy the mod out and use `--plugin-dir`.
- If a transcript line says the mod's change didn't load, Claude does not see that line; the
  user has to paste it.
- Never develop against an installed copy: installs are cached by version, so edits don't
  reach it until the version is bumped and reinstalled.

## Generated type definitions (the source of truth)

When a mod is loaded from `--plugin-dir` in an interactive session (or written via the
built-in flow), Claude Code writes TypeScript declarations for **the running version** into
`<mod>/.claude-plugin/types/`:

| Path | Declares |
|---|---|
| `claude-code/index.d.ts` | Every event with input and result, every mods API method (with a comment and example), the elements each surface can draw |
| `claude-code-tools/index.d.ts` | Built-in tools' inputs and results (`e.tool === 'Bash'` narrows `e`) |
| `claude-code-mcp/index.d.ts` | Inputs of MCP tools connected when a mod file was last saved |
| `<plugin>/index.d.ts` | API additions from each plugin listed under `dependencies` in `plugin.json` |
| `tsconfig.json` | Compiler options for a hooks module |

If the mod has no `tsconfig.json`, Claude Code adds one extending the generated one, so
`tsc -p ./first-mod` type-checks it. Look things up by searching `claude-code/index.d.ts` for the name (e.g.
`'tool.call'`). An older copy is public at
`github.com/anthropics/claude-code/blob/main/mods/types/claude-code.d.ts`.

## `claude plugin validate` and the static-analysis rules

`claude plugin validate ./first-mod` checks the manifest and runs the same static analysis
Claude Code runs at load, without starting a session. Expected output:

```text
  ❯ ./register.ts hooks: session.start, tool.call, command.run{command=tally}, ui.render{component=Spinner}
  ❯ ./register.ts calls: $.command.register, $.ui.invalidate

✔ Validation passed
```

- `hooks:` lists handled events with matchers in braces. A missing event means Claude Code
  won't call that hook either (usually a misspelling: `"tool.calls" is not an event`).
- `calls:` lists every mods API method used.
- Also: `env reads:`/`env writes:`, `state reads:`/`state writes:`, and one
  `gating hook without .catch: <event>` line per hook that can refuse an action.
- `--strict` turns warnings into errors; `--json` prints a machine-readable report.
- No `hooks:` line at all means `hooks.json` lacks `modules` (or misspells it).
- Seen on 2.1.316, not in the docs: an `answers its own command: command.run{command=tally}`
  line, and a block of **plugin directory checks** (README missing, LICENSE missing, no icon)
  that do *not* change the result — they matter only for submitting to Anthropic's directory
  (`--profile directory` makes them fail the run). An error reads
  `register.js:2: "tool.calls" is not an event; …` followed by `✘ Validation failed`.

Rules the analysis enforces — break one and the module fails to load:

1. Write each mods API call in full: `$.store.get('notes')`. You may pass `$` to a function
   **declared at the top level of the same file** (shown as `$.store.get (via loadNotes)`).
   Passing `$` to a method, to a function defined inside a hook or inside `register`, or to an
   imported function fails. Exception: the `read`/`update` helpers from `claude-code`.
2. Never alias, destructure or computed-index `$` or a namespace: `const ui = $.ui` fails with
   `$.ui is used as a value`.
3. The event name in `on(...)` is a **string literal**. Variables or loops over names fail with
   `the event name passed to on() is not a string literal`.
4. Inside `register`, never declare another variable/parameter named `on`
   (`"on" is declared again (shadowed)`).
5. Import only files inside the plugin directory, by relative path. The only bare import
   allowed is `claude-code` (types and helpers like `atom`, `read`, `update`).
6. Top-level `import` declarations only; dynamic `import()` fails.
7. ES modules only: `import`, never `require`.
8. `$.env.get/set` names are string literals; `$.state` atoms use literal `plugin`/`key` and are
   held in `const`.
9. Nesting: at most 2,000 nested scopes per file.

## Sharing a mod

A mod is a plugin: version it in `plugin.json`, install/update with `/plugin`.

- A few people: send the directory or a `.zip`.
- A team: list it in your own marketplace (e.g. a private repo, one directory per plugin);
  register that marketplace in a repo's settings so everyone working there gets it.
- A whole organization: an admin installs it via managed settings (see `admin.md`).
- Anyone: make the marketplace public or submit to Anthropic's directory.

Before sharing: the `name` must not look like Anthropic's own (e.g. starting with `claude-`) or
`validate` fails. State in the README which Claude Code version it was tested with — events
and methods change between releases.

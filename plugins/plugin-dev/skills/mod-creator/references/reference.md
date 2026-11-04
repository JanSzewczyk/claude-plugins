# Mods reference: lookup tables

Source: https://code.claude.com/docs/en/plugins/mods/reference (entries as of CLI/Desktop
v2.1.290 and VS Code v2.1.299; checked against Claude Code 2.1.316).

## Contents

- The hook function: the three arguments and every `next.*` member (`signal`, `origin`, `budget`, `to`, `error`, `called`)
- Events by group: when each event fires and what a hook on it may return
- Mods API namespaces: every `$` method, by namespace
- Render sites: each site's `e.props`, `e.requestId` and the apps that draw it
- Element props, borders, spacing, typography: props per element and per surface, `borderStyle` names, spacing steps, text props
- Limits: time, size, rate and naming caps
- Settings and environment variables: what each mod-related setting does and where it is read
- Commands: the CLI and `/` commands for loading, validating, testing and debugging
- Version gates: the first Claude Code version for each feature

## The hook function

`on(event, [matcher], hook)` returns a registration with `.catch(handler)`.

| Argument | What it is |
|---|---|
| `$` | Mods API. Write calls in full: `$.fs.read('notes.md')` |
| `e` | Event input, deeply frozen. Change via a copy passed to `next` |
| `next(e)` | Runs later hooks, then Claude Code; resolves to the result |
| `next.signal` | `AbortSignal`, aborts when the event is abandoned |
| `next.origin` | `{ plugin, tier }` of the firer; Claude Code is `{ plugin: 'engine', tier: 'core' }`; tiers `prepend`, `user`, `append`, `builtin` |
| `next.budget` | `{ ms, remainingMs }` of the hook's time limit |
| `next.to(e, tier)` | Skip to `append`, `builtin` or `core`; only mods in `prependPlugins`/`appendPlugins` |
| `next.error` | In `.catch` only: `kind` `throw`/`timeout`/`re-entry` (v2.1.292+), `message`, `cause` (`rewritten` v2.1.300+, `lent` v2.1.292+) when re-entry |
| `next.called` | In `.catch` only: whether the hook had called `next` |

Hooks on `turn.step` and `process.spawn` are async generators; all others are async functions.

## Events by group

Shorthand: `next(e)` passes unchanged; `next({ ...e, x })` passes a changed copy; an object
answers without `next`.

### Tools

| Event | Fires when | Return |
|---|---|---|
| `tool.call` | A tool is about to run | `next(e)`, `{ deny: reason }`, `{ result }` |
| `tool.check` | Permission decision, after `tool.call` and `PreToolUse` hooks; `next(e)` = Claude Code's decision. Fields `e.input`, `e.agentId`, `e.ceiling` (v2.1.290+), `e.isReadOnly` (v2.1.304+) | `next(e)` or `{ decision: 'allow'|'ask'|'deny', reason? }` |
| `tool.describe` | A tool's description is first sent (again for MCP tools loaded via tool search) | `{ description, isDeferred? }` |

### Prompts and what Claude reads

| Event | Fires when | Return |
|---|---|---|
| `prompt.submit` | Prompt submitted | `next({ ...e, text })`, `next({ ...e, context })`, `{ drop: reason }` |
| `prompt.fill`, `prompt.suggest` | Text about to go into the prompt box as draft / dim suggestion | `next(e)` with changed text |
| `prompt.edit` | User edits the prompt box (hook limit 50 ms) | `next(e)` |
| `prompt.autocomplete` | A word ends at the cursor (`e.token`); not awaited | `{ suggestions: [{ text, label, description }] }` |
| `prompt.compose` | System prompt rendered | `{ sections: [{ id, text, scope }] }` |
| `prompt.section` | Each named system prompt section (`e.name`) | `{ text }` or `{ text: null }` to omit |
| `prompt.context` | Context for a conversation's first message | `{ blocks }` |
| `prompt.attachment` | Claude Code adds its own message (reminder…); `e.type`, `e.detail` | `{ text }` or `{ text: null }` |
| `prompt.mention` | An @-mentioned file is about to be read (v2.1.290+) | `next({ ...e, path })` or `{ deny }` |
| `skill.prompt` | A skill's text is expanded; `e.skill`, `e.text`, `e.source`, `e.pluginName`, `e.path`, `e.frontmatter`, `e.frontmatterProblem` (v2.1.299+) | `{ text }` (may pass changed `text`/`frontmatter` to `next`; changing other fields fails) |
| `attribution.text` | Commit/PR attribution text is composed | `{ text }` |

### Commands and configuration

| Event | Fires when | Return |
|---|---|---|
| `command.run` | A command is about to run (`e.command`, `e.args`) | `{ text }`, `{}`, `next(e)` |
| `command.describe` | Each command, for the list | `{ description, argumentHint, isHidden }` |
| `config.set` | A `/config` row is about to change | `next({ ...e, value })`, `{ deny }` |
| `config.describe` | Each `/config` row | `{ label, description, isHidden }` |
| `settings.read` | A mod's `$.settings.read`, or (v2.1.304+) Claude Code's own merge; `e.layers`, `e.source` | `next(e)`, `{ value }`, `{ deny }` |

### Turns

| Event | Fires when | Return |
|---|---|---|
| `turn.start` | A turn begins (`e.turnId`) | `next(e)` |
| `turn.step` | One model request is about to go out (`e.agentId` for subagents) | `yield* next(e)`, `next({ ...e, model })`, `next({ ...e, effort })` |
| `turn.complete` | A turn ended (`e.answer`, `e.durationMs`, `e.usage`, `e.isAborted`, `e.agentId`) | `next(e)` or `{ text }` (line under the answer) |

### Session

| Event | Fires when | Return |
|---|---|---|
| `session.start` | Per loaded mod before the first prompt, and after each reload of that mod; **not** after `/clear`, `/resume`, `/branch` | `next(e)` |
| `session.end` | Session ends, or `/clear`/`/resume`/`/branch`; `e.reason` `clear`/`resume`/`logout`/`prompt_input_exit`/`other` | `next(e)` |
| `session.compact` | Before compaction | `{ skip: reason }` |
| `session.receive` / `session.send` | Message arrives / is about to leave | `{ consumed: reason }` / `{ isDelivered: false, reason }` |
| `session.append` | Each conversation row before it's stored | `next({ ...e, message })` with changed text/tool_result content |
| `session.attach`, `session.detach` | Another app connects/disconnects | `next(e)` |
| `session.measure` | After each turn and when a plan limit's percent changes | `next(e)` |

### Subagents

| Event | Fires when | Return |
|---|---|---|
| `agent.offer` | A subagent type is offered to Claude | `{ isOffered: false }` |
| `agent.spawn` | A subagent/teammate is about to start (`e.isTeammate`), or a finished one resumes (`e.resume = { agentId }`, v2.1.299+) | `next({ ...e, model })` (ignored on resume), `{ deny }` |

### Interface

| Event | Fires when |
|---|---|
| `ui.render` | A render site is about to be drawn |
| `ui.resolve` | Mods load, once per app, site and mod (builds the element table) |
| `ui.press`, `ui.input`, `ui.select` | A mod's Button/Input/Select is used (`e.element` = key), before its callback |
| `ui.focus`, `ui.scroll` | Focused control / scroll position about to change |
| `ui.close` | A pane is about to close (`e.id`, `e.origin.kind` `plugin`/`person`/`unload`) |
| `ui.message` | A `Client` posts data to its mod |
| `ui.fault` | A `Client` failed (`e.phase` `load`/`render`/`run`, `e.reason`; v2.1.289+) |

### Other mods, telemetry, settings hooks, API calls

| Event | Fires when | Return |
|---|---|---|
| `plugin.register` | A hooks module is about to load (`e.tier`, `e.uses`) | `{ refuse: reason }` |
| `engine.create` | The mods API is being built for a mod | A changed API (add a namespace; non-`user` tiers may withhold one) |
| `telemetry.log`, `telemetry.mark` | A telemetry record / feature use; needs `{ to: 'collector' }` matcher in installed mods; not matched by `*` | `next(e)`, `{ deny }` |
| `classic.<Event>` | Each settings hook event; `e` = its stdin JSON | `next(e)` |
| `<namespace>.<method>` (e.g. `fs.read`, `model.complete`, `ui.open`) | Any later mod's mods API call | `next(e)`, `{ deny }`, `{ value }` |

## Mods API namespaces

| Namespace | Methods |
|---|---|
| `$.plugin` | `name`, `root` |
| `$.ui` | `resolve`, `invalidate`, `open`, `close`, `panes`, `focus`, `scroll`, `toast`, `notify`, `status`, `log`, `notice`, `ask`, `copy`, `selection`, `blit` |
| `$.command` | `register`, `run`, `list` |
| `$.tool` | `register`, `call`, `check`, `list` |
| `$.agent` | `register`, `spawn`, `list` |
| `$.model` | `complete`, `fork`, `classify` |
| `$.prompt` | `submit`, `read`, `fill`, `suggest`, `compose` |
| `$.turn` | `abort` |
| `$.session` | `messages`, `cwd`, `root`, `model`, `turns`, `id`, `repo`, `surfaces`, `usage`, `version`, `compact`, `send`, `append`, `authorize` |
| `$.config` | `list`, `set` |
| `$.settings` | `read` |
| `$.env` | `get`, `set` |
| `$.fs` | `read`, `write` (not atomic), `list`, `exists`, `stat`, `ancestors` |
| `$.store` | `get`, `set`, `delete`, `keys` (machine-wide, shared by sessions) |
| `$.state` | `get`, `set`; helpers `atom`, `read`, `update`, `derive`, `memberOf` from `claude-code` |
| `$.clock` | `now`, `sleep`, `after`, `every` |
| `$.http` | `fetch` |
| `$.process` | `run`, `spawn` |
| `$.mcp` | `call`, `connect` (servers in your own manifest) |
| `$.audio` | `play`, `speak` |
| `$.telemetry` | `log`, `mark` (sent only for Claude Code and built-in mods) |

## Render sites

| Site | `e.props` | `e.requestId` | Drawn on |
|---|---|---|---|
| `Pane` | `title`, `isFocused`, `bodyColumns`, `placement` (`dock`/`inline`), `scroll` (`offset`, `bodyRows`), `view` | Pane `id` | Terminal, Desktop, VS Code |
| `AbovePrompt` | `hasSurvey`, `isWorking`, `maxRows`, `bodyColumns`, `scroll`, `view` | One instance | Terminal, Desktop |
| `UserMessage` | `text`, `origin`, `isExpanded`, `task`/`from` | Message id | All three |
| `AssistantMessage` | Reply text | Message id | All three |
| `ToolUse`, `ToolResult`, `ToolGroup` | Tool name, input, result | Tool call id | All three |
| `CommandOutput` | `command`, `text` | Message id | Terminal, Desktop |
| `AskUserQuestion` | Question and options | Tool call id | All three |
| `ToolProgress` | `kind` | Tool call id | Terminal |
| `Spinner` | `word`, `message`, `suffix`, `mode` | Agent id | All three |
| `TurnDuration` | `word`, `durationMs` | Message id | Terminal |
| `InfoNotice` | `text`, `command` | Message id | Terminal |
| `SessionMode` | `modes` | One instance | Terminal, Desktop |
| `PromptHint` | `isDraft`, `isWorking`, `hint` | One instance | Terminal, Desktop |

`e.viewport`: `columns`, `rows` (whole window), `isFullscreen`; absent until measured in
terminal/Desktop, always present in VS Code.

## Element props, borders, spacing, typography

| Element | Main props | Term. | Desktop | VS Code |
|---|---|:-:|:-:|:-:|
| `Box` | `key`, flex layout, `gap`/`padding`/`margin`, `width`, `height`, `minWidth`, `minHeight`, `borderStyle`, `borderColor`, `borderDimColor`, `backgroundColor`, `position`, `top`, `left`, `right`, `bottom`, `overflow`, `display`, `hover` | ✓ | ✓ | ✓ |
| `Text` | `color`, `backgroundColor`, `bold` (deprecated), `italic`, `underline`, `strikethrough`, `dimColor`, `inverse`, `wrap`, `size`, `weight`, `mono`, `tabular`, `hover` | ✓ | ✓ | ✓ |
| `Button` | `key`, `label`, `children`, `onPress`, `hotkey`, `plain`, `dimColor`, `autoFocus`, `action`, `variant`, `role`, `hover` | ✓ | ✓ | ✓ |
| `Link` | `href`, `label` | ✓ | ✓ | ✓ |
| `Code` | `source`, `language`, `path`, `startLine`, `format`, `wrap` | ✓ | ✓ | ✓ |
| `Markdown` | `text`, `key`, `dimColor`, `onLinkPress`, `pressableLinks` | ✓ | ✓ | ✓ |
| `Input` | `key`, `label`, `placeholder`, `value`, `submitLabel`, `rows`, `onSubmit`, `onInput`, `autoFocus` | ✓ | ✓ | ✓ |
| `Select` | `key`, `label`, `options`, `value`, `onSelect`, `autoFocus` | ✓ | ✓ | ✓ |
| `Svg` | `source` (≤131,072 chars), `alt`, `width`, `height`, `isInteractive` | | ✓ | ✓ |
| `Client` | `module`, `key`, `props`, `width`, `height`, `flexGrow` | ✓ | ✓ | |
| `Raster` | `key`, `columns` ≤512, `rows` ≤256, `cells` | ✓ | | |
| `Image` | `key`, `source` (PNG/RGBA ≤2 MiB, or file), `columns`/`rows` ≤255, `alt` | ✓ | | |

`text` values: `wrap` is `'wrap'`, `'truncate'`, `'truncate-start'`, `'truncate-middle'`,
`'truncate-end'`.

`borderStyle`: `'single'` ┌─┐, `'double'` ╔═╗, `'round'` ╭─╮, `'bold'` ┏━┓, `'singleDouble'` ╓─╖,
`'doubleSingle'` ╒═╕, `'classic'` +-+, `'arrow'`, `'dashed'`, `'quote'` (▎ left bar). Any other
name (e.g. `'rounded'`) draws **no** border.

Spacing steps (v2.1.299+; older releases don't draw the tree): `xs` 1×0, `sm` 1×0, `md` 2×1,
`lg` 3×1, `xl` 4×2 (cells across × rows down). `gap`/`padding`/`margin` with a step apply both
axes.

Typography (v2.1.299+; older releases don't draw the tree): `size` (`caption`…`title`, ignored
in terminal/VS Code), `weight` (`regular`/`medium`/`semibold`/`bold`; semibold and bold draw
bold), `mono`, `tabular` (ignored in terminal/VS Code). Replace `bold: true` with
`weight: 'semibold'`; with both set, `bold` has no effect.

## Limits

| Limit | Value |
|---|---|
| A hook's own execution time per event (excl. time in `next` and API calls other than `$.clock.sleep`) | 10 s; `prompt.edit` 50 ms |
| `.catch` handler | 1 s |
| All `session.end` hooks together | SessionEnd hook budget (1.5 s default) |
| `$.process.run` timeout | 30 s default, 10 min max |
| `$.process.run` stdout/stderr | 4 MiB each (`isStdoutTruncated`/`isStderrTruncated`) |
| `$.model.complete` `maxTokens` | 1024 default, ≤64,000 or the model's limit |
| `$.fs.read` / `$.fs.write` | 4 MiB per file |
| `$.http.fetch` | Request body 4 MiB; response body 4 MiB (rejects if `Content-Length` declares more, except `HEAD`); 30 s total; 5 redirects |
| `drop` / `config.set` `deny` reason | 4,096 chars (cut from v2.1.292) |
| Text in one tree | First 100,000 chars drawn |
| `Code` `language`/`path`, `Select` option `value`, `Client` `module` | 10,000 chars (else hook fails) |
| `Link` `href` | 2,048 chars (else hook fails) |
| Tree nesting depth | 32 levels below root |
| Elements + text children per tree | 20,000 |
| `Raster` cells per tree | 262,144 |
| `Image` bytes per tree | 2 MiB |
| `$.store` | 4 MiB JSON total |
| `$.session.messages()` | Newest 4,096 entries |
| Redraws | 10/s; 30/s in terminal for visible pane, expanded band, hint line; extra calls coalesce |
| `$.ui.toast` | 4 s unless `{ timeoutMs }` (1–60000) |
| Unprompted pane placement | ≥144 columns (110 after the user opened it once) |
| Nesting of API call args / changed events / hook results | 28,000 levels (v2.1.299+) |
| Nested scopes per module file | 2,000 |
| Command, tool, subagent type, pane names | Letters, digits, `_`, `-`, ≤64 chars |
| One `claude plugin test` test | 5 s unless `timeoutMs` |

## Settings and environment variables

| Name | Where | Effect |
|---|---|---|
| `CLAUDE_CODE_PLUGIN_DIRS` | Env or `env` in `~/.claude/settings.json` | Dirs to load like `--plugin-dir` (absolute, `:`/`;` separated) |
| `CLAUDE_CODE_PLUGIN_DIR_WATCH` | Env | `1`: long-running non-interactive sessions reload on save |
| `prependPlugins`, `appendPlugins` | Managed (user only without managed settings and Team/Enterprise login) | Plugin ids run before/after users' mods |
| `allowManagedModsOnly` | Managed, guard option | Only org and built-in mods run hooks |
| `allowModsToOverrideDenyRules` | Managed, guard option | User mods may approve past `deny` rules |
| `allowManagedHooksOnly` | Managed | Blocks hooks and mods that aren't the org's |
| `disableAllHooks` | Any settings file | Managed: no mod/hook from installed plugins; user: org-managed keep running |
| `disableSideloadFlags` | Managed | Rejects `--plugin-dir`, `--plugin-url` |
| `pluginConfigs` | User or managed | `userConfig` values keyed by plugin id (`name@marketplace`, or `name@inline` for `--plugin-dir`) |

## Commands

| Command | Effect |
|---|---|
| `/plugin` | `N mod active · names` line; Installed tab lists mods, Built-in section, Errors tab |
| `claude plugin validate <dir> [--strict] [--json]` | Manifest + static analysis: errors, `hooks:`, `calls:`, env/state lines |
| `claude plugin test [dir]` | Runs `*.test.ts(x)`; exit 1 on failure |
| `claude --plugin-dir <dir>` | Load for one session with hot reload; repeatable |
| `claude --debug` / `--debug-file <path>` | Debug log |
| `/reload-plugins` | Reload plugins now |
| `--safe-mode`, `--bare` | Start without installed mods |

## Version gates

| Version | Adds |
|---|---|
| 2.1.286 | Mods in the Desktop app |
| 2.1.287 | Mods on by default in the terminal; `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` ignored |
| 2.1.289 | `ui.fault`; `idle`/`waiting` agent statuses |
| 2.1.290 | `prompt.mention`; `tool.check` `e.agentId`/`e.ceiling`; `result.serverToolUses` |
| 2.1.292 | Prompt/system as cache-block arrays; `next.error.kind = 're-entry'`; reason cut at 4,096 |
| 2.1.293 | `isDeferred` on registered tools; `mock.session` |
| 2.1.295 | `Button` with rich children |
| 2.1.299 | VS Code drawing; spacing steps; typography props; `skill.prompt` source fields; `agent.spawn` on resume; optional `types` field; nesting limits; guard note in `/plugin` |
| 2.1.300 | `next.error.cause = 'rewritten'` |
| 2.1.301 | Multi-row `Input` |
| 2.1.304 | `e.isReadOnly`; `settings.read` on Claude Code's own read and `e.layers`; `$.settings.read({ key })`; interruption handling of calls; VS Code without feature flags |
| 2.1.305 | `Image` in iTerm2 |
| 2.1.307 | `refused:` lines only for size limits |
| 2.1.309 | Model aliases in `turn.step` |
| 2.1.310 | `Image` inside tmux |

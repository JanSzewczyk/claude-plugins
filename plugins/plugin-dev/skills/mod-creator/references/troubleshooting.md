# Troubleshoot a mod

Source: https://code.claude.com/docs/en/plugins/mods/troubleshoot (checked against Claude Code 2.1.316).

A failing module or hook is **skipped silently** and the session continues, so a broken mod
looks like one that does nothing. Always start with the two checks below.

## Contents

- First two checks: `validate`, then find the skip line
- Where the failure line appears: transcript, debug log or stderr, by session kind
- Can mods load at all?: `claude plugin test` outside a mod, rollout switch, `disableAllHooks`
- Symptom → cause → fix: nothing appears; `hook skipped` / `was unloaded`; tool call denied;
  after Stop; drawing missing or unresponsive; edit or value lost
- Refusal messages: lines after `hooks module <name> not loaded:`
- Messages from the built-in guard: `allowManagedModsOnly`
- `settings.read` problems: `bypassed by cc-plugin-sec-default`, `merge never settles`,
  `refused to the engine`
- The debug log: how to write and filter it, what a loaded mod logs

## First two checks

1. `claude plugin validate ./my-mod` — catches a misspelled event, a bad manifest, a missing
   `modules` key, and static-analysis violations, with no session.
2. Find the one-line message Claude Code writes when it skips something (next section).

## Where the failure line appears

| Session | Where |
|---|---|
| Interactive with `--plugin-dir`, or hot reload enabled for Claude-written mods | Dim line in the transcript |
| Any other interactive session (e.g. installed from a marketplace) | Debug log only: start with `claude --debug` |
| `claude -p … --plugin-dir` | stderr (text output format); refusals by other mods only in the debug log |

Claude does not see transcript lines — the user must paste them.

## Can mods load at all?

Run `claude plugin test` in a directory with **no** mod:

| Output contains | Meaning |
|---|---|
| `no hooks module to load` | Mods can load |
| `hooks modules are turned off here` | `disableAllHooks` in user settings, or org policy |
| `…turned off in this process: the rollout switch served off` | Anthropic turned installed mods off remotely |
| `…the rollout switch was saved off by an earlier session` | Stale cached value: start `claude` once, retry |

`allowManagedModsOnly` isn't reported here; the guard's message says so at load.

## Symptom → cause → fix

### Nothing the mod adds appears

| Symptom | Cause | Fix |
|---|---|---|
| Version too old | Needs CLI v2.1.287+ / Desktop v2.1.286+ | `claude --version`, update |
| `/plugin` "mods active" line doesn't name it | Module didn't load | Debug log: `hooks module <name> not loaded: <reason>` → see refusal table |
| `validate` passes, no `hooks:` line | `hooks.json` has no (or misspelled) `modules` | Add `"modules": ["./register.ts"]` (or `.js`) |
| `<mod>: hooks module did not load: <reason>` | Top-level code threw / syntax error (reason gives file and line) | Fix it. If it ends `; the version loaded before is unloaded`, nothing runs now: fix, then `/reload-plugins` |
| `…options do not fit plugin.json userConfig: …` | A `userConfig` value fails validation or a required one is missing | Fix the value in `pluginConfigs` in settings |
| `code nested too deep to scan: more than 2000 scopes`, `the parser stopped`, `the engine ran out of stack loading/linking …` | Nesting too deep or import chain too long | Flatten the deepest code / shorten imports |
| No mod loads in a newly opened directory | Trust prompt not accepted | Start `claude` there and accept |
| No installed plugin loads | Started with `--safe-mode` | Start without it |
| Claude Code stopped asking to enable hot reload | Three unanswered prompts (e.g. `askUserQuestionTimeout`) | Copy the mod out of `~/.claude/dev-mods/…`, run with `--plugin-dir` |
| `/tally` missing from the command list | Module didn't load, or `$.command.register` threw (taken name) | validate; check `hook skipped` for `session.start` |

### A hook is skipped or the mod is unloaded

| Message | Cause | Fix |
|---|---|---|
| `<mod>: <event> hook skipped: <reason>` | Hook threw, exceeded 10 s own time, or returned the wrong shape (incl. an invalid `ui.render` tree). Shown once per event+kind until reload | Fix the error; debug log has every occurrence |
| `<mod> registered /x but no command.run hook answered it` | No `command.run` hook, matcher names another command, hook returned `next(e)`, or the hook was skipped (e.g. `$.ui.open({ focus: false })` throws) | Add/fix the hook; look for `hook skipped` on `command.run` |
| `<mod> was unloaded: it crashed the hooks worker` | A hook blocked the shared worker thread (e.g. a loop that never awaits) | Fix the hook |
| `hooks: mods that run in the hooks worker are off for this session: it crashed 3 times` | Repeated worker crashes not traceable to one mod; all non-built-in mods unloaded | `/reload-plugins` |
| `its session.start ran again in a fresh copy; the $.prompt.submit call … was not made again` | Module reloaded after a worker crash; Claude Code de-duplicated the call (v2.1.292+) | Nothing |
| `This mod's change didn't load, so the earlier version is still running: …` / `…no longer running: …` | A change to a Claude-written mod failed to load | Paste the line to Claude and ask for a fix |
| `$.agent.register refused: the hooks module that made the call is no longer loaded` | Call came from an old copy after a reload | Register agents in `session.start` |

### A tool call is denied

| Message | Cause | Fix |
|---|---|---|
| `a hook changed this call's input after the model wrote it` (or `…after auto mode reviewed it`) | Auto mode: a `tool.call`/`turn.step`/`PreToolUse` hook changed input after classifier review | Claude retries once as recorded; if a hook changes it every time, turn the mod off or leave auto mode |
| `tried to lift a deny rule in your settings` | Your `tool.check` allowed a call a `deny` rule refuses (guard loaded) | The call stays denied; org may set `allowModsToOverrideDenyRules` |
| `the deny rules in your settings could not be checked for this call, so it is refused` | Guard failed while checking a mod-approved call (fails closed) | — |

### After the user stops a turn

`Stopped: type a message to continue; a mod cannot resume work after Stop` — a mod tried to start
work after Esc. Nothing to fix; work resumes after the next message. Authors: see `api.md` →
Interruptions.

### A drawing doesn't appear or respond

| Symptom | Cause | Fix |
|---|---|---|
| Pane/band empty or shows Claude Code's usual content | Tree failed validation: `ui.render hook skipped: returned the wrong shape (a tree Pane refuses: …)` | Fix what the reason names; full text in debug log under `a hook returned a tree that does not validate` |
| `ui.render (<site>) refused: …` / `the chain settled on a tree that does not validate` | Tree exceeds a size limit (depth 32, 20,000 elements, …); `hooks:` prefix = several mods together | Return smaller trees; nested bands over 32 deep: `hooks: ui.render (AbovePrompt) refused: deeper than 32` |
| `<Input> needs a key`, `<Button> needs a key`, `is drawn twice; each takes its own key`, `key each once` (tests) | Missing/non-string/duplicate keys | Unique non-empty string `key` per control |
| `ui.render (<site>) threw while drawn: …; the engine drew its own` | A value in your tree or in props passed to `next` broke drawing | Fix that value |
| `Client client/x.js: the module failed without a message` | `throw new Error()` without message in a `Client` | Give the error a message |
| `$.ui.open` runs, no pane | Opened without a user action in a terminal under 144 (110) columns | Open from a command/button; check `isPlaced` |
| Another mod's band shows, yours doesn't | An earlier mod returned a tree without `await next(e)` inside a `Box` (or put size/position props on that Box) | Debug log: `answered ui.render without next()` names it; ask its author |
| Band shows `▸ plugin panel hidden` | User collapsed it | Ctrl+X Ctrl+A or click |
| Hotkeys do nothing | No focus (Ctrl+X Tab / click / `focus: true`), band collapsed, or VS Code (no hotkeys) | As listed |
| Works in terminal, not Desktop/VS Code | Site/element not drawn there; VS Code extension < 2.1.299 (or < 2.1.304 without feature flags) | Check `e.surface`, return a supported tree; update the extension |
| Toast missing | Debug log `$.ui.toast (<mod>): text` absent → look for `$.ui.toast dropped: <reason>` (e.g. bad `timeoutMs`); a pane with `holdToasts`; classic renderer shows it under the prompt; a newer toast replaced it (`gave way, cut short/unseen`); fullscreen draws max 3 (`left the stack, never drawn`) | Merge messages into one toast; drop `holdToasts` from persistent panes |

### An edit or a value is lost

| Symptom | Cause | Fix |
|---|---|---|
| Edits don't take effect | Editing an installed (cached) copy | Develop with `--plugin-dir` on the working copy |
| Value resets on reload | Module variables reinitialize | Use `$.state` or `$.store` |
| Value resets after `/clear`/`/resume`/`/branch` | `$.state` reset; `session.start` doesn't fire | Reload in `classic.SessionStart` with `source: ['clear','resume','fork']` |

A failed save during `--plugin-dir` development shows `reload failed, the previous version stays
loaded: <reason>`; the last working version keeps running until the next plugin reload.

## Refusal messages (module not loaded)

Each follows `hooks module <name> not loaded:` in the debug log (`<name>@inline` for
`--plugin-dir`):

| Message starts with | Meaning |
|---|---|
| `disableAllHooks in managed settings` | Org turned off hooks from installed plugins |
| `only managed plugins and built-in plugins run` | `allowManagedHooksOnly`, or `disableAllHooks` in a non-managed settings file |
| `installed plugins that are not managed load no hooks module in this mode (--bare)` | Started with `--bare` |
| `another plugin of that name loads first` | Name collision with another enabled plugin: rename |

Rollout-switch refusals (`…the rollout switch served off` / `…was saved off by an earlier
session`): see Can mods load at all?

## Messages from the built-in guard

| Message contains | Meaning |
|---|---|
| `mods are limited to your organization's by policy (allowManagedModsOnly)` | Only org mods may run; yours was refused |

The guard's two deny-rule messages are under A tool call is denied.

## `settings.read` problems

Returning permission rules or `env` from `settings.read` on Claude Code's own read has no effect
— use a settings file or `$.env.set`. Otherwise search the debug log for `settings.read`:

| Line | Meaning / step |
|---|---|
| `settings.read hook skipped` | Your hook failed; fix it |
| `settings.read bypassed by cc-plugin-sec-default` | Guard skips user mods on this event; ask admin to install it as an org mod |
| `settings.read: the answer for <key> is no value the key can hold` | A returned value doesn't fit the key's schema (yours or another mod's); that key keeps its merged value |
| `settings.read: the merge never settles for <key>` | Set those keys in a settings file |
| `<mod> answered settings.read without next()` | An earlier mod answered; your hook didn't run on that read |
| `settings.read: refused to the engine (engine: $.settings.read: <reason>)` | A hook denied Claude Code's own read; all hook values dropped. If the reason is yours, return `{ value }` when `next.origin` is the engine; otherwise turn mods off one at a time, each run with `claude --debug-file ./settings-read-N.log`, and search for `refused to the engine` |

## The debug log

```bash
claude --debug-file ./mod-debug.log --plugin-dir ./first-mod
tail -f ./mod-debug.log | grep first-mod
```

A loaded mod logs:

```text
hooks module first-mod@inline loaded (worker, environment 2, tier user); events: session.start,tool.call,command.run,ui.render
```

Write your own lines with `$.ui.log('message', { to: 'debug' })`. The log has a line for every
module loaded or refused, every hook failure, and every refused result.

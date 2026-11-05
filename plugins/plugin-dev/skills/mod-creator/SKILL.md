---
name: mod-creator
description: "Builds, changes, tests, debugs and audits Claude Code mods: plugins whose hooks/hooks.json lists \"modules\" (register.ts/.js) that run inside Claude Code to draw panes, a band above the prompt or toasts, restyle the spinner or tool rows, add /commands and tools, guard or rewrite tool calls and prompts, or enforce org policy; answers how mods work. Use when the mod should live in a folder the user owns, be tested or shared, or whenever a register.ts/.js or a hooks.json with \"modules\" is written or debugged: 'make a mod that…', 'show X above the prompt', 'why does my mod do nothing', 'audit this mod', 'is this mod safe to install', 'zrób moda', 'czemu mój mod nie działa', 'zrób audyt moda'. For a quick mod live in this session only, use plugin-authoring. NOT for settings.json hooks, a 'whenever X, block Y' rule a settings hook can express, or a statusLine command (update-config); other plugins and their skills, agents or MCP servers (plugin-creator), or marketplace manifests (marketplace-creator)."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(claude --version), Bash(claude plugin validate *), Bash(claude plugin test *), Bash(mkdir -p *), Bash(ls *)
argument-hint: "[what the mod should do | audit <path to a mod> | path to an existing mod | question about mods]"
---

# Mod Creator

A mod is a Claude Code plugin whose `hooks/hooks.json` lists a **hooks module** under `modules`.
The module exports `register(on)`; each `on(event, [matcher], async ($, e, next) => …)` is a
hook that runs in Claude Code's process *before* Claude Code acts, so it can observe, rewrite or
answer the event. Everything outside the module's own code goes through the mods API `$`.

This skill turns a request into a working, validated, tested mod in a directory the user owns,
loaded with `claude --plugin-dir`. The built-in `plugin-authoring` skill is the other way in:
it writes into the session's `~/.claude/dev-mods/<session-id>/` folder with hot reload in that
session only. Offer it when the user wants to see the mod live in the current session without
restarting; use this skill when the mod should last, be tested, or be shared.

Write mods in **TypeScript** (`hooks/register.ts`) unless the user asks for JavaScript: Claude
Code loads `.ts`, `.mts`, `.cts` and `.tsx` directly with no build step, and the tests are
TypeScript anyway. create.md → TypeScript has the details.

## Prerequisites

- `claude` CLI v2.1.287 or later (the Desktop app's bundled Claude Code needs v2.1.286). Check:
  `claude --version`. Update: `claude update`. The workflow uses `claude plugin validate`,
  `claude plugin test`, `claude -p` and `claude --plugin-dir`.
- No Node.js, bundler or `npm install`: the hooks module and its tests run inside Claude Code.

## Sources of truth, in order

1. The generated declarations `<mod>/.claude-plugin/types/claude-code/index.d.ts` (written when
   the mod is loaded with `--plugin-dir` in an interactive session). They describe the
   installed version exactly. **When they disagree with anything below, they win.**
2. `claude plugin validate <dir>` output: the `hooks:` and `calls:` lines are what Claude Code
   actually reads from the code.
3. The references in this skill (docs as of Claude Code 2.1.316). Check `claude --version`
   against the version gates in `references/reference.md` before using a newer feature.

## Knowledge base

Open only what the task needs:

| File | Open it when |
|---|---|
| [references/overview.md](references/overview.md) | Deciding whether a mod is the right tool (vs settings hook, skill, MCP), where mods run, trust, turning mods on/off, built-in and sample mods |
| [references/create.md](references/create.md) | Scaffolding a mod, TypeScript, the dev loop, generated types, the static-analysis rules `validate` enforces, sharing |
| [references/events.md](references/events.md) | Writing hooks: matchers, `tool.call`, `$.ui.ask`, `tool.check`, `prompt.submit`, turns, `settings.read`, `classic.*`, mod order, `.catch` |
| [references/api.md](references/api.md) | Using `$`: commands, tools, model calls and caching, timers, toasts/status/log/notify, `prompt.submit`, interruptions, session messages, files, processes, HTTP, settings, and where state lives (`$.state`, `$.store`) |
| [references/interface.md](references/interface.md) | Drawing: panes, the band, restyling built-in sites, elements and samples, keys and focus, redraws, VS Code differences |
| [references/testing.md](references/testing.md) | Writing `*.test.ts` files: stubs, kit rules, the stub table, timers, drawings, policy mods |
| [references/troubleshooting.md](references/troubleshooting.md) | A mod does nothing, a hook is skipped, a drawing is missing, a value is lost, or any error line from Claude Code |
| [references/admin.md](references/admin.md) | Org-wide mods, managed settings, the built-in guard, policy mods, reviewing a third-party mod |
| [references/reference.md](references/reference.md) | Looking up any event, API method, render site, element prop, limit, setting, command or version gate |
| [references/audit.md](references/audit.md) | Auditing an existing mod, own or third-party: the checklist, severities, verdict and report format |

## Progress list

**Your first tool call in this skill creates the task list, before any command below.** A mod run
writes files and loops through validation and tests, so the user needs to see where it stands.
Keep it current to the last step. A one-line announcement in chat does not replace it.

Use the task-list tool the session has: `mcp__ccd_turn__update_plan` in the Claude desktop app,
otherwise `TaskCreate` and `TaskUpdate`, or `TodoWrite`. Load it with `ToolSearch` first if it is
only listed as deferred. If the session has none of them, print the items as a Markdown checklist
and reprint it each time a step finishes.

Create it with these items, in the user's language:

```text
Frame the mod and agree on name and directory
Design the hooks and $ calls
Scaffold the plugin files
Write the hooks module
Validate with claude plugin validate
Test with claude plugin test
Hand over to the user
```

For debugging use `Find the error line` / `Look it up in troubleshooting.md` / `Fix, then
validate and test`; for an audit use `Inventory the mod` / `Validate with claude plugin
validate --strict` / `Review the code against the checklist` / `Run the tests` / `Report findings
and verdict`.

- **One item in progress at a time.** Finish it when its step ends, and start the next in the same update.
- **While waiting for the user,** say so in the item: `Frame the mod and agree on name and directory: waiting for your decision`.
- **Show the outcome when it isn't a plain success:** `Test with claude plugin test: 2 failing, stopped`. A finished item must not read as if the step succeeded.
- **A step that won't run** stays on the list with the reason (`Scaffold the plugin files: skipped, existing mod`), rather than being deleted.
- **Skills invoked along the way** use this same list and add no list of their own.

## Workflow

1. **Frame.** Restate the mod in one sentence: trigger events, what it shows or changes, which
   surfaces it must work on (terminal, Desktop, VS Code, `claude -p`). If a settings hook, a
   skill, a permission rule or an MCP server would do, say so and stop (overview.md → Mod vs
   settings hook vs skill vs MCP server). Run `claude --version`; if it is older than
   v2.1.287, stop and tell the user to update first. Agree on the plugin `name` (no `claude-`
   prefix: `validate` fails names that look like Anthropic's own) and the target directory;
   default to `~/mods/<name>`, or the repository the user names.
2. **Design.** List each hook as `event{matcher}` → observe / rewrite / answer, every `$` call,
   where state lives (variable, `$.state`, `$.store`), and for every hook that refuses
   something whether it must fail closed (`.catch`). Read the matching references now.
3. **Scaffold.** Create `.claude-plugin/plugin.json`, `hooks/hooks.json` with
   `"modules": ["./register.ts"]` (`./register.js` only when the user asks for JavaScript; one
   module per plugin, so a plugin that already has a mod needs a new plugin for another), the
   module, and `types/index.d.ts` only if the mod uses `$.state`. Templates: create.md;
   `types/index.d.ts`: api.md → Keeping state.
4. **Write the code** against the rules below.
5. **Validate.** Run `claude plugin validate <dir>`, fix every error, and run it again; repeat
   until it reports no errors and the `hooks:` and `calls:` lines match the design from step 2
   (a missing event means that hook never runs). Come back here after any change to the module
   in step 6.
6. **Test.** Write `tests/<name>.test.ts` covering each hook's main path and each refusal path
   (testing.md), run `claude plugin test` from the mod directory, fix until green. For a
   command, also run `claude -p "/<command>" --plugin-dir <dir> < /dev/null`.
7. **Hand over.** Tell the user to run `claude --plugin-dir <dir>` and what to try. List any API
   use you were unsure of, and say that once they have run it interactively,
   `.claude-plugin/types/claude-code/index.d.ts` exists and you can re-check those uses against
   it. Report what was verified (validate, tests, `-p` run) and what only a live session can
   show (drawings, focus, hotkeys). Mention sharing options (create.md) only if asked.

**Debugging** follows its own path: start from the exact line the user saw and look it up in
troubleshooting.md; when there is no line, ask for the output of
`claude --debug-file ./mod-debug.log --plugin-dir <dir>`. After the fix, run steps 5 and 6.

**Auditing** runs when the argument starts with `audit`, or the user asks whether a mod is
correct, robust or safe to install. Follow audit.md: inventory, `validate --strict`, the code
read against checklist A–H, the tests, then one report with ranked findings and a verdict. The
audit changes nothing. For the user's own mod, offer to fix the findings afterwards and do it
through steps 4–6; a third-party mod is never edited and gets no new tests, only an install
recommendation. After creating a mod, an audit is also the self-check before step 7.

## Rules that break mods silently

A module that violates the static analysis doesn't load, and a hook that fails is skipped
without stopping the session, so these matter more than style:

- Write every API call in full, `$.namespace.method(...)`. Never alias, destructure or index
  `$` (`const ui = $.ui` fails). Pass `$` only to functions declared at the top level of the
  same file.
- Event names in `on()` are string literals; never shadow `on` inside `register`; ES-module
  `import` declarations only, relative to the plugin, plus `claude-code`.
- No Node APIs and no `setTimeout`/`setInterval`: use `$.fs`, `$.process`, `$.http`, `$.clock`.
- `e` is deeply frozen: rewrite with `next({ ...e, field })`.
- Register commands and tools in one `session.start` hook (one hook per event per matcher).
  `$.command.register` throws on a taken name, which would skip the rest of the hook, so wrap
  each call in `try`/`catch` and report the clash with `$.ui.log`.
- Narrow every `ui.render` hook with a matcher and check `e.requestId` for panes; return
  `next(e)` for anything that isn't yours. Check `e.surface` before terminal-only elements
  (`Raster`, `Image`): Desktop and VS Code don't draw them.
- `focus`, `closeOnEscape`, `holdToasts`, `autoFocus` accept only `true` (passing `false`
  throws); omit them otherwise.
- Every `Input`/`Select`, and every `Button` without a unique label, gets a unique string `key`:
  tests, focus and other mods' `ui.press`/`ui.input` hooks find controls by key, and a missing
  or repeated key fails the tree.
- Hooks fail open. A guard on `tool.call`, `tool.check`, `prompt.submit`, `plugin.register` or
  `http.fetch` gets a `.catch` that refuses.
- Reloads reset module variables and stop timers; `/clear`, `/resume` and `/branch` reset
  `$.state` without a new `session.start`, so reload saved values in `classic.SessionStart`.
- `{ text }` from `command.run` and `deny`/`result` from `tool.call` are read by Claude: write
  them as information Claude can act on. `$.ui.log` lines are not read by Claude.
- Don't depend on `classic.*`, `prompt.section`, `skill.prompt` or `settings.read` in a mod
  meant for users at a company with managed settings: the built-in guard skips those hooks in
  user-installed mods.

## Reporting rules

How an audit report is laid out: verdict, scorecard, findings table, detail blocks and closing
lines. audit.md → Report format applies them to a mod audit.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 8 note(s) (sha256 4107a7fce56d); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| high | [List findings in one numbered table, worst first](references/rules.md#list-findings-in-one-numbered-table-worst-first) — Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on. | any |
| high | [Mark every status with the shared five-mark scale](references/rules.md#mark-every-status-with-the-shared-five-mark-scale) — 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike. | any |
| high | [Open an audit report with a verdict line that quotes the tool's own summary](references/rules.md#open-an-audit-report-with-a-verdict-line-that-quotes-the-tools-own-summary) — First line is the worst status, the count at each severity, and the checking tool's summary line as evidence. | any |
| medium | [Show a scorecard when the audit covers a fixed set of areas](references/rules.md#show-a-scorecard-when-the-audit-covers-a-fixed-set-of-areas) — One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line. | any |
| medium | [Give a detail block only to findings whose fix will not fit the table, at most five](references/rules.md#give-a-detail-block-only-to-findings-whose-fix-will-not-fit-the-table-at-most-five) — Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding. | any |
| medium | [Close an audit report with what was not checked and the one next step](references/rules.md#close-an-audit-report-with-what-was-not-checked-and-the-one-next-step) — A Not checked line names what the run could not see; a Next line says what the user does now. | any |
| medium | [Report a clean run as the heading and one line](references/rules.md#report-a-clean-run-as-the-heading-and-one-line) — When nothing was found, skip the scorecard, the table and any list of what passed. | any |
| low | [Write reports in GitHub-flavoured Markdown without HTML](references/rules.md#write-reports-in-github-flavoured-markdown-without-html) — Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour. | any |

<!-- END:knowledge -->

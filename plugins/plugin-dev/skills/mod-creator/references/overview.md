# Mods: what they are, when to use one, trust

Source: https://code.claude.com/docs/en/plugins/mods/overview (checked against Claude Code 2.1.316).

## Contents

- What a mod is
- Mod vs settings hook vs skill vs MCP server
- What a hook can do with an event
- Where mods run
- Installing, sample mods, built-in mods
- Trust: what a mod can reach
- Turning mods on and off

## What a mod is

SKILL.md gives the definition; this section covers the terms and what a mod can do.

In the mods docs, "hook" means a mod's handler. The shell/HTTP/prompt hooks configured in a
settings file are **settings hooks**; a mod can also handle them as `classic.<Event>` events.

A mod can do what the other extension points cannot, because it runs inside Claude Code:

- **Draw an interface**: a pane beside the transcript, a band above the prompt, with tabs,
  buttons and text fields.
- **Redraw Claude Code's own interface**: tool call rows, the spinner, messages, the question
  dialog (never the permission prompt).
- **Step into a tool call or a model request**: hold a call while asking the user, answer it
  without running the tool, send one request to another model.
- **Run code on a `/command`** with no Claude turn, even while Claude works (`immediate: true`).
- **Share data between hooks**: module-level variables are shared by all hooks in the file.

## Mod vs settings hook vs skill vs MCP server

| | Mod | Settings hook | Skill | MCP server |
|---|---|---|---|---|
| What it is | Functions Claude Code calls in its own process | Shell command / HTTP / prompt run on a lifecycle event | `SKILL.md` instructions Claude reads | External process giving Claude tools |
| Can change | Tool calls, prompts, commands, turns, the UI | Whether a call/prompt goes ahead, a call's args and result, added context | What Claude knows and does | Which tools Claude has |
| Draws UI | Yes | No | No | No |
| Written in | JS / TS | Script + `settings.json` entry | Markdown | Any language |
| Pick it when | You want a pane, band, custom command, or to rewrite an event | You block/allow/log with a script you already have | You keep pasting the same instructions | Claude must reach an external system |

One plugin can hold all four. Recommend a mod only when the request needs UI, in-process event
rewriting, a no-turn command, or shared state between hooks; otherwise point to the cheaper tool.

## What a hook can do with an event

Each hook gets `($, e, next)` and observes, rewrites or answers the event (events.md → The
middleware chain).

Everything outside the module's own code (draw, register a command, call a model, read a file,
run a process, fetch a URL) goes through `$`. That is why `claude plugin validate` can list
what a mod does without running it.

## Where mods run

| Where | Hooks run | Drawings appear |
|---|---|---|
| `claude` in a terminal (incl. IDE terminals, JetBrains plugin) | Yes | Yes |
| Desktop app Code tab (not WSL) | Yes | Yes, except terminal-only elements |
| Desktop app WSL session | No (no plugins in WSL) | No |
| VS Code extension chat panel | Yes | Yes from extension 2.1.299; 2.1.304 for sessions that don't fetch feature flags (Bedrock, Vertex, Foundry, gateways) |
| `claude -p`, Agent SDK | Yes | No |
| Remote Control from claude.ai/mobile | Yes, on your machine | In the terminal on your machine |
| Cloud session | Yes, if the plugin reaches the cloud session | No |

A drawing mod should check `e.surface` (`terminal`, `desktop`, `vscode`) and fall back to a
log line or a command's text reply where nothing draws.

## Installing, sample mods, built-in mods

- Install like any plugin: `/plugin install <name>@<marketplace>` or
  `claude plugin install <name>@<marketplace>`. After a shell install during an open session,
  run `/reload-plugins`.
- Sample mods (unsupported, complete plugins with READMEs):
  `github.com/anthropics/claude-code-playground/tree/main/claude-code/mods` — `token-weather`
  (context forecast above the prompt), `blast-radius` (holds risky shell commands with
  proceed/cancel buttons), `replay-theater` (`/replay` steps through last turn's edits).
- Built-in mods, listed under **Built-in** in `/plugin` → Installed, never in the `mods active`
  line, not stopped by `disableAllHooks`/`--bare`/`--safe-mode`:
  `cc-plugin-agents-md` (loads `AGENTS.md`), `cc-plugin-diff` (`/diff` pane),
  `cc-plugin-plugin-authoring` (the built-in `plugin-authoring` skill, no mod code),
  `cc-plugin-sec-default` (the built-in guard, can't be disabled by users), `cc-plugin-telemetry`,
  `cc-plugin-you-should-know`.
- Readable source of good, tested mods: `github.com/anthropics/claude-code/tree/main/mods` —
  `diff` (buttons bound to keybinding actions, own scrolling), `agents-md` (`userConfig`
  option), `sec-default` (policy mod model), `telemetry` (adds API methods for other mods and
  ships their types).

## Trust: what a mod can reach

A mod runs **unsandboxed with the user's permissions**. Once loaded it can read/write any file
the user can, start programs, make network requests, read env vars and settings (API keys),
see every prompt and tool call, rewrite them, submit prompts as the user, message other
sessions, approve tool calls before the user is asked, and spend usage via model calls. The
Bash sandbox does not cover processes a mod starts.

Approvals: with managed settings or a Team/Enterprise `/login`, a user's mod cannot approve
past `ask` rules or `PreToolUse` hooks (and not past `deny` rules unless the org sets
`allowModsToOverrideDenyRules`). Without either, a mod's `allow` can skip an `ask` prompt or a
blocking user `PreToolUse` hook.

Review before install: `claude plugin validate ./some-mod` prints `hooks:` (events handled)
and `calls:` (mods API methods used) without running anything. See `admin.md` for which calls
to look for.

## Turning mods on and off

- Version: terminal Claude Code **v2.1.287+**; Desktop app's bundled Claude Code **v2.1.286+**
  (`/status` → Claude Code row). Mods are on by default.
- One mod: disable or uninstall its plugin in `/plugin` → Installed.
- All installed mods for one session: `claude --safe-mode` (also disables other
  customizations).
- All installed mods everywhere: `"disableAllHooks": true` in `~/.claude/settings.json` (also
  stops settings hooks and custom status lines; org-managed ones keep running).
- `disableAllHooks` and `allowManagedModsOnly` stop only the mod; the rest of its plugin
  (skills, commands, agents, MCP servers) still loads.
- `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS` from early access is ignored from v2.1.287; remove it.
- Which mods loaded: `/plugin` shows a dim line such as `1 mod active · first-mod`.

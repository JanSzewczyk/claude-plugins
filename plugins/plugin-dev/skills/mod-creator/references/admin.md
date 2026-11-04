# Mods in an organization: managed settings, the built-in guard, policy mods

Source: https://code.claude.com/docs/en/plugins/mods/admin (checked against Claude Code 2.1.316).
## Contents

- Defaults and the built-in guard
- Hooks a user's mod can't run where the guard loads
- Controls that still apply
- Reviewing a mod before install
- Policy table (managed settings)
- Guard options
- Making a mod count as the organization's, and ordering it
- Writing a policy mod

## Defaults and the built-in guard

With no mod settings, mods are on (terminal v2.1.287+, Desktop v2.1.286+) and users can install them from any allowed
marketplace or load them with `--plugin-dir`.

`sec-default@builtin` (shown as `cc-plugin-sec-default`) is a built-in policy mod that runs
ahead of every user-installed mod when **either** the machine has managed settings **or** the
session uses a Team/Enterprise `/login` (not an API key, Bedrock/Vertex/Foundry without managed
settings, or `CLAUDE_CODE_OAUTH_TOKEN`). Users can't turn it off. It:

- Protects what the org manages: managed hooks' inputs and decisions, the system prompt,
  managed `CLAUDE.md`, what mods read as settings, managed MCP servers' tools and descriptions.
- Keeps permission rules and `PreToolUse` hooks above a user's mod: the mod can't approve past
  `deny` or `ask` rules or a blocking `PreToolUse` hook.
- Does **not** sandbox: the mod still acts as the user (`$.fs`, `$.process`, `$.http`). Permission
  rules like a denied `Read(.env)` don't apply to `$.fs.read`.
- In auto mode, a call a user's mod approves skips the classifier, except where the guard loads
  and the session uses `--permission-prompt-tool` or an SDK `canUseTool` callback.
- Fails closed: if it can't read managed settings, it refuses every user mod; if it can't check
  deny rules for a mod-approved call, it refuses the call.

Source: `github.com/anthropics/claude-code/tree/main/mods/sec-default`.

## Hooks a user's mod can't run where the guard loads

`classic.<Event>`, `prompt.compose`, `prompt.section`, `prompt.context`, `prompt.attachment`,
`skill.prompt`, `attribution.text`, `session.compact`, `settings.read`, and
`session.append{door=attachment|hook-context|compaction}`. Also passed over without a note:
`tool.describe` for org tools and the stored row of a skill's text. `/plugin` shows a note in
the plugin's details and **Errors** tab (v2.1.299+). To let them run: install the mod as the
org's, or remove the guard by omitting `sec-default@builtin` from `prependPlugins` (loses the
whole guard and its options).

## Controls that still apply

- Settings hooks (settings files and plugins' `hooks.json`) keep running.
- Managed `PreToolUse` hooks run before any mod's `tool.call`; if a mod rewrites the call,
  managed hooks run again on the rewritten call.
- Network: if org policy disallows WebFetch, every `$.http.fetch` is refused. Disabling the
  WebFetch tool (`CLAUDE_CODE_DISABLE_WEB_FETCH`, a `WebFetch` deny rule) does **not** stop
  `$.http.fetch`. `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` stops only built-in mods and
  fetches carrying Anthropic credentials. Nothing covers programs started with `$.process.run`.
- Plugin install restrictions (e.g. `strictKnownMarketplaces`) apply to mods.
- Mods can't change the permission prompt; trust prompts come first; `--safe-mode` disables
  installed mods, org ones included.

## Reviewing a mod before install

`claude plugin validate ./some-mod`:

```text
  ❯ ./register.js hooks: session.start, tool.call, ui.render{component=Pane}
  ❯ ./register.js calls: $.fs.read, $.http.fetch, $.store.set, $.ui.open
```

Claude Code refuses to load a mod whose API use this analysis can't read.

| In `calls:` | Means |
|---|---|
| `$.fs.read`, `$.fs.write` | Files anywhere the user can |
| `$.process.run`, `$.process.spawn` | Starts programs as the user |
| `$.http.fetch` | Network requests |
| `$.env.get`, `$.settings.read` | Reads env/settings (may hold API keys); `env reads:` names them |
| `$.env.set` | Changes env for Claude Code and everything it starts later; `env writes:` names them |
| `$.mcp.call` | Calls connected MCP tools |
| `$.model.complete` | Spends the user's plan/API key |
| `$.prompt.submit` | Submits prompts, possibly as the user's own words |
| `$.session.send` | Messages other sessions/subagents/teammates |

| In `hooks:` | Means |
|---|---|
| `tool.call`, `prompt.submit` | Sees and can change every tool call / prompt |
| `session.append` | Can rewrite stored conversation rows |
| `ui.render{component=AskUserQuestion}` | Can redraw the question dialog |
| `tool.check` | Can approve/deny tool calls before the prompt |

## Policy table (managed settings)

| Goal | Settings |
|---|---|
| No installed mod runs, settings hooks untouched | Guard option `allowManagedModsOnly`, no org mods |
| No mods and no hooks at all (managed hooks included) | `disableAllHooks: true` (also stops status lines, `/goal`) |
| Only the org's mods | `allowManagedModsOnly` + install org mods so they count as the org's (+ `disableSideloadFlags`) |
| Any mod from approved marketplaces | Marketplace restrictions + `disableSideloadFlags: true` |
| Any mod, with an org mod checking the others | Install the org mod; `prependPlugins: ["<org-mod>@<mkt>", "sec-default@builtin"]` |

- `allowManagedHooksOnly`: wider — only org and built-in mods load, and users' settings hooks
  are blocked too.
- `disableSideloadFlags`: rejects `--plugin-dir`, `--plugin-url`, `--agents`, `--mcp-config` and
  Claude-written mods.
- With only a marketplace allowlist, Claude-written mods load only if it includes `skills-dir`.
- Built-in mods ignore all of these; each has its own switch.

Complete "only our mods" example:

```json
{
  "extraKnownMarketplaces": {
    "acme-tools": { "source": { "source": "directory", "path": "/opt/acme/claude-plugins" } }
  },
  "enabledPlugins": { "acme-guard@acme-tools": true },
  "prependPlugins": ["acme-guard@acme-tools", "sec-default@builtin"],
  "pluginConfigs": {
    "cc-plugin-sec-default@builtin": { "options": { "allowManagedModsOnly": true } }
  },
  "disableSideloadFlags": true
}
```

Verify with `claude --debug`: the org mod's `hooks module` line has `tier prepend`; a user mod
logs `refused by cc-plugin-sec-default: mods are limited to your organization's by policy
(allowManagedModsOnly)`; `--plugin-dir` exits with `--plugin-dir is disabled by your
organization's managed settings (disableSideloadFlags)`.

## Guard options

Set only in **managed** settings under `pluginConfigs["cc-plugin-sec-default@builtin"].options`
(the same entry in user/project/local/`--settings` does nothing; `pluginConfigs` accepts only
that id form, while `prependPlugins` also accepts `sec-default@builtin`):

| Option | Unset | `true` |
|---|---|---|
| `allowManagedModsOnly` | Users' mods run | Only org and built-in mods run hooks |
| `allowModsToOverrideDenyRules` | Deny rules beat users' mods | A user's mod may approve a call a deny rule refuses |

If `prependPlugins` is set, it must name the guard or the guard (and its options) is gone.

## Making a mod count as the organization's, and ordering it

All must hold:

1. Managed `enabledPlugins` sets the plugin to `true`.
2. Managed settings name the marketplace as a **directory on the machine by absolute path**
   (`extraKnownMarketplaces` does this).
3. The marketplace lists the plugin by a **relative path**, so it loads in place.

Device management copies the marketplace directory to the same path everywhere, writable only
by admins. Plugins from GitHub/git/URL/npm sources are copied to the cache and count as a
**user's**, even if managed `enabledPlugins` enables them (`<id> is enabled by managed settings,
but…` in the debug log).

```text
/opt/acme/claude-plugins/
├── .claude-plugin/marketplace.json   # { "name": "acme-tools", "owner": {...}, "plugins": [{ "name": "acme-guard", "source": "./plugins/acme-guard" }] }
└── plugins/acme-guard/{.claude-plugin/plugin.json, hooks/hooks.json, hooks/register.js}
```

Order: `prependPlugins` (sees every event first, every result last; can skip users' mods with
`next.to(e, 'append')`) or `appendPlugins` (sees only what users' mods pass on). Both are read
from managed settings only (from user settings only on a machine with no managed settings and
no Team/Enterprise login). `tier user` plus `prependPlugins names …, which is not an enabled
managed plugin with a hooks module; skipped` means the conditions above aren't met.

## Writing a policy mod

`plugin.register` fires before each other mod loads, with `e.tier` (`prepend`, `user`, `append`,
`builtin`) and `e.uses` (what `validate` prints; calls as `namespace.method`, no `$.`). Return
`{ refuse: reason }` to keep it from loading. Hook any API call by name (`fs.write`,
`http.fetch`…) to audit or `{ deny }` it for later mods; `next.origin.plugin` names the caller.

```javascript
const BLOCKED_CALLS = ['process.run', 'process.spawn']

async function checkMod($, e, next) {
  const blocked = e.uses.calls.filter((call) => BLOCKED_CALLS.includes(call))
  if (e.tier === 'user' && blocked.length > 0) return { refuse: 'Acme policy: mods may not call ' + blocked.join(', ') }
  return next(e)
}

export function register(on) {
  // Fail closed: a check that throws or times out refuses user mods instead of admitting them
  on('plugin.register', checkMod).catch(async ($, e, next) => {
    if (e.tier !== 'user') return next(e)
    return { refuse: 'Acme policy check failed, so this mod was not loaded' }
  })

  on('tool.call', async ($, e, next) => {
    $.ui.log('audit tool.call ' + e.tool, { to: 'debug' })
    return next(e)
  })

  on('fs.write', async ($, e, next) => {
    // Quote the mod-chosen path so it can't pass for another log field
    $.ui.log('audit fs.write by ' + next.origin.plugin + ' ' + JSON.stringify(e.path), { to: 'debug' })
    return next(e)
  })
}
```

Refused users see `refused by acme-guard: <reason>` in the debug log. A policy hook on
`http.fetch` should also get a refusing `.catch`, since a failing hook fails open. A session can
still run without the policy mod after three worker crashes (until `/reload-plugins`) or with
`--safe-mode`. Test it with `tier('prepend')` (see `testing.md`).

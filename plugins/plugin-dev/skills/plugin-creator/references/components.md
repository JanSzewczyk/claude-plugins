# Plugin components

A plugin is built from components: skills, commands, agents, hooks, MCP servers, LSP servers, executables, default settings, themes, output styles, workflows, channels and monitors. Each has a default location in the plugin, an optional key in `.claude-plugin/plugin.json` that replaces, adds to or merges with that location, and a name the user sees. Use this page to add a component to a plugin that already loads (start with `create.md` if it doesn't), to ask users for configuration values, and to reference plugin files and persistent data without hard-coded paths.

After adding a component, run `/reload-plugins` in a running session (or start a new one). To check files before loading, run `claude plugin validate .` from the plugin directory.

## Contents

- [Component map](#component-map)
- [How to add a skill](#how-to-add-a-skill)
- [How to add a command (legacy format)](#how-to-add-a-command-legacy-format)
- [How to add a subagent](#how-to-add-a-subagent)
- [How to add a hook](#how-to-add-a-hook)
- [How to add an MCP server](#how-to-add-an-mcp-server)
- [How to add an LSP server](#how-to-add-an-lsp-server)
- [How to ship an executable](#how-to-ship-an-executable)
- [How to set default settings](#how-to-set-default-settings)
- [How to add a theme or an output style](#how-to-add-a-theme-or-an-output-style)
- [How to add a workflow](#how-to-add-a-workflow)
- [How to add a channel](#how-to-add-a-channel)
- [How to add a monitor](#how-to-add-a-monitor)
- [How to ask the user for configuration values](#how-to-ask-the-user-for-configuration-values)
- [How to reference plugin paths and store data](#how-to-reference-plugin-paths-and-store-data)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## Component map

| Component | Default location | Manifest key | Key vs. default | What the user sees |
| :- | :- | :- | :- | :- |
| Skills | `skills/<name>/SKILL.md` | `skills` | Adds to `skills/` | `/<plugin>:<name>` |
| Commands (legacy) | `commands/<file>.md` | `commands` | Replaces `commands/` | `/<plugin>:<file>` |
| Agents | `agents/*.md` (recursive) | `agents` | Replaces `agents/` | `<plugin>:<name>`, `@agent-<plugin>:<name>` |
| Hooks | `hooks/hooks.json` | `hooks` | Merges | Nothing; fires on events |
| MCP servers | `.mcp.json` | `mcpServers` | Merges (manifest wins on same name) | `plugin:<plugin>:<server>` in `/mcp` |
| LSP servers | `.lsp.json` | `lspServers` | Merges (manifest wins on same name) | Diagnostics and code navigation |
| Executables | `bin/` | none | n/a | Bare commands in the Bash tool |
| Default settings | `settings.json` | `settings` | File wins if it sets a supported key | Main-thread agent, subagent status line |
| Themes | `themes/<slug>.json` | `experimental.themes` | Replaces `themes/` | `/theme`, under the file's `name` |
| Output styles | `output-styles/<name>.md` | `outputStyles` | Replaces `output-styles/` | `/output-style` as `<plugin>:<name>` |
| Workflows | `workflows/*.js` | `workflows` | Replaces `workflows/` | `/<plugin>:<name>` |
| Monitors | `monitors/monitors.json` | `experimental.monitors` | Replaces the file | Notifications to Claude |
| Channels | none (manifest only) | `channels` | n/a | Messages from an outside system |

Every manifest path is relative to the plugin root, must start with `./`, must exist, and must resolve inside the plugin root. When a "replaces" key is set, the default folder isn't scanned; to keep it, list it: `"commands": ["./commands/", "./extras/"]`.

A complete layout using every default:

```text
deploy-tools/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── deploy/
│       └── SKILL.md
├── commands/
│   └── status.md
├── agents/
│   └── reviewer.md
├── hooks/
│   └── hooks.json
├── monitors/
│   └── monitors.json
├── output-styles/
│   └── terse.md
├── themes/
│   └── dracula.json
├── workflows/
│   └── release-audit.js
├── bin/
│   └── deploy-tool
├── scripts/
│   └── format.sh        # convention only; hooks reference it by path
├── settings.json
├── .mcp.json
└── .lsp.json
```

## How to add a skill

1. Create `skills/review/SKILL.md`:

   ```markdown
   ---
   description: Reviews a pull request for style and test coverage. Use when asked to review code.
   ---

   Review the changed files. Report style problems first, then missing tests.
   ```

2. Reload and run `/my-plugin:review`. Claude also loads it on its own when a request matches the `description`.

Naming: the command is `/<plugin>:<directory>`. A frontmatter `name` replaces the last segment; the plugin prefix stays. Frontmatter also controls whether Claude, the user or both can invoke it.

Other locations:

- **Extra directories**: list them in the `skills` key. They are scanned in addition to `skills/`.
- **One skill at the plugin root**: with no `skills/` directory and no `skills` key, a root `SKILL.md` loads as one skill. Set `name` in its frontmatter, otherwise a marketplace install names it after its cache directory.

## How to add a command (legacy format)

Prefer skills for new work; keep `commands/` for files moved from `.claude/commands/`.

1. Save `commands/<file>.md` (same frontmatter as a skill). It becomes `/<plugin>:<file>`; a subdirectory adds a segment, so `commands/db/migrate.md` is `/my-plugin:db:migrate`.
2. Or define a short command inline in `plugin.json` without a Markdown file:

   ```json
   {
     "name": "my-plugin",
     "commands": {
       "about": {
         "content": "Summarize what this repository does in three sentences.",
         "description": "Summarize the repository"
       }
     }
   }
   ```

   Each map value sets exactly one of `source` (path to a `.md` file) or `content`; optional fields are `description`, `argumentHint`, `model`, `allowedTools`. Setting `commands` stops the `commands/` scan.

## How to add a subagent

1. Create `agents/security-reviewer.md`:

   ```markdown
   ---
   name: security-reviewer
   description: Reviews code changes for security issues. Use after edits to authentication or input handling.
   model: sonnet
   ---

   You are a security reviewer. Read the changed files and report injection, authentication, and secrets-handling risks.
   ```

2. Reload. The agent is `my-plugin:security-reviewer`; the user can invoke it with `@agent-my-plugin:security-reviewer`.

Naming and layout:

- The name is `<plugin>:<name>`, with `<name>` from frontmatter `name` or else the file name.
- Subfolders load recursively and become name segments: `agents/review/security.md` is `my-plugin:review:security`. Frontmatter `name: audit` replaces only the file part (`my-plugin:review:audit`).
- A file listed in the `agents` key loads without subfolder segments: `"agents": "./custom/review/security.md"` is `my-plugin:security`. The `agents` key takes `.md` files only, not directories, and replaces the `agents/` scan.

Frontmatter in plugin agents:

- **Supported**: `name`, `description`, `model`, `effort`, `maxTurns`, `autoCompactWindow`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation` (only `"worktree"`), `color`, and `experimental.cacheTtl`.
- **Ignored**: `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`. Add hooks and MCP servers at plugin level instead.

## How to add a hook

1. Create `hooks/hooks.json`. The top-level `"hooks"` key wraps the same shape as `hooks` in `settings.json`:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Write|Edit",
           "hooks": [
             {
               "type": "command",
               "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/format.sh\""
             }
           ]
         }
       ]
     }
   }
   ```

2. Save the script at `scripts/format.sh` and make it executable.
3. Reload and ask Claude to edit a file. A `PostToolUse` hook that exits 0 shows nothing in the transcript; confirm it ran with hooks debug logging or by what the script changed.

Rules:

- **When they fire**: plugin hooks register when the session loads the plugin and fire on their events from then on, not only when one of the plugin's skills runs. Narrow the `matcher` to limit them.
- **Environment**: every hook process gets `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`, and `CLAUDE_PLUGIN_OPTION_<KEY>` for each user configuration value.
- **Quoting**: a `command` without `args` runs through a shell, so wrap `${CLAUDE_PLUGIN_ROOT}` paths in double quotes. With `args` (exec form) each element is one argument and needs no quoting.
- **Matching the plugin's own MCP tools**: use the full tool name `mcp__plugin_<plugin>_<server>__<tool>`. A matcher on the server name alone never fires.
- **Manifest key**: `hooks` takes a `.json` path, an inline event map (no `"hooks"` wrapper), or an array of either; it loads together with `hooks/hooks.json`. A hooks file referenced by path must keep the `"hooks"` wrapper.
- To write hooks as JavaScript modules that run inside Claude Code and draw UI, list them under a `modules` key in the same `hooks/hooks.json`; that makes the plugin a mod. Build mods with the mod-creator skill.

## How to add an MCP server

1. Create `.mcp.json` at the plugin root (same shape as a project `.mcp.json`; the `mcpServers` wrapper is optional):

   ```json
   {
     "mcpServers": {
       "db": {
         "command": "node",
         "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"]
       }
     }
   }
   ```

2. Reload and run `/mcp`. The server appears as `plugin:my-plugin:db`.

Names and behaviour:

- **Server name**: `plugin:<plugin>:<server>`. Use the same form in an `mcp_tool` hook.
- **Tool name**: `mcp__plugin_<plugin>_<server>__<tool>`, for example `mcp__plugin_my-plugin_db__query`. Use this in permission rules and hook matchers.
- **Substitution**: path variables are substituted in `command`, `args` and `env`. No quoting is needed in `args`.
- **Reload**: on `/reload-plugins`, an unchanged server keeps its connection, a changed one reconnects, a removed one disconnects. A reload that adds or removes MCP tools and would invalidate the prompt cache is held until you run `/reload-plugins --force`.
- **Manifest key**: `mcpServers` takes an inline map, a `.json` path, an MCPB bundle, or an array of those. A manifest server with the same name as one in `.mcp.json` replaces it.
- `claude plugin validate` reports a server entry that would be dropped at load as an error (v2.1.281 or later).

### Reach claude.ai and Cowork users

A local stdio server runs in Claude Code and in a local Cowork session in the desktop app, but not on claude.ai. To reach users there, reference a remote server by its `https://` URL, which claude.ai and Cowork offer as a connector.

### Ship a packaged MCPB server

1. Point `mcpServers` at a `.mcpb` (or older `.dxt`) file inside the plugin or at an `https://` URL:

   ```json
   {
     "name": "my-plugin",
     "mcpServers": "./servers/db.mcpb"
   }
   ```

2. The server takes its name from the bundle's own manifest. If that manifest declares a required `user_config` setting with no saved value, the server doesn't start and the **Errors** tab shows `Bundled MCP server "<name>" was not started: it needs configuration`.
3. Users supply values in `/plugin` (**Installed** tab, select the plugin, **Configure**) or at install with `claude plugin install ... --config <server>.<key>=<value>` (v2.1.285 or later, bundle packaged inside the plugin only).

## How to add an LSP server

Check first whether an official code intelligence plugin already covers the language; install that instead of writing one.

1. Create `.lsp.json` at the plugin root. It maps server names directly to configs, with no wrapper:

   ```json
   {
     "gopls": {
       "command": "gopls",
       "args": ["serve"],
       "extensionToLanguage": {
         ".go": "go"
       }
     }
   }
   ```

   `command` (the binary name, arguments in `args`) and `extensionToLanguage` (at least one extension, each starting with `.`) are required. Optional fields include `transport`, `env`, `initializationOptions`, `settings`, `workspaceFolder`, `startupTimeout`, `shutdownTimeout`, `requestTimeout` (default `60000`), `restartOnCrash` (default `true`), `maxRestarts`, `diagnostics` (default `true`). Unknown keys fail validation.

2. Make sure users have the binary on their `PATH`; the plugin configures the connection but doesn't install the server.
3. The `lspServers` manifest key takes the same map inline, a `.json` path, or an array; its servers add to `.lsp.json`, and a same-named manifest server replaces the file's.

Log to stderr. Stdout is read as protocol messages only (headers up to 64 KiB, body up to 32 MiB); exceeding either limit or writing non-protocol output disconnects the server, and the disconnect counts as a crash for `restartOnCrash` and `maxRestarts`.

## How to ship an executable

1. Add `bin/hello-plugin`:

   ```bash
   #!/bin/bash
   echo "hello from my-plugin"
   ```

2. `chmod +x bin/hello-plugin` and reload. While the plugin is enabled, `bin/` is on the Bash tool's `PATH`, so Claude (or a skill's instructions) can run `hello-plugin` as a bare command. PowerShell-tool commands outside the sandbox see it too; sandboxed PowerShell commands don't.

Plugin `bin/` entries come after the user's own `PATH`, so a plugin can't shadow `git`, `ls` or other system commands.

## How to set default settings

1. Add `settings.json` at the plugin root (or the same object inline in the `settings` key). Only `agent` and `subagentStatusLine` take effect; every other key is dropped.

   ```json
   {
     "agent": "security-reviewer"
   }
   ```

2. Start a session. The main conversation now runs with the `security-reviewer` agent's system prompt, tool restrictions and model.

Precedence:

- `settings.json` over the manifest's `settings`, when the file sets at least one supported key.
- The user's own settings over plugin defaults (plugin defaults are the lowest layer).
- Between two plugins setting the same key, the plugin loaded last wins; `claude --debug` logs `overrides setting`.

## How to add a theme or an output style

| Component | Save as | Format | Appears in | Manifest key |
| :- | :- | :- | :- | :- |
| Theme | `themes/<slug>.json` | Custom theme file format (as in `~/.claude/themes/`) | `/theme`, under the file's `name` | `experimental.themes` |
| Output style | `output-styles/<name>.md` | Custom output style with `name` and `description` frontmatter | `/output-style` as `<plugin>:<name>` | `outputStyles` |

1. Save the file at the location in the table.
2. Reload and pick it in `/theme` or `/output-style`.

Theme example, `themes/dracula.json`:

```json
{
  "name": "Dracula",
  "base": "dark",
  "overrides": {
    "claude": "#bd93f9",
    "error": "#ff5555"
  }
}
```

Output style example, `output-styles/terse.md`:

```markdown
---
name: terse
description: Answer in as few words as possible
keep-coding-instructions: true
---

Keep every reply short. Skip preambles and summaries.
```

Plugin themes are read-only; a user's edit in `/theme` is saved as a copy in their own themes directory.

## How to add a workflow

1. Save a `.js` file under `workflows/` with an exported `meta` block followed by a script body that orchestrates subagents.
2. Reload and run it: `workflows/audit-routes.js` below runs as `/my-plugin:audit-routes`.

```javascript
export const meta = {
  name: 'audit-routes',
  description: 'Audit every route handler for missing auth checks',
}

const found = await agent('List every .ts file under src/routes/.', {
  schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } },
})

const audits = await pipeline(found.files, file =>
  agent(`Audit ${file} for missing authentication checks.`, { label: file }),
)

return audits.filter(Boolean)
```

## How to add a channel

A channel lets an outside system (such as a chat app) send messages into a session. It is one of the plugin's MCP servers plus a `channels` entry bound to it.

1. Declare the MCP server in `mcpServers`.
2. Add a `channels` entry whose `server` names it, with any `userConfig` the channel needs:

```json
{
  "name": "my-plugin",
  "mcpServers": {
    "telegram": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.js"],
      "env": { "BOT_TOKEN": "${user_config.bot_token}" }
    }
  },
  "channels": [
    {
      "server": "telegram",
      "userConfig": {
        "bot_token": {
          "type": "string",
          "title": "Bot token",
          "description": "Telegram bot token",
          "sensitive": true
        }
      }
    }
  ]
}
```

`server` must match a key in `mcpServers`. The per-channel `userConfig` has the same shape as the top-level one; an optional `displayName` titles the configuration dialog.

## How to add a monitor

A monitor is a shell command that runs in the background for the session; what it prints reaches Claude as notifications.

1. Create `monitors/monitors.json`:

   ```json
   [
     {
       "name": "error-log",
       "command": "tail -F ./logs/error.log",
       "description": "Application error log"
     }
   ]
   ```

   `name`, `command` and `description` are required. Optional `when`: `"always"` (default, starts at session start and on plugin reload) or `"on-skill-invoke:<skill>"` (starts the first time that skill runs).

2. The command runs in a shell, in the session's working directory, with full user permissions and outside the sandbox.

Limits:

- Doesn't start in non-interactive mode (`-p`).
- On Amazon Bedrock, Claude Platform on AWS, Google Cloud's Agent Platform or Microsoft Foundry, or with `DISABLE_TELEMETRY` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` set, requires v2.1.310 or later.
- Gets path variables and `${ENV_VAR}`, never `${user_config.*}` (a monitor referencing one doesn't start) and no `CLAUDE_PLUGIN_OPTION_<KEY>`.
- Disabling the plugin mid-session doesn't stop running monitors; they stop when the session ends.
- `experimental.monitors` takes the array inline or a `.json` path and is read instead of `monitors/monitors.json`.

## How to ask the user for configuration values

1. Declare options under `userConfig` in `plugin.json`:

   ```json
   {
     "name": "my-plugin",
     "userConfig": {
       "api_url": {
         "type": "string",
         "title": "API URL",
         "description": "Base URL of your team's API"
       },
       "api_token": {
         "type": "string",
         "title": "API token",
         "description": "Token for your team's API",
         "sensitive": true
       }
     }
   }
   ```

   Keys are letters, digits and underscores, not starting with a digit. Required per option: `type` (`string`, `number`, `boolean`, `directory` or `file`), `title`, `description`. Optional: `required`, `default`, `options` (fixed picker for a non-`multiple`, non-`sensitive` `string`; v2.1.271 or later), `multiple`, `sensitive`, `min`/`max`.

2. Reference saved values:
   - `${user_config.KEY}` in MCP and LSP server config, exec-form hook `args`, and skill and agent content (sensitive values become a placeholder in skill and agent content).
   - `CLAUDE_PLUGIN_OPTION_<KEY>` (uppercased key) in the environment of hook processes, for example `$CLAUDE_PLUGIN_OPTION_API_TOKEN`.

3. Know where users get asked. The dialog opens for unset options when the user installs in `/plugin`, runs `/plugin install <plugin>@<marketplace>` in a session, or enables the plugin from the **Installed** tab. `/plugin configure <plugin>@<marketplace>` reopens it. The VS Code extension shows a form after install. `claude plugin install` in the shell never prompts; use `--config KEY=VALUE` at install, or `claude plugin configure <plugin>@<marketplace> --values-stdin < values.json` afterwards (`configure` needs the full id as `claude plugin list` shows it, not a bare name).

Storage: non-sensitive values go under `pluginConfigs` in the user's `settings.json`; `sensitive: true` masks input and stores the value in the platform's secure credential store.

## How to reference plugin paths and store data

You don't know where the plugin will be installed, so use these variables. They are substituted in skill, command and agent content, hook and monitor commands, and MCP and LSP configs, and exported to hook, MCP and LSP processes:

| Variable | Resolves to | Use it for |
| :- | :- | :- |
| `${CLAUDE_PLUGIN_ROOT}` | The plugin's install directory; changes with each version | Bundled scripts, binaries, config. Never write state here |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/<id>/`, created on first reference, kept across updates | `node_modules`, virtual environments, caches |
| `${CLAUDE_PROJECT_DIR}` | The project root | Project-local scripts and config |

`<id>` is the plugin identifier with every character other than letters, digits, `_` and `-` replaced by `-` (`my-plugin@my-marketplace` becomes `my-plugin-my-marketplace`).

These variables are not in the environment of commands Claude runs through the Bash tool. In skill, command and agent content, write `${CLAUDE_PLUGIN_ROOT}` in the Markdown body so it is substituted when the content loads.

### Install dependencies into the data directory

Marketplace installs already install eligible Node.js package dependencies when the plugin is cached. When you need to do it yourself, this `SessionStart` hook installs `node_modules` into `${CLAUDE_PLUGIN_DATA}` on first run and again when `package.json` changes:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
          }
        ]
      }
    ]
  }
}
```

An MCP server can then set `NODE_PATH` to `${CLAUDE_PLUGIN_DATA}/node_modules` in its `env`.

## Best practices

- Write instructions as skills, not a root `CLAUDE.md`, because a plugin's `CLAUDE.md` is never loaded as context.
- Use a hook, not a skill, for a rule that must hold every time (such as blocking edits to protected files), because a skill loads only when Claude matches its description to the task.
- Give every skill a specific `description`, because Claude decides when to load the skill from it.
- Prefer skills to `commands/` for new work, because a skill runs by name the same way and can carry supporting files.
- Narrow hook `matcher`s, because plugin hooks fire on every matching event once the plugin loads, not only when its skills run.
- Prefer exec-form hooks with `args`, or double-quote `${CLAUDE_PLUGIN_ROOT}` in shell form, because an unquoted path with spaces splits into several words and `claude plugin validate` warns about it.
- Use full `mcp__plugin_<plugin>_<server>__<tool>` names in matchers and permission rules, because shorter forms never match.
- Mark tokens and passwords `"sensitive": true`, because that masks input and keeps the value out of `settings.json`.
- Use `userConfig` instead of asking users to edit `settings.json`, because Claude Code then prompts for each value in a dialog and stores it in the right place.
- Store state, dependencies and caches in `${CLAUDE_PLUGIN_DATA}`, because `${CLAUDE_PLUGIN_ROOT}` changes with every update.
- Set `name` in the frontmatter of a root `SKILL.md`, because otherwise a marketplace install names the skill after its cache directory.
- Install an official code intelligence plugin before writing your own LSP config, because it already covers the language.
- Send LSP server logs to stderr, because non-protocol stdout disconnects the server.
- Reference a remote `https://` MCP server if claude.ai or Cowork users must reach it, because local stdio servers don't run on claude.ai.
- Avoid a top-level `bin/` if the plugin must install on claude.ai or Cowork, because they refuse plugins that have one.
- Avoid `userConfig` `options` if users may be on older versions, because users before v2.1.271 can't load a plugin that declares them.

## Pitfalls

| Symptom | Cause and fix |
| :- | :- |
| `claude plugin validate` warns `CLAUDE.md at the plugin root is not loaded as project context` | Move the instructions into a skill |
| `Default <folder>/ folder is ignored because the manifest sets "<key>"` | A "replaces" key (`commands`, `agents`, `outputStyles`, `workflows`, `experimental.themes`, `experimental.monitors`) is set, so the folder isn't scanned. List the folder in the key, or point the key at files inside the folder |
| **Errors** tab shows `<component> path escapes plugin directory: <path>`; validate reports `Path contains ".." which could be a path traversal attempt` | A manifest path resolves outside the plugin root. Keep every path inside it |
| **Errors** tab shows `<component> path not found: <path>`; validate reports `Path not found` | The path doesn't exist. Manifest paths must also start with `./` (`commands/foo.md` fails validation) |
| A hooks file referenced from the manifest doesn't load | The file lacks the top-level `"hooks"` wrapper. Inline manifest hooks take no wrapper; files do |
| Hook matcher on the plugin's MCP server never fires | Matchers need the full tool name `mcp__plugin_<plugin>_<server>__<tool>` |
| A hook's script path breaks on paths with spaces | Shell-form `command` with unquoted `${CLAUDE_PLUGIN_ROOT}`. Wrap it in double quotes or switch to `args` |
| A component referencing `${user_config.*}` fails instead of running | Shell-form hook commands, monitor commands and MCP `headersHelper` reject it. Use exec-form `args` or read `CLAUDE_PLUGIN_OPTION_<KEY>` in hooks; monitors and `headersHelper` must obtain the value themselves |
| Hooks from `hooks/hooks.json` missing | Another enabled plugin has the same name; only one of them registers its `hooks/hooks.json`. `/plugin` shows a note |
| Agent frontmatter `hooks`, `mcpServers`, `permissionMode` or `initialPrompt` has no effect | Ignored in plugin agents. Declare hooks and MCP servers at plugin level |
| Agent named after its file, description `Agent from my-plugin plugin` | Frontmatter didn't parse, so every field was ignored. Run `claude plugin validate` to find the file |
| Agent named after its file despite a frontmatter `name` | The `name` is longer than 256 characters and is ignored |
| `Invalid LSP server config for ".lsp.json"` in the **Errors** tab | One entry is invalid, so the whole file is skipped. `claude plugin validate` doesn't read `.lsp.json`, so check each entry by hand |
| `claude --debug` logs `LSP server <name> failed to start` | The binary isn't on the user's `PATH` |
| **Errors** tab warns `LSP server "<name>" is not used for <ext> files` | Two enabled servers claim the same extension; the first registered wins |
| `Bundled MCP server "<name>" was not started: it needs configuration` | A required MCPB `user_config` setting has no value. Configure it via `/plugin` **Configure** or `--config` |
| Monitor doesn't start | Running with `-p`, it references `${user_config.*}`, or it needs v2.1.310 on the listed providers or env settings |
| Path variables empty in commands Claude runs | They aren't exported to the Bash tool. Write `${CLAUDE_PLUGIN_ROOT}` in the skill body so it is substituted at load |
| Plugin `settings.json` key ignored | Only `agent` and `subagentStatusLine` take effect; a user's own setting also overrides the plugin's |

## Sources

- https://code.claude.com/docs/en/plugins/components
  - `#explore-the-plugin-directory`, `#skills`, `#commands`, `#agents`, `#hooks`, `#mcp-servers`, `#lsp-servers`, `#executables`, `#default-settings`, `#themes-and-output-styles`, `#channels`, `#monitors`, `#user-configuration`, `#path-variables-and-persistent-data`
- Cross-checked against https://code.claude.com/docs/en/plugins/manifest-reference (`#fields`, `#component-path-forms`, `#path-rules`, `#user-configuration`, `#environment-variables`, `#standard-layout`) and https://code.claude.com/docs/en/plugins/cli-reference (`#plugin-configure`, `#reload-plugins`)

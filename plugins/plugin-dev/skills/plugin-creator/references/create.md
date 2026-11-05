# Create a plugin

A plugin is a directory of skills, agents, hooks, MCP servers and other components, plus an optional manifest at `.claude-plugin/plugin.json` that names it. Claude Code loads the directory as one unit, so you can share it with teammates, install it in several projects, or publish versioned releases. Keep a standalone setup under `.claude/` while it serves one project or only you; make a plugin once you want to share or version it. This page covers building the first plugin, running it without a marketplace, debugging it, and converting an existing `.claude/` setup. For every component type see `components.md`; for depending on other plugins see `dependencies.md`.

## Contents

- [How to create a minimal plugin](#how-to-create-a-minimal-plugin)
- [How to lay out the plugin directory](#how-to-lay-out-the-plugin-directory)
- [How to load a plugin for one session (no marketplace)](#how-to-load-a-plugin-for-one-session-no-marketplace)
- [How to make a plugin load in every session](#how-to-make-a-plugin-load-in-every-session)
- [How to convert an existing .claude/ setup](#how-to-convert-an-existing-claude-setup)
- [How to debug a plugin that doesn't behave](#how-to-debug-a-plugin-that-doesnt-behave)
- [How to share the plugin](#how-to-share-the-plugin)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to create a minimal plugin

The smallest useful plugin has one skill. No component is required.

1. Create the plugin directory with its `.claude-plugin/` folder:

   ```bash
   mkdir -p my-first-plugin/.claude-plugin
   mkdir -p my-first-plugin/skills/hello
   ```

2. Write the manifest at `my-first-plugin/.claude-plugin/plugin.json`:

   ```json
   {
     "name": "my-first-plugin",
     "description": "A greeting plugin to learn the basics",
     "version": "1.0.0",
     "author": {
       "name": "Your Name"
     }
   }
   ```

   | Field | Notes |
   | :- | :- |
   | `name` | Required. Becomes the prefix of every skill and agent (`/my-first-plugin:hello`). No spaces, `@`, `:` or path separators; use kebab-case |
   | `description` | Text users see for the plugin in `/plugin` |
   | `version` | Optional. Setting it keeps users on that version until you change it |
   | `author` | `name` required inside it; `email` and `url` optional |

   Every other field is in the manifest reference (see Sources).

3. Add the skill at `my-first-plugin/skills/hello/SKILL.md`:

   ```markdown
   ---
   name: hello
   description: Greet the user with a friendly message
   disable-model-invocation: true
   ---

   Greet the user warmly and ask how you can help them today.
   ```

   `disable-model-invocation: true` means Claude doesn't run the skill on its own; remove it if you want Claude to pick the skill up when the task matches.

4. Validate:

   ```bash
   claude plugin validate ./my-first-plugin
   ```

   Success prints the checked manifest path and `✔ Validation passed`. On `✘ Validation failed`, each line above the verdict names a field to fix.

5. Run it:

   ```bash
   claude --plugin-dir ./my-first-plugin
   ```

   Then in the session: `/my-first-plugin:hello`.

The resulting layout:

```text
my-first-plugin/
├── .claude-plugin/
│   └── plugin.json      # only the manifest goes here
└── skills/
    └── hello/
        └── SKILL.md
```

## How to lay out the plugin directory

Each component type has a fixed default location under the plugin root (the directory you pass to `--plugin-dir`). Create only the ones you use.

| Location | Contents |
| :- | :- |
| `.claude-plugin/plugin.json` | The manifest. Without one, a `--plugin-dir` plugin is named after its directory |
| `skills/` | One `<name>/SKILL.md` directory per skill |
| `commands/` | Flat Markdown files, the older form of skills. Use `skills/` for new plugins |
| `agents/` | One Markdown file per subagent |
| `hooks/hooks.json` | A top-level `"hooks"` key whose value has the same shape as `hooks` in a settings file |
| `.mcp.json` | MCP server definitions |

The full list (LSP servers, monitors, themes, output styles, workflows, `bin/`, `settings.json`) is in `components.md`.

## How to load a plugin for one session (no marketplace)

None of these write anything to your settings. After editing plugin files during the session, run `/reload-plugins`.

- **A directory or `.zip`**: repeat the flag for several plugins.

  ```bash
  claude --plugin-dir ./my-first-plugin --plugin-dir ./other-plugin.zip
  ```

- **A folder of plugins** (Claude Code v2.1.265 or later): `claude --plugin-dir ./plugins`. If the folder has no `.claude-plugin/` and no components at its top level, each immediate subfolder with a `.claude-plugin/plugin.json` loads as its own plugin; everything else is skipped silently. In an interactive session, subfolders you add later load once their manifest exists, and removed ones unload. A folder that also holds `.claude-plugin/marketplace.json` (but no `plugin.json`) still works on v2.1.281 or later; the marketplace file is not read.
- **A `.zip` from a URL**, such as a CI build artifact:

  ```bash
  claude --plugin-url https://example.com/my-first-plugin.zip
  ```

  Repeat the flag or pass several URLs space-separated in one quoted value. If the fetch fails or the archive is invalid, Claude Code starts without it and records the error in the `/plugin` **Errors** tab.
- **From the environment**, when you can't add a flag (v2.1.280 or later): list absolute paths in `CLAUDE_CODE_PLUGIN_DIRS`. These load in addition to any `--plugin-dir` plugins. Project and local settings can't set this variable.

A plugin loaded this way is session-only. It appears as `<name>@inline`, and when it shares a name with an installed plugin, the session-only copy wins for that session.

## How to make a plugin load in every session

A folder under `~/.claude/skills/` that contains `.claude-plugin/plugin.json` is a skills-directory plugin and loads at session start with no flag and no install step (unless managed settings block it).

1. Scaffold one:

   ```bash
   claude plugin init my-tool
   ```

   It creates `~/.claude/skills/my-tool/` with `.claude-plugin/plugin.json` and a root `SKILL.md`, and prints `✔ Created plugin "my-tool" at ~/.claude/skills/my-tool` followed by the id it loads as (`my-tool@skills-dir`). Run `/reload-plugins` to load it in the current session.

2. Optional flags: `--with <components...>` scaffolds starter files for `skills`, `agents`, `hooks`, `mcp`, `lsp`, `output-style` or `channel` (for example `claude plugin init my-helper --with skills hooks`); `--description <text>`, `--author <name>`, `--author-email <email>`; `-f, --force` overwrites an existing `.claude-plugin/`. `new` is an alias for `init`. There is no flag for another location.

3. Naming: the root `SKILL.md` is also a personal skill, so it runs as `/my-tool`, not `/my-tool:my-tool`. Skills under the plugin's `skills/` get the prefix, such as `/my-tool:example`.

4. To stop loading it, delete the directory or run `claude plugin disable my-tool@skills-dir`.

To make a plugin load for everyone working in one repository, create the same layout yourself at `<project>/.claude/skills/<name>/`, including `.claude-plugin/plugin.json`.

## How to convert an existing `.claude/` setup

Run these from the project root (the directory that contains `.claude/`).

1. Create the plugin and its manifest `my-plugin/.claude-plugin/plugin.json`:

   ```bash
   mkdir -p my-plugin/.claude-plugin
   ```

   ```json
   {
     "name": "my-plugin",
     "description": "Migrated from standalone configuration",
     "version": "1.0.0"
   }
   ```

2. Copy each configuration directory you have, skipping any you don't:

   ```bash
   cp -r .claude/commands my-plugin/
   cp -r .claude/agents my-plugin/
   cp -r .claude/skills my-plugin/
   ```

   Run `ls -a my-plugin` and check each directory sits next to `.claude-plugin`.

3. Move hooks: if `.claude/settings.json` or `.claude/settings.local.json` has a `hooks` object, create `my-plugin/hooks/hooks.json` and paste that object under a top-level `"hooks"` key. The format is unchanged:

   ```json
   {
     "hooks": {
       "PostToolUse": [
         {
           "matcher": "Write|Edit",
           "hooks": [{ "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix" }]
         }
       ]
     }
   }
   ```

4. Test: `claude --plugin-dir ./my-plugin`, then check each component under its new name. A skill that was `/deploy` is now `/my-plugin:deploy`; an agent `reviewer` is now `my-plugin:reviewer`; trigger each hook's event.

5. Once confirmed, delete the originals from `.claude/` and remove the `hooks` object from the settings file.

## How to debug a plugin that doesn't behave

Work through these in order:

1. `claude plugin validate <path>` in your shell. It checks the manifest and the frontmatter of every skill, agent and command file. Exit `0` on `Validation passed` (or `Validation passed with warnings`), `1` on `Validation failed`, `2` when the validator itself failed. Add `--strict` to fail on warnings; `--json` for a machine-readable report.
2. `/reload-plugins` in the session. It prints one `Reloaded:` summary line with counts. Then type the `/plugin-name:skill` command to confirm the skill loaded.
3. `/plugin` in the session. The **Installed** tab shows the components found; the **Errors** tab shows what failed to load and why.
4. `claude plugin list` in your shell. Session-only and skills-directory plugins appear in their own sections with `Status: ✔ loaded` or the load error. For a plugin under development, put the flag first: `claude --plugin-dir ./my-plugin plugin list`.
5. A skills-directory plugin that `claude plugin list` doesn't print at all, with no error anywhere, is likely blocked by managed settings.

For specific components:

- **MCP server**: run `/mcp`; a healthy server is listed as connected.
- **Hook**: trigger the event it matches (for example ask Claude to edit a file for a `PostToolUse` hook), then read the hooks debug log for which hooks matched, their exit codes and output.
- **Behaviour**: a plugin can load cleanly and still not steer Claude. `claude plugin eval` runs test cases with and without the plugin and scores the difference; see `evals.md`.

## How to share the plugin

- **A few people**: hand over the directory or a `.zip`; nothing needs to be published. See `publish.md`.
- **Your own marketplace**: teammates add it once, install by name and receive updates. See `publish.md` and marketplace-creator → `references/create.md`.
- **Anthropic's directory**: after review it reaches claude.ai, Cowork and Claude Code through the user's account. See `publish.md`.

## Best practices

- Run `claude plugin validate` before every load or commit, because it catches manifest, frontmatter and path errors before a session hides them in the **Errors** tab.
- Use `claude plugin validate <path> --strict` in CI, because the default run passes with warnings that the runtime tolerates.
- Write new components as skills under `skills/`, not `commands/`, because skills supersede commands and can carry supporting files.
- Keep only `plugin.json` inside `.claude-plugin/`, because anything else saved there doesn't load.
- Iterate with `--plugin-dir` plus `/reload-plugins`, because it needs no marketplace, writes nothing to settings and picks up edits without a restart.
- Point `--plugin-url` only at archives you control or trust, because the archive is downloaded and loaded at startup.
- Use kebab-case names without `claude`, `anthropic` or `official` in them, because `claude plugin validate` errors or warns on names that pass as Anthropic's own, and `claude plugin init` and `claude plugin tag` refuse the reserved ones.
- Decide deliberately whether to set `version`, because setting it keeps users on that version until you bump it; see marketplace-creator → `references/maintain.md` for release strategy.
- Delete the `.claude/` originals after a conversion, because duplicate hooks run twice.
- Check behaviour with evals, not just loading, because a plugin that loads without errors can still fail to change what Claude does (`evals.md`).

## Pitfalls

| Symptom | Cause and fix |
| :- | :- |
| **Errors** tab shows `<component> path not found: <path>` (for example `commands path not found`) | A component path in the manifest (`commands`, `skills`, `agents`, `hooks`) points at nothing. Fix the path or create the directory, then `/reload-plugins` |
| `--plugin-dir` at a marketplace root loads nothing from `plugins/`, with no error | `--plugin-dir` doesn't read `marketplace.json`. Point it at one plugin's folder, or add the marketplace |
| Plugin loads but its skills are missing | `skills/` is inside `.claude-plugin/`, or a `skills` manifest entry points at a file. Move `skills/` to the plugin root and point each entry at a directory containing `SKILL.md` |
| The `userConfig` dialog never appears | `--plugin-dir` and `claude plugin install` in the shell never show it. With the plugin loaded, run `/plugin configure <plugin-name>` in the session (the components page writes it as `/plugin configure <plugin>@<marketplace>`; `claude plugin configure` in the shell needs the full id `claude plugin list` shows) |
| A `.mcp.json` at `~/.claude/.mcp.json` doesn't load | The plugin root is the plugin's own directory, not `~/.claude/` |
| A hook runs twice after conversion | The same hook is still in `.claude/settings.json`. Hooks have no prefix, so both copies fire. Remove the settings copy |
| Skills and agents appear twice after conversion | Expected while originals remain: `/deploy` and `/my-plugin:deploy` both exist. Delete the originals |
| A plugin in a `--plugin-dir` folder of plugins doesn't load | Its subfolder lacks `.claude-plugin/plugin.json`; such folders are skipped without an error |
| `--plugin-dir` or `CLAUDE_CODE_PLUGIN_DIRS` rejected at startup | Managed settings (`disableSideloadFlags`) turn them off; Claude Code exits `1` without starting |
| `claude plugin list` doesn't show the plugin you're developing | Session-only plugins appear only when the flag precedes the subcommand: `claude --plugin-dir ./my-plugin plugin list` |
| `version` doesn't pin the plugin | It doesn't for a `command` source, a marketplace hosted on claude.ai, or a plugin loaded in place from a marketplace added from a local path |

## Sources

- https://code.claude.com/docs/en/plugins/create
  - `#create-your-first-plugin`, `#plugin-layout`, `#develop-without-a-marketplace`, `#test-and-debug`, `#convert-an-existing-claude-setup`
- Cross-checked against https://code.claude.com/docs/en/plugins/cli-reference (`#plugin-init`, `#plugin-validate`, `#flags-that-load-a-plugin-for-one-session`) and https://code.claude.com/docs/en/plugins/manifest-reference (`#fields`, `#name`, `#version`)

# Create a marketplace

A plugin marketplace is a directory or git repository with a `.claude-plugin/marketplace.json` file that lists plugins and where to fetch each one. Users register it once with `claude plugin marketplace add` and then install any plugin it lists as `<plugin>@<marketplace>`. Build one when a group you choose (a team, an organization) should install your plugins and keep receiving your updates from a catalog you control. For a single plugin shared with a few people, send the directory or a `.zip` instead; for a plugin meant for everyone, submit it to Anthropic's directory (see plugin-creator → `references/publish.md`). To build the plugins themselves, see plugin-creator → `references/create.md` and plugin-creator → `references/components.md`.

## Contents

- [How to lay out the marketplace directory](#how-to-lay-out-the-marketplace-directory)
- [How to write marketplace.json](#how-to-write-marketplacejson)
- [How to add a plugin entry](#how-to-add-a-plugin-entry)
- [How to choose a plugin source](#how-to-choose-a-plugin-source)
- [How to keep unused submodules out of the clone](#how-to-keep-unused-submodules-out-of-the-clone)
- [How to validate the marketplace](#how-to-validate-the-marketplace)
- [How to test the marketplace locally](#how-to-test-the-marketplace-locally)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to lay out the marketplace directory

The directory that contains `.claude-plugin/` is the **marketplace root**. Every relative plugin source resolves from it, not from `.claude-plugin/`.

1. Create the root, its `.claude-plugin/` folder, and a `plugins/` folder, then copy a plugin in:

   ```bash
   mkdir -p my-marketplace/.claude-plugin my-marketplace/plugins
   cp -r my-first-plugin my-marketplace/plugins/
   ```

2. Validate the plugin where it now sits, so any later error is about the marketplace and not the plugin:

   ```bash
   claude plugin validate ./my-marketplace/plugins/my-first-plugin
   ```

   The last line reads `✔ Validation passed`.

Keep the file at `.claude-plugin/marketplace.json`. If it lives elsewhere in the repository, users must declare the marketplace in `extraKnownMarketplaces` with `path` set on its source, because `claude plugin marketplace add` has no option for it.

## How to write marketplace.json

1. Save `my-marketplace/.claude-plugin/marketplace.json`. `name`, `owner` (with `owner.name`), and `plugins` are required:

   ```json
   {
     "name": "my-marketplace",
     "description": "Plugins for my team",
     "owner": {
       "name": "Your Name"
     },
     "plugins": [
       {
         "name": "my-first-plugin",
         "source": "./plugins/my-first-plugin",
         "description": "A greeting plugin to learn the basics"
       }
     ]
   }
   ```

2. Pick a marketplace `name` that other authors are unlikely to use: a user can't register two marketplaces with the same name. Allowed characters are letters, digits, `.`, `_` and `-`, starting with a letter or digit, with no `..`.
3. Avoid reserved names. Official names such as `claude-plugins-official`, names that imitate them (for example `official-claude-plugins`, `claude-plugins-v2`, any non-ASCII name), other spellings of a reserved name (`claude.code.plugins`), `inline`, `builtin`, `skills-dir`, `synced`, `claude-plugin-test`, `npm`, `pip`, `uv`, `cargo`, `github`, `gh`, names starting with `claudeai-`, and JavaScript member names such as `constructor` are all refused. Most of these fail `validate` (for example `Marketplace name impersonates an official Anthropic/Claude marketplace`); the exact official names pass it and are refused only at `marketplace add`. The full list is in the marketplace reference.
4. Add `description`: `claude plugin validate` warns when it is missing.

Other top-level keys Claude Code reads:

| Key | Purpose |
| :- | :- |
| `$schema` | JSON Schema URL for editor autocomplete; ignored at load time |
| `version`, `metadata.description`, `metadata.version` | Marketplace manifest version and alternate location for `description`/`version` |
| `metadata.pluginRoot` | Directory that bare plugin source names resolve under (v2.1.239+) |
| `forceRemoveDeletedPlugins` | Uninstall plugins you remove from `plugins` (see `maintain.md`) |
| `allowCrossMarketplaceDependenciesOn` | Marketplaces whose plugins may be installed as dependencies (see plugin-creator → `references/dependencies.md`) |
| `renames` | Former plugin name → current name or `null` (see `maintain.md`) |

Claude Code ignores unknown keys instead of rejecting them, so a typo loads silently. Only `claude plugin validate` reports it, as a warning.

## How to add a plugin entry

Each plugin is one object in `plugins`. `name` and `source` are required.

1. Set `name` to the same value as the `name` in the plugin's own `.claude-plugin/plugin.json`.
   - The **entry name** is the install id (`<entry-name>@<marketplace>`), what `claude plugin list` shows, and the key written under `enabledPlugins`.
   - The **manifest name** is the prefix on the plugin's skills and the name `claude plugin details` takes.
   - If they differ and someone installs by the manifest name, Claude Code reports `Plugin "<manifest-name>" not found in marketplace "<marketplace>"`.
2. Set `source` (see the next section). For a plugin inside the marketplace, write a path from the marketplace root that starts with `./`, uses forward slashes, and never contains `..`.
3. Set `description`: it is the line users see next to the plugin in `/plugin`.
4. Optionally set other fields: `displayName`, `category`, `tags`, `strict`, `relevance` (`relevance.md`), `dependencies`, `defaultEnabled`, `metadata` (free-form, never read by Claude Code, v2.1.222+), and `headers`/`headersHelper` for archive downloads.

How entry fields combine with `plugin.json`:

- **No `plugin.json` in the fetched plugin**: the entry is the manifest.
- **`plugin.json` present**: `plugin.json` is the manifest. Entry `mcpServers`, `lspServers`, `userConfig` and `channels` don't apply; declare them in `plugin.json`. With `strict: true` (default) the entry's component fields (`commands`, `agents`, `skills`, `hooks`, `outputStyles`, `themes`) are appended; with `strict: false` any of them is a conflict and the plugin fails to load.
- **Display fields** (`displayName`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`): the entry's value wins where set; otherwise users see the `plugin.json` value. Before install, Claude Code can read `plugin.json` only for relative-path entries, so for any other source set the display fields on the entry.
- **Entry `hooks`**: write them as an inline object. A file path or array passes `validate`, but the hooks never run and the plugin reports `not yet supported in a marketplace entry`.

## How to choose a plugin source

Pick the source by where the plugin's files are stored.

| Source | Use it when | Fields | Minimal value |
| :- | :- | :- | :- |
| Relative path | Plugin files are inside the marketplace directory | the string itself | `"./plugins/my-first-plugin"` |
| `github` | The plugin is its own GitHub repository | `repo`, `ref`, `sha` | `{ "source": "github", "repo": "your-org/my-first-plugin" }` |
| `url` | A git repository on any host, by full URL (`https://`, `http://`, `file://`, `git@`; no `owner/repo` shorthand) | `url`, `ref`, `sha` | `{ "source": "url", "url": "https://gitlab.example.com/your-group/formatter.git" }` |
| `git-subdir` | A subdirectory of another repository, such as a monorepo (sparse checkout, partial clone where the host supports it) | `url`, `path`, `ref`, `sha` | `{ "source": "git-subdir", "url": "your-org/monorepo", "path": "tools/my-first-plugin" }` |
| `npm` | An npm package; install scripts never run | `package`, `version`, `registry` | `{ "source": "npm", "package": "@your-org/formatter" }` |
| `archive` | A zip over HTTPS, for users without git access (v2.1.224+) | `url`, `sha256` | `{ "source": "archive", "url": "https://artifacts.example.com/formatter-2.0.0.zip" }` |
| `command` | A tool on the user's machine produces the plugin directory (v2.1.229+) | `command`, `timeout`, `mode` | `{ "source": "command", "command": "my-tool claude-plugin-path" }` |

### How to add a plugin from a git subdirectory

1. Add an entry whose `source` is `git-subdir`. `url` takes a full git URL or `owner/repo` shorthand; `path` is the plugin's subdirectory:

   ```json
   {
     "name": "formatter",
     "source": {
       "source": "git-subdir",
       "url": "https://github.com/your-org/monorepo.git",
       "path": "tools/formatter"
     }
   }
   ```

2. Optionally pin it: `ref` is a branch or tag (defaults to the default branch); `sha` is a full 40-character lowercase commit SHA. With both set, Claude Code checks out `sha`.
3. Install it once yourself: a wrong `url` or `path` shows up only at install, never in `validate`.

Use `git-subdir` only for another repository. For a subdirectory of the marketplace repository itself, use a relative path.

### Shorter relative paths with pluginRoot

With `"metadata": { "pluginRoot": "./plugins" }`, a bare name such as `"source": "formatter"` resolves to `./plugins/formatter`. A source that contains a `/` (`team-a/formatter`) is not a bare name and still needs `./`.

## How to keep unused submodules out of the clone

When someone adds the marketplace, Claude Code clones it and fetches only the submodules that hold plugin files (v2.1.295+; earlier versions fetch every submodule).

1. Put each plugin in a subdirectory. Submodules inside the plugin's directory, or one that contains it, are fetched; others are not.
2. For a plugin at the root (`"source": "./"`), know that one reference into any submodule fetches all of them. Move it into a subdirectory if the repository has a large submodule only your build uses.
3. When a root plugin runs a file from a submodule, write the path literally in the hook or server configuration, such as `${CLAUDE_PLUGIN_ROOT}/vendor/tool/run.sh`. Claude Code can't see a path a script builds at runtime.

## How to validate the marketplace

1. After every edit, run in your shell:

   ```bash
   claude plugin validate ./my-marketplace
   ```

   Add `--strict` in CI to fail on warnings, `--json` for a machine-readable report (v2.1.259+). Exit codes: `0` passed (with or without warnings), `1` failed, `2` the validator itself failed.
2. Read what it checks: JSON syntax (`json: Invalid JSON syntax: <reason>`), required fields (`owner: Invalid input`), naming rules, `..` in a relative source, unknown fields (warnings), and each relative-path plugin's `plugin.json` (`plugins[N] plugin.json → <field>: <message>`).
3. Validate each plugin directory separately as well. From a marketplace directory, `validate` doesn't open the skill, agent, command, or hook files of plugins listed in other directories.

## How to test the marketplace locally

1. Register the directory:

   ```bash
   claude plugin marketplace add ./my-marketplace
   ```

   Expect `✔ Successfully added marketplace: my-marketplace (declared in user settings)`. The exact official marketplace names, such as `claude-plugins-official`, pass `validate` and are refused only here, with a message starting `The name '<name>' is reserved for official Anthropic marketplaces`.
2. Install a plugin by `<entry-name>@<marketplace-name>`:

   ```bash
   claude plugin install my-first-plugin@my-marketplace
   ```

   Expect `✔ Successfully installed plugin: my-first-plugin@my-marketplace (scope: user)`. Remote sources are fetched now, so a wrong `repo` or `path` fails here.
3. Confirm it loaded: `claude plugin list` shows `Status: ✔ enabled`; `claude plugin details my-first-plugin` shows the `Component inventory`.
4. Start a session and run a plugin skill, for example `/my-first-plugin:hello`.
5. Iterate. With a marketplace added from a local directory and relative-path sources, Claude Code reads the plugin files in place: edits take effect at the next session start or after `/reload-plugins`, with no `version` change. Users of the hosted marketplace get a cached copy instead (see `maintain.md`).
6. To start over, run `claude plugin marketplace remove my-marketplace`. It also uninstalls the marketplace's plugins and deletes their options, secrets and data where it can; use `claude plugin marketplace update` to refresh without losing them.

In a session, `/plugin marketplace add ./my-marketplace` registers the marketplace the same way, and `/plugin install my-first-plugin@my-marketplace` opens the plugin's details in the `/plugin` panel.

## Best practices

- Keep the entry `name` identical to the `plugin.json` `name`, because installs by the other name fail with `not found in marketplace`.
- Write relative sources from the marketplace root with a leading `./`, because the root, not `.claude-plugin/`, is where paths resolve.
- Run `claude plugin validate` after every edit and also install from the marketplace yourself, because validation and installation catch different problems.
- Validate each plugin directory on its own, because a marketplace run doesn't open plugin component files.
- Choose a distinctive marketplace `name` before you push, because users can't register two marketplaces with the same name and the name is what they type after `@`.
- Always set `description` on the marketplace and on each entry, because users browse by it and `validate` warns when the marketplace one is missing.
- Set display fields on the entry for non-relative sources, because Claude Code can't read their `plugin.json` before install.
- Pin `github`/`url`/`git-subdir` sources with `sha` when you need a reproducible install, because `ref` alone follows the branch or tag.
- Pin every `archive` source with `sha256`, because Claude Code then refuses a changed download.
- Keep plugins in subdirectories rather than at the root of a repository with submodules, because a root plugin can pull every submodule into each clone.
- Use `validate --strict` in CI, because Claude Code silently ignores unknown keys at load time.

## Pitfalls

| Symptom | Cause | Fix |
| :- | :- | :- |
| `validate` reports `Path contains "..": ./../plugins/my-first-plugin` | Path written from `.claude-plugin/` instead of the root | Write `./plugins/<name>` |
| `validate` passes, install fails with `Source path does not exist: <path>` | Relative source points at a missing directory; `<path>` is the absolute location checked | Fix the path or move the plugin |
| `plugins.i.source: Invalid string: must start with "./"` | Relative source without `./` (and not a bare name under `metadata.pluginRoot`) | Prefix with `./` |
| `plugins.i.source: Invalid input` | Unknown source type, or a required field missing (for example `github` without `repo`) | Check the source table |
| `Plugin "<manifest-name>" not found in marketplace "<marketplace>"` | Entry name and `plugin.json` name differ | Make them the same |
| `Duplicate plugin name "x" found in marketplace` | Two entries share a `name` | Rename one |
| `The name '<name>' is reserved for official Anthropic marketplaces` on add | One of the exact official names; `validate` lets those pass (it does fail impersonating and other reserved names) | Rename the marketplace |
| `Plugin <name> has conflicting manifests: both plugin.json and marketplace entry specify components` | `strict: false` entry declares component fields while `plugin.json` exists | Drop the component fields or use `strict: true` |
| Entry hooks never run, plugin reports `not yet supported in a marketplace entry` | Entry `hooks` written as a path or array | Inline object, or move hooks into the plugin's `hooks/hooks.json` |
| A misspelled key has no effect | Unknown keys are ignored at load | Read the `Unknown field 'x'. Claude Code ignores it at load time.` warning |
| Clone is slow or times out | Large submodule fetched for a root plugin | Move the plugin into a subdirectory |
| Edits don't reach other users | They have a cached copy; local in-place loading only applies to you | Release a new version (`maintain.md`) |

## Sources

- https://code.claude.com/docs/en/plugins/create-marketplace — `#create-a-marketplace`, `#add-plugin-entries`, `#rules-for-plugin-entries`, `#keep-unused-submodules-out-of-the-clone`, `#choose-a-plugin-source`, `#validate-and-test`, `#host-your-marketplace`
- https://code.claude.com/docs/en/plugins/marketplace-reference (cross-check) — `#marketplace-file`, `#reserved-names`, `#top-level-fields`, `#plugin-entries`, `#strict-mode`, `#plugin-sources`, `#validation-messages`
- https://code.claude.com/docs/en/plugins/cli-reference (cross-check) — `#plugin-validate`, `#plugin-marketplace-add`, `#plugin-marketplace-remove`

# Plugin dependencies

A plugin dependency is another plugin yours relies on, such as one whose MCP server or skill it calls. You declare dependencies in the `dependencies` array of `.claude-plugin/plugin.json`; Claude Code installs missing ones with your plugin. Without a version constraint, a dependency follows whatever its marketplace publishes, so a release that renames a tool you call breaks your plugin on the next update. With a semantic-version range such as `~2.1.0`, users stay on releases you have tested. You need this page when your plugin calls into another plugin, when you publish a bundle of plugins for a team, or when you maintain a plugin that others constrain and must tag its releases. (For npm and Bun packages your plugin's own code needs, see the Node.js package dependencies section of the plugin loading docs instead.)

## Contents

- [How to declare a dependency](#how-to-declare-a-dependency)
- [How to bundle plugins for a team](#how-to-bundle-plugins-for-a-team)
- [How to depend on a plugin from another marketplace](#how-to-depend-on-a-plugin-from-another-marketplace)
- [How to test a plugin and its dependency locally](#how-to-test-a-plugin-and-its-dependency-locally)
- [How to tag releases others can depend on](#how-to-tag-releases-others-can-depend-on)
- [How to constrain a dependency with a non-git source](#how-to-constrain-a-dependency-with-a-non-git-source)
- [How to check what a constraint resolved to](#how-to-check-what-a-constraint-resolved-to)
- [How dependencies behave for your users](#how-dependencies-behave-for-your-users)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to declare a dependency

1. Add a `dependencies` array to `.claude-plugin/plugin.json`:

   ```json
   {
     "name": "deploy-kit",
     "version": "3.1.0",
     "dependencies": [
       "audit-logger",
       { "name": "secrets-vault", "version": "~2.1.0" }
     ]
   }
   ```

2. Choose the entry form:

   | Form | Meaning |
   | :- | :- |
   | `"audit-logger"` | Plugin from the same marketplace as yours, at whatever version that marketplace provides |
   | `"audit-logger@other-marketplace"` | Same, resolved in another marketplace; subject to the cross-marketplace allowlist |
   | `{ "name": "...", "marketplace": "...", "version": "..." }` | Object form; all values are strings. Needed to set a version constraint |

   Object fields:

   | Field | Required | Description |
   | :- | :- | :- |
   | `name` | Yes | The dependency's plugin name as it appears in its marketplace entry. Looked up in your plugin's marketplace unless `marketplace` is set |
   | `version` | No | A semantic-version range such as `~2.1.0`, `^2.0`, `>=1.4` or `=2.1.0`. Installs the highest git tag that satisfies it, so the dependency must have tagged releases |
   | `marketplace` | No | Another marketplace to resolve `name` in; subject to the cross-marketplace allowlist |

3. To accept pre-releases such as `2.0.0-beta.1`, opt in with a pre-release suffix in the range, such as `^2.0.0-0`. Plain ranges don't match pre-releases.

4. To upgrade a constrained dependency, test against the newer release, then publish a new version of your plugin with a wider range. With `~2.1.0` on a git-backed source, users keep receiving `2.1.x` patches and never move to `2.2` until you do.

## How to bundle plugins for a team

A manifest needs only `name`, so a plugin that is just a `dependencies` list is valid; installing it installs every dependency.

1. Publish a bundle plugin in your (internal) marketplace:

   ```json
   {
     "name": "backend-standard",
     "version": "1.0.0",
     "description": "Standard plugin set for backend engineers",
     "dependencies": [
       "secrets-vault",
       "deploy-kit",
       { "name": "db-migrate", "version": "^3.0" },
       "oncall-runbook"
     ]
   }
   ```

2. Engineers run one `claude plugin install` for the bundle instead of one per plugin.
3. To add a plugin to the set later, publish a new bundle version with the extra dependency. If the marketplace doesn't auto-update by default, engineers either turn on auto-update for it, or run `claude plugin update backend-standard` in a shell and then `/reload-plugins` in an open session to install the added dependencies.
4. To roll a bundle out to a whole organization, an administrator adds it to `enabledPlugins` in managed settings. See marketplace-creator → `references/relevance.md`.

## How to depend on a plugin from another marketplace

By default Claude Code won't install a dependency from a marketplace other than your plugin's own, unless the user already has it installed and enabled at the same scope. This stops one marketplace from silently pulling in plugins from a source the user hasn't reviewed.

1. In the root marketplace (the one hosting the plugin the user installs), add the target marketplace to `allowCrossMarketplaceDependenciesOn` in `.claude-plugin/marketplace.json`:

   ```json
   {
     "name": "your-marketplace",
     "owner": { "name": "Your Org" },
     "allowCrossMarketplaceDependenciesOn": ["your-shared-marketplace"],
     "plugins": [
       {
         "name": "deploy-kit",
         "source": "./deploy-kit",
         "dependencies": [
           { "name": "audit-logger", "marketplace": "your-shared-marketplace" }
         ]
       }
     ]
   }
   ```

2. Only the root marketplace's allowlist applies, so setting it in the dependency's own marketplace has no effect.
3. Alternatively, tell users to install the dependency from its marketplace first, at the same scope; an already-enabled dependency bypasses the allowlist check.

See marketplace-creator → `references/create.md` for the rest of `marketplace.json`.

## How to test a plugin and its dependency locally

1. Load both from disk:

   ```bash
   claude --plugin-dir ./my-dependency --plugin-dir ./my-plugin
   ```

   The local copy satisfies the dependency entry; nothing is installed from a marketplace. The local `plugin.json` needs no `version`, because constraints aren't checked against a local copy. An entry that names a marketplace also matches the local copy on Claude Code v2.1.242 or later.

2. If both plugins live in one parent folder, pass that folder once: `claude --plugin-dir ./plugins` loads each child folder that has `.claude-plugin/plugin.json` (v2.1.265 or later).
3. Keep passing the dependency's flag. Until the dependency is installed from its marketplace, your plugin stops loading whenever the local copy is absent or disabled.

## How to tag releases others can depend on

Version constraints resolve against git tags on the repository that hosts the dependency, meaning the repository its plugin source in `marketplace.json` points at:

| Plugin source | Repository to tag | Who tags |
| :- | :- | :- |
| `github`, `url` or `git-subdir` | The plugin's own repository | The plugin's author |
| Relative path such as `./plugins/secrets-vault` | The marketplace repository | The marketplace maintainer |

1. Set `version` in `plugin.json` (and in the marketplace entry, if it has one) and commit.
2. From the plugin directory, with an `origin` remote configured:

   ```bash
   claude plugin tag --dry-run   # show the plan, create nothing
   claude plugin tag --push
   ```

   The tag name is `<plugin-name>--v<version>`, built from the manifest. The name prefix lets one marketplace repository host several plugins with independent version histories. Before tagging, the command validates the plugin, checks that `plugin.json` and the marketplace entry agree on the version (when inside a marketplace checkout), requires a clean working tree under the plugin directory, and refuses if the tag exists.

3. Success prints `Created tag secrets-vault--v2.1.0`, and with `--push` also `Pushed to origin`. Without `--push` it prints the `git push` command to run. If the push fails, the tag still exists locally and the command exits with an error.

Other flags: `[path]` (plugin directory, default current), `-f, --force` (skip the dirty-tree and tag-exists checks), `-m, --message <msg>` (`%s` stands for the version), `--remote <name>` (default `origin`).

You can also run `git tag secrets-vault--v2.1.0` directly, provided you keep `version` in `plugin.json` and the marketplace entry in sync yourself.

For the wider release process see `publish.md` and marketplace-creator → `references/maintain.md`.

## How to constrain a dependency with a non-git source

Tag resolution applies only to git-backed sources. For `npm`, `archive` and `command` sources:

1. Make sure the dependency's `plugin.json` sets `version`. That is the value checked, and a `plugin.json` with no version satisfies no constraint.
2. Understand that the constraint doesn't choose what is fetched. It is checked when the plugin loads, and your plugin is disabled if the installed version falls outside the range.
3. Tell users to install a `command`-source dependency, or one whose marketplace entry sets `headersHelper`, themselves before installing your plugin. Claude Code never installs the first or runs the second for a dependency, whether through `claude plugin install`, `/reload-plugins`, marketplace auto-update, re-running install, or `claude plugin marketplace add`.

## How to check what a constraint resolved to

1. Run `claude plugin list`. A tag-resolved dependency shows its version with a 12-character commit suffix, such as `2.1.0-8713c5b11005`.
2. Constraint checks use the tag's version, not the `version` in `plugin.json` at that commit.
3. To clean up dependencies nothing needs any more, preview with `claude plugin prune --dry-run`, then run `claude plugin prune` (add `-y` when not on a TTY; `-s, --scope` for `user`, `project` or `local`). It never removes a plugin the user installed explicitly.

## How dependencies behave for your users

**Resolution against tags.** For `{ "name": "secrets-vault", "version": "~2.1.0" }`, the dependency installs from the highest `secrets-vault--v` tag matching `~2.1.0`. When no tag matches:

- Plugin with its own repository: the install fails (`Dependency "secrets-vault@your-marketplace" has no git tag satisfying` ...).
- Plugin referenced by relative path: the marketplace's current copy is installed and the constraint is checked at load; if outside the range, your plugin stays disabled.

A marketplace added as a local folder resolves relative-path plugins against that folder's git tags if it is a git repository; otherwise the folder's current contents install.

**Several plugins constraining one dependency.** The dependency resolves to the highest version satisfying every range:

| Plugin A requires | Plugin B requires | Result |
| :- | :- | :- |
| `^2.0` | `>=2.1` | One install at the highest `2.x` tag at or above `2.1.0`; both load |
| `~2.1` | `~3.0` | Installing B fails with `has conflicting version requirements`; A and the dependency are unchanged |
| `=2.1.0` | none | Stays at `2.1.0`; auto-update skips newer versions while A is installed |

Auto-update fetches a constrained dependency at the highest tag satisfying every installed range. If ranges don't overlap, the dependency stays put and the `/plugin` **Errors** tab names the constraining plugin. When the last constraining plugin is uninstalled, the dependency goes back to tracking its marketplace entry on the next update.

**Plugins turned on from claude.ai.** Such a plugin loads as `<name>@synced`, with no marketplace. A dependency entry that names a marketplace counts as met if the user has the dependency installed and enabled from that marketplace (range checked against it), or has a claude.ai plugin of the same name enabled (range checked against its `version`; no `version` passes). A claude.ai plugin meets the entry only when your plugin also loads from claude.ai.

## Best practices

- Constrain dependencies whose tools or skills you call, because an unconstrained dependency moves to every new release and a rename breaks your plugin for everyone who updates.
- Choose the range width deliberately; the docs don't recommend one. A `~` range lets users receive only patch releases, while a `^` range also lets minor releases you haven't tested reach them.
- Widen a range only after testing the newer release and publishing a new version of your plugin, because the range is your tested contract.
- Tag every release as `<plugin-name>--v<version>` with `claude plugin tag`, because constraints resolve only against tags and the command checks version consistency and a clean tree for you.
- Run `claude plugin tag --dry-run` first, because it shows the tag name, version source and commands without creating anything.
- Keep `version` in `plugin.json` and the marketplace entry identical, because `claude plugin tag` refuses to tag when they disagree.
- Set `version` in `plugin.json` for `npm`, `archive` and `command` sources that others constrain, because without it no constraint is satisfied.
- Don't force-move a release tag unless you mean to change it, because the next install fetches the new commit's content rather than a cached copy.
- Use bundle plugins (name plus `dependencies`) to give a team one install command, because adding a plugin later is just a new bundle version.
- Add needed marketplaces to `allowCrossMarketplaceDependenciesOn` in the root marketplace, because otherwise cross-marketplace dependencies don't install.
- Prefer declaring cross-marketplace dependencies in the marketplace entry over `plugin.json`, because then a blocked dependency refuses the install with a clear message instead of leaving a plugin that fails to load.
- Test a plugin and its dependency together with two `--plugin-dir` flags, because the local copy satisfies the entry without installing anything.
- If users enable your plugin from claude.ai, tell them to enable the dependency there too or install it from its marketplace, because otherwise the dependency entry isn't met.
- Run `claude plugin prune --dry-run` before `claude plugin prune`, because it lists the orphaned dependencies without removing them.

## Pitfalls

| Symptom | Cause and fix |
| :- | :- |
| `Dependency "audit-logger@your-shared-marketplace" (required by deploy-kit@your-marketplace) is in marketplace "your-shared-marketplace", which is not in the allowlist` | Cross-marketplace dependency declared in the marketplace entry, target not in `allowCrossMarketplaceDependenciesOn` of the root marketplace. Add it, or have the user install the dependency first at the same scope |
| Install completes but your plugin fails to load | Same cause, but the dependency is declared in `plugin.json`, so the install goes through without it |
| `Dependency "secrets-vault@your-marketplace" has no git tag satisfying` ... | The dependency has its own repository and no `<name>--v<version>` tag matches the range. Tag releases, or widen the range |
| `claude plugin list` shows `Requires "secrets-vault@your-marketplace" ~2.1.0, installed 3.0.0` | Relative-path dependency with no matching tag; the marketplace's current copy is outside your range, so your plugin stays disabled |
| Installing a second plugin fails with `has conflicting version requirements` | Two installed plugins' ranges don't overlap (for example `~2.1` and `~3.0`) |
| A constrained dependency never updates | Its ranges don't overlap, so auto-update leaves it; the `/plugin` **Errors** tab names the constraining plugin. Or an `=` pin holds it |
| Local test: error ends `is disabled — enable it or remove the dependency` | You disabled the `--plugin-dir` copy of the dependency. `<name>@inline` in the error refers to that copy |
| Local test: dependency reported as not installed | The session started without the dependency's `--plugin-dir` flag. Pass it again, or install the dependency from its marketplace |
| Range never matches a beta | Ranges skip pre-releases unless they carry a pre-release suffix such as `^2.0.0-0` |
| A non-git dependency always fails its constraint | Its `plugin.json` sets no `version` |
| `claude plugin tag` exits `1` | No `version` in `plugin.json` or the marketplace entry, the tag already exists, or the working tree is dirty |
| Dependency with a `command` source, or a marketplace `headersHelper`, never installs | Claude Code never installs or runs these for a dependency. Users install it themselves first |
| Plugin enabled from claude.ai can't find its dependency | The user hasn't enabled the dependency on claude.ai or installed it from its marketplace |

## Sources

- https://code.claude.com/docs/en/plugins/dependencies
  - `#declare-a-dependency-with-a-version-constraint`, `#bundle-plugins-for-a-team`, `#depend-on-a-plugin-from-another-marketplace`, `#test-a-plugin-and-its-dependency-locally`, `#tag-plugin-releases-for-version-resolution`, `#create-a-release-tag`, `#constrain-a-dependency-that-has-a-non-git-source`, `#how-a-constraint-resolves-against-tags`, `#confirm-the-resolved-version`, `#combine-constraints-from-several-plugins`, `#dependencies-when-your-plugin-loads-from-claude-ai`
- Cross-checked against https://code.claude.com/docs/en/plugins/cli-reference (`#plugin-tag`, `#plugin-prune`) and https://code.claude.com/docs/en/plugins/manifest-reference (`#dependencies`)

# Publish and distribute a plugin

Publishing a plugin means listing it in a marketplace, a JSON catalog that says which plugins exist and where to fetch each one, so people can install it by name and receive your updates. You can run your own marketplace (a `.claude-plugin/marketplace.json` in a git repository) or submit the plugin to Anthropic's directory; you can also skip publishing and hand people the plugin folder or a `.zip`. You need this page once a plugin works and you are ready to share it. If it is not finished, start with `create.md`; if you maintain a CLI or SDK whose plugin is in an official marketplace, also see `cli-hints.md`.

## Contents

- [How to choose a distribution route](#how-to-choose-a-distribution-route)
- [How to prepare a release (pre-release checklist)](#how-to-prepare-a-release-pre-release-checklist)
- [How to share a plugin without a marketplace](#how-to-share-a-plugin-without-a-marketplace)
- [How to publish through your own marketplace](#how-to-publish-through-your-own-marketplace)
- [How to tell users to install](#how-to-tell-users-to-install)
- [How to release an update](#how-to-release-an-update)
- [How to tag a release](#how-to-tag-a-release)
- [How to rename or remove a plugin](#how-to-rename-or-remove-a-plugin)
- [How to declare dependencies](#how-to-declare-dependencies)
- [How to submit to Anthropic's directory](#how-to-submit-to-anthropics-directory)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to choose a distribution route

| Route | Who can install | What you need | Automatic updates for users |
| :- | :- | :- | :- |
| No marketplace | People you send the folder or `.zip` to | The plugin folder | None; they load the copy you sent |
| Your own marketplace | Anyone who can reach the repository (a private repo keeps it private) | A git repository or other host with `.claude-plugin/marketplace.json` listing the plugin | Off by default; a per-marketplace setting on the user's side |
| Anthropic's directory | People who add it on claude.ai or in Cowork; it also loads in their Claude Code sessions through account sync | A GitHub repository with the plugin and a paid claude.ai plan | Yes, after the pushed version is published |

## How to prepare a release (pre-release checklist)

Run through this before the first release and again before every later one.

- [ ] **Permanent kebab-case name.** `name` in `plugin.json` is what users install, enable and configure by (`name@marketplace`); a renamed plugin is a different plugin to every existing install. Use a form like `deploy-helper` (`claude plugin validate` warns on other forms). Put the user-facing label in `displayName`.
- [ ] **Versioning decision.** Either bump `version` in `plugin.json` on every release, or omit `version` in a git-hosted marketplace so Claude Code uses the commit SHA. Never push changes while leaving a set `version` unchanged.
- [ ] **Strict validation passes.**

  ```bash
  claude plugin validate --strict ./your-plugin
  ```

  A clean run prints `✔ Validation passed`. `--strict` turns warnings (unknown manifest field, missing `version`) into exit code 1, so keep it in CI; drop it if you deliberately omit `version`.
- [ ] **Paths are plugin-relative.** Component paths start with `./`; inside hook commands and MCP server configs, files are referenced as `${CLAUDE_PLUGIN_ROOT}/...`.
- [ ] **Installs from a local marketplace.** Add a local marketplace that lists the plugin, install from it, and start a session to confirm it loads:

  ```bash
  claude plugin marketplace add ./path-to-marketplace
  claude plugin install deploy-helper@your-marketplace
  ```

  See marketplace-creator → `references/create.md` for the smallest marketplace that works.
- [ ] **User-facing metadata filled.** `description`, `author`, `homepage` (must parse as a URL) and `repository` in `plugin.json`, plus a `README.md` at the plugin root. If `claude plugin validate` prints an `Advice` block, add the install line it suggests to the README.
- [ ] **Eval suite passes.** If the plugin has one, run `claude plugin eval .` (see `evals.md`).
- [ ] **Marketplace entry matches.** If you publish through a marketplace, the entry's `name` equals `plugin.json`'s `name`, and `claude plugin validate .` passes in the marketplace repository.

## How to share a plugin without a marketplace

1. Give people the plugin: a clone of its git repository, the directory, or a `.zip` (for example attached to a release).
2. They load it for one session from their shell:

   ```bash
   claude --plugin-dir ./deploy-helper
   ```

   The path can be the clone, the unzipped folder or the `.zip` itself. A `.zip` URL can be loaded with `--plugin-url`.
3. Or they load it in every session by moving the directory, with its `.claude-plugin/plugin.json`, under `~/.claude/skills/` (unless an administrator has blocked skills-directory plugins).
4. For a new version they pull or download again. Adding a `.claude-plugin/marketplace.json` to the same repository is what enables install by name and update by command.

If you maintain a CLI or SDK, publish the plugin in a marketplace and have your installer or post-install message run or print `claude plugin marketplace add <source>` followed by `claude plugin install <name>@<marketplace>`.

## How to publish through your own marketplace

1. In the plugin's own repository, save `.claude-plugin/marketplace.json` beside `plugin.json`, with one entry whose `source` is the repository root and whose `name` equals the manifest `name`:

   ```json
   {
     "name": "your-marketplace",
     "owner": { "name": "Your Name" },
     "plugins": [
       { "name": "deploy-helper", "source": "./" }
     ]
   }
   ```

   Pick a marketplace `name` other authors are unlikely to use: a user cannot have two marketplaces with the same name.
2. Validate in the repository before pushing:

   ```bash
   claude plugin validate .
   ```

3. Push. Once the file is in the repository the plugin is published; there is no submission form. Access follows repository access, so a private repository gives a private marketplace. For several plugins in one repository see marketplace-creator → `references/create.md`; for non-git hosts and company-wide rollout see marketplace-creator → `references/maintain.md` and marketplace-creator → `references/relevance.md`.

## How to tell users to install

Give users these commands with your source and names:

```bash
# once: add the marketplace (GitHub owner/repo, a URL, or a path)
claude plugin marketplace add your-org/your-marketplace
# install
claude plugin install deploy-helper@your-marketplace
```

One-step alternatives:

- In a session (Claude Code v2.1.275 or later): `/plugin install deploy-helper --marketplace your-org/your-marketplace`
- From the shell (Claude Code v2.1.292 or later): `claude plugin install deploy-helper --marketplace your-org/your-marketplace`

## How to release an update

1. If `plugin.json` sets `version`, increment it; if you omitted it in a git-hosted marketplace, the new commit SHA is the version.
2. Push.
3. Users get it when they run `claude plugin update deploy-helper@your-marketplace` (refreshes the marketplace and installs the new copy when the version changed), or automatically if they turned on auto-update for your marketplace (off by default; it runs the same update on a delay after the session starts).

For a directory listing, follow [Update a published plugin](https://claude.com/docs/plugins/submit#update-a-published-plugin) instead.

## How to tag a release

Tag only when other plugins declare a version range on yours, because those ranges resolve against git tags (see `dependencies.md`).

1. From the plugin directory, preview:

   ```bash
   claude plugin tag --dry-run
   ```

2. Create the annotated tag `{name}--v{version}` (for example `formatter--v1.0.0`) and optionally push it to `origin`:

   ```bash
   claude plugin tag --push
   ```

   Before tagging, the command checks that `plugin.json` and any marketplace entry listing the plugin agree on the version. Other flags: `-m, --message <msg>` (`%s` stands for the version), `--remote <name>`, `-f, --force`.

## How to rename or remove a plugin

1. Do not change a published plugin's `name`; change `displayName` to relabel it.
2. If a rename is unavoidable, add a `renames` entry to the marketplace file so existing installs migrate instead of failing with `Plugin "<name>" not found in marketplace`.
3. For removing a plugin and the full `renames` details, see marketplace-creator → `references/maintain.md`.

## How to declare dependencies

List plugins from the same marketplace that yours needs in the `dependencies` array of `plugin.json`, each as a bare name or an object with a semver `version` range. Installing your plugin then installs and enables them. Range syntax, cross-marketplace dependencies and pruning are in `dependencies.md`.

## How to submit to Anthropic's directory

The directory is the catalog people browse on claude.ai and in Cowork; one listing reaches claude.ai, Cowork and Claude Code. The official marketplace `claude-plugins-official` does not take submissions through the directory portal (ask an Anthropic partner contact about that).

1. Confirm you can submit: a paid claude.ai plan. On Pro, Max and Ultra you submit from your own account; on Team and Enterprise an Owner submits, and on Enterprise an Owner can grant the **Directory** permission through a custom role under **Organization settings > Roles**.
2. Validate locally with `claude plugin validate ./your-plugin --strict`, then work through the [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist#run-the-checks-before-you-submit). The portal applies extra rules the CLI does not check.
3. Check the [component support table](https://claude.com/docs/plugins/platform-support#compare-component-support-by-app): some components are Claude Code-only and do not load on claude.ai or in Cowork.
4. Submit in the developer portal at [claude.ai/directory/manage](https://claude.ai/directory/manage), following [Submit a plugin](https://claude.com/docs/plugins/submit#submit-a-plugin).

Users who install from the directory have the plugin on their account, and Claude Code loads it as `<name>@synced`.

## Best practices

- Treat the plugin `name` as permanent from the first release, because every install is recorded under it.
- Use `displayName` for any label change, because it changes what users see without breaking installs.
- Pick one versioning scheme and stick to it, because a set-but-unbumped `version` silently keeps users on the old copy.
- Keep `claude plugin validate --strict` in CI, because it catches unknown fields and missing metadata the runtime would tolerate.
- Test the install path from a local marketplace before pushing, because an install from a marketplace is one of the things that decides whether a release works for the people who install it.
- Give the marketplace a distinctive name, because users cannot add two marketplaces with the same name.
- Put an install line in the README, because `claude plugin validate` gives advice until one exists and users need the exact command.
- Run the eval suite before each release, because it catches behaviour regressions that validation cannot.
- Tag releases with `claude plugin tag` when others depend on a version range of yours, because it also checks that manifest and marketplace versions agree.

## Pitfalls

- **Users stay on the old version.** `claude plugin update` prints `<name> is already at the latest version (1.0.0).` You pushed without bumping `version`. Bump it, or remove `version` in a git-hosted marketplace to version by commit SHA.
- **Strict validation fails on a missing `version`.** Expected if you chose commit-SHA versioning; drop `--strict` for that plugin.
- **Validation reports component paths.** Paths must start with `./`; use `${CLAUDE_PLUGIN_ROOT}/...` inside hook commands and MCP server configs.
- **Existing users lose the plugin after a rename.** Their installs fail with `Plugin "<name>" not found in marketplace`. Restore the name or add a `renames` entry.
- **`claude plugin tag` exits 1.** Common reasons: no `version` in `plugin.json` or the marketplace entry, the tag already exists, or the working tree is dirty. If the push fails the tag still exists locally.
- **Clean local validation, rejected in the portal.** The directory portal applies rules the CLI does not check; use the pre-submission checklist.
- **Directory users miss features.** Some components are Claude Code-only; check the component support table before submitting.
- **Validation advice will not clear.** The suggested README line contains the placeholder `<owner>/<repo>`; replace it with the real marketplace source.

## Sources

- https://code.claude.com/docs/en/plugins/publish (fetched 2026-11-05): [#choose-how-to-distribute](https://code.claude.com/docs/en/plugins/publish#choose-how-to-distribute), [#prepare-your-plugin-for-release](https://code.claude.com/docs/en/plugins/publish#prepare-your-plugin-for-release), [#share-a-plugin-without-a-marketplace](https://code.claude.com/docs/en/plugins/publish#share-a-plugin-without-a-marketplace), [#publish-through-your-own-marketplace](https://code.claude.com/docs/en/plugins/publish#publish-through-your-own-marketplace), [#ship-updates-to-users](https://code.claude.com/docs/en/plugins/publish#ship-updates-to-users), [#submit-to-anthropics-directory](https://code.claude.com/docs/en/plugins/publish#submit-to-anthropics-directory), [#tag-a-release](https://code.claude.com/docs/en/plugins/publish#tag-a-release), [#rename-or-remove-a-plugin](https://code.claude.com/docs/en/plugins/publish#rename-or-remove-a-plugin), [#declare-dependencies](https://code.claude.com/docs/en/plugins/publish#declare-dependencies)
- https://code.claude.com/docs/en/plugins/cli-reference: [#plugin-tag](https://code.claude.com/docs/en/plugins/cli-reference#plugin-tag), [#plugin-validate](https://code.claude.com/docs/en/plugins/cli-reference#plugin-validate), [#advice-on-the-readme](https://code.claude.com/docs/en/plugins/cli-reference#advice-on-the-readme)
- https://code.claude.com/docs/en/plugins/manifest-reference#fields
- Related: `evals.md`, `measure.md`, `cli-hints.md`, `dependencies.md`, `components.md`

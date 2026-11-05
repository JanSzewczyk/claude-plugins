# Host and maintain a marketplace

Hosting a marketplace means putting its `marketplace.json` where other people can add it, install its plugins, and keep receiving your changes after you push. This page is for the person who operates the marketplace: choosing a host, giving access to a private one, shipping updates, pinning versions, renaming or removing plugins without breaking installs, and authenticating archive downloads. Read it after the catalog installs cleanly on your own machine (`create.md`), read the release section before your first release, and read the rename section before changing any plugin `name`. Org-wide requirement and suggestions are in `relevance.md`.

## Contents

- [How to host the marketplace and tell users how to add it](#how-to-host-the-marketplace-and-tell-users-how-to-add-it)
- [How to distribute through claude.ai organization settings](#how-to-distribute-through-claudeai-organization-settings)
- [How to host a private marketplace and grant access](#how-to-host-a-private-marketplace-and-grant-access)
- [How to roll out to a whole company](#how-to-roll-out-to-a-whole-company)
- [How to release a new version](#how-to-release-a-new-version)
- [How to hold users on one version](#how-to-hold-users-on-one-version)
- [How to rename a plugin without breaking installs](#how-to-rename-a-plugin-without-breaking-installs)
- [How to remove a plugin](#how-to-remove-a-plugin)
- [How to authenticate archive downloads](#how-to-authenticate-archive-downloads)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to host the marketplace and tell users how to add it

1. Push the marketplace root (the directory containing `.claude-plugin/`) to one of these hosts and send users the matching command:

   | Host | Users run, in a session | What users need |
   | :- | :- | :- |
   | GitHub | `/plugin marketplace add your-org/your-marketplace` | `git`; for a private repository, the access below |
   | GitLab, Bitbucket, GitHub Enterprise Server, other git host | `/plugin marketplace add https://gitlab.example.com/team/plugins.git` | `git` and access to the host. Send the full URL: `owner/repo` shorthand always means github.com |
   | A hosted `marketplace.json` URL | `/plugin marketplace add https://plugins.example.com/marketplace.json` | HTTPS access to the URL; no `git` for the catalog |
   | A shared filesystem directory | `/plugin marketplace add /Volumes/shared/claude-plugins` | Read access to the path |

   From the shell the same command is `claude plugin marketplace add <source>`.
2. To pin users to a branch or tag of a GitHub or git-URL marketplace, append `#<ref>`, as in `your-org/your-marketplace#stable`.
3. Tell users the install form: `/plugin install <entry-name>@<marketplace-name>`. A successful add prints `Successfully added marketplace: your-marketplace`, where the name comes from the `name` field in `marketplace.json`, not from the repository name.
4. `marketplace add` treats an `https://` URL on a self-hosted git host as a `marketplace.json` URL unless it ends in `.git` or contains `/_git/`, so append `.git`. For a host whose clone URLs don't carry `.git`, such as AWS CodeCommit, have users declare the marketplace as a `git` entry in `extraKnownMarketplaces`.

### Register it for everyone working in one repository

1. In that repository, from your shell, run once:

   ```bash
   claude plugin marketplace add your-org/your-marketplace --scope project
   ```

2. Commit the `.claude/settings.json` it writes. Each teammate who trusts the folder gets the marketplace registered.

### Host it as a bare marketplace.json URL

1. Give every entry a source that can be fetched on its own (`github`, `git-subdir`, `url`, `archive`, `npm`). Claude Code downloads only the one file, so a relative-path entry fails at install with `its marketplace entry path does not stay inside the marketplace directory`.
2. Stay within the download limits:

   | File | Largest download | Server response time | Redirects |
   | :- | :- | :- | :- |
   | `marketplace.json` from a `url` marketplace source | 5 MiB | 10 seconds | A cross-origin redirect must use `https://` and can't target a loopback, link-local, or cloud-metadata host |
   | Zip from an `archive` plugin source | 256 MiB | 120 seconds | At most five, each to `https://`, none to a loopback, link-local, or cloud-metadata host |

   After download, an archive install fails above 100,000 entries, 512 MiB for one uncompressed file, 1 GiB uncompressed in total, or an uncompressed size 50 times the zip.
3. Don't rely on configured headers across origins: a request redirected to a different origin carries none of them.

### Host it on a shared directory

Users read relative-path plugins directly from the directory, without copying. Your edits reach them at their next session start or `/reload-plugins`, with no update step or version bump.

### Keep the repository clone-friendly

- Keep plugin files out of Git LFS: Claude Code's clone never downloads LFS content, so tracked files arrive as pointer files. (`skipLfs` is accepted and has no effect.)
- To share files between plugins in the same marketplace, use symlinks inside the plugin directory, for example `ln -s ../../shared-plugin/skills/foo ./skills/foo`. When copying into the cache, Claude Code keeps symlinks that resolve inside the plugin, dereferences ones that resolve elsewhere in the marketplace, and skips ones that leave it. For local-path installs, and `command` sources in `copy` mode, only symlinks inside the plugin's own directory survive.

## How to distribute through claude.ai organization settings

On a Team or Enterprise plan you can sync the marketplace through **Organization settings > Plugins & skills** on claude.ai. Sync reads the repository through the organization's GitHub or GitLab connection, so users' git credentials aren't involved. It is stricter than `/plugin marketplace add`:

1. On github.com and gitlab.com, make the marketplace repository private or internal.
2. Use only plugin source types that organization sync accepts (listed on claude.com's org-sync page).
3. Remove any top-level `bin/` directory from plugins. claude.ai rejects such a plugin with an error starting `Plugin contains a top-level bin/ directory` and syncs the rest. Put executables in, for example, `scripts/` and reference them as `${CLAUDE_PLUGIN_ROOT}/scripts/<name>`.

## How to host a private marketplace and grant access

Claude Code runs `git` on the user's machine with interactive prompts turned off and uses whatever credentials are already there. It has no token of its own and `marketplace.json` has no field for one.

1. Choose the protocol by the add command you send:
   - `owner/repo` (GitHub): Claude Code probes `ssh -T git@github.com`, clones over SSH if it succeeds, otherwise over HTTPS.
   - `git@host:path.git`: SSH.
   - `https://example.com/repo.git`: HTTPS.
2. Tell users what their machine needs:
   - **SSH**: a key that works without a passphrase prompt (for example loaded in `ssh-agent`), and the host already in `known_hosts`.
   - **HTTPS**: a credential the git credential helper already stores. The helper can't prompt and askpass programs (`GIT_ASKPASS`) don't run. On GitHub: `gh auth login`, then `gh auth setup-git`.
   - **No GitHub SSH key**: `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` to skip the SSH probe.
3. Keep `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` in the instructions even if `claude plugin install` works without it from the shell. That command can fall back on its own (`SSH not configured, cloning via HTTPS`), but installs from `/plugin` in a session and plugin updates don't.
4. For GitHub Enterprise Server, users need git access to that host.

### Serve users who have no git-host account

They can add a marketplace served as a `marketplace.json` URL or from a shared directory, but can install only entries whose sources they can reach. An entry pointing at a private `github` repository still fails for them.

1. Use `archive` sources (v2.1.224+) pinned with `sha256`; users need only network access to the URL. Add `headers` or `headersHelper` if the download needs credentials (see below).
2. Or use public git repositories with `https://` URLs in `url` or `git-subdir` sources, which clone without credentials. For `github` sources and `owner/repo` `git-subdir` sources, users without a GitHub SSH key set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.
3. Or, on one network, a `directory` marketplace on a shared filesystem.

### What background auto-update does with credentials

Background auto-update uses the user's credential helpers and never prompts:

- SSH with a key in `ssh-agent`, or HTTPS with a stored credential (Git Credential Manager, macOS Keychain helper, `git-credential-store`): the check authenticates.
- HTTPS with a helper that must prompt: the update fails quietly and the existing checkout stays.

When the check finds new commits, or can't reach or authenticate to the remote, Claude Code re-clones and replaces the checkout; if the clone fails the old checkout stays. Users who want to skip that re-clone on failure set `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`. A `GITHUB_TOKEN` in the environment alone doesn't authenticate the check; it works only through a credential helper such as `gh`'s.

## How to roll out to a whole company

| Who | What they do |
| :- | :- |
| You, the owner | Keep the catalog in a repository only the company can read, send the add command, and state what each machine needs |
| An administrator | Registers the marketplace and enables its plugins for everyone with `extraKnownMarketplaces` and `enabledPlugins` in managed settings, and sets `autoUpdate` there |
| Each person | Has read access and stored credentials; without an administrator, also runs the add and install commands |

Without an administrator the rollout still works; each person adds and installs. People without a git-host account are reached through no-git entry sources, a pre-populated plugins directory, or claude.ai organization settings.

## How to release a new version

Users get a new copy of a plugin only when its computed version changes. The version comes from `plugin.json` first, then from the marketplace entry.

1. Pick one policy per plugin:
   - **Bump `version` on each release**: users stay on their cached copy until the string changes. New commits under an unchanged `"version": "1.0.0"` never reach them.
   - **Omit `version`** from both `plugin.json` and the entry: users track your commits.
2. Never set `version` in both places. `plugin.json` wins silently and `claude plugin validate` warns: `Entry declares version "<a>" but <path>/plugin.json says "<b>"`.
3. Push. Users then receive it through background auto-update (if on) or by running `/plugin marketplace update <name>` in a session or `claude plugin update <plugin>@<name>` in the shell.
4. To tag the release for dependency resolution, `claude plugin tag plugins/<name> --dry-run` previews a `<name>--v<version>` tag; see plugin-creator → `references/dependencies.md` and plugin-creator → `references/publish.md`.

`version` doesn't matter for a plugin loaded in place from a marketplace added by local path (it loads current files each session), nor for a `command` source.

### Turn on auto-update

Auto-update is off for your marketplace by default and `marketplace.json` has no field for it.

- Each user: `/plugin` → **Marketplaces** → select the marketplace → **Enable auto-update**.
- An admin: `"autoUpdate": true` on the marketplace's `extraKnownMarketplaces` entry in managed settings.

### Change a command source's command

If you change the `command` of a `command` source or switch its `mode`, the once-per-session run stops for each user until they accept the new command. Their `/plugin` Errors tab shows the new command and the `claude plugin update` command to run; tell them to run it in a terminal.

## How to hold users on one version

One marketplace serves one version of each plugin at a time. Control it by what each entry points at:

- `ref` (branch or tag) and `sha` (commit) on a `github`, `url`, or `git-subdir` source.
- `#<ref>` on the add command, so users get one branch or tag of the catalog.
- `<plugin>--v<version>` git tags, which dependency version ranges resolve against.

### Run stable and early-access channels

Claude Code has no channel concept. Host two marketplaces with different `name` values whose entries point at different refs:

```json
{
  "name": "stable-tools",
  "owner": { "name": "Your Org" },
  "plugins": [
    { "name": "code-formatter", "source": { "source": "github", "repo": "your-org/code-formatter", "ref": "stable" } }
  ]
}
```

```json
{
  "name": "latest-tools",
  "owner": { "name": "Your Org" },
  "plugins": [
    { "name": "code-formatter", "source": { "source": "github", "repo": "your-org/code-formatter", "ref": "latest" } }
  ]
}
```

Give the two refs different `plugin.json` versions, or omit `version` so the commit SHA distinguishes them. An admin can assign a channel per user group with the matching `extraKnownMarketplaces` entry.

## How to rename a plugin without breaking installs

A plugin's `name` is referenced in `enabledPlugins`, `pluginConfigs` and `/plugin install`, so changing it breaks every install.

1. If you only want a different label in `/plugin`, set `displayName` in `plugin.json` and keep `name`.
2. If the `name` must change, rename the entry and the `plugin.json` `name`, then add a top-level `renames` map from old to new:

   ```json
   {
     "name": "your-marketplace",
     "owner": { "name": "Your Org" },
     "plugins": [
       { "name": "code-formatter", "source": "./plugins/code-formatter" }
     ],
     "renames": {
       "formatter": "code-formatter",
       "legacy-linter": null
     }
   }
   ```

3. Run `claude plugin validate .`. It rejects a chain that cycles or ends anywhere other than `null` or a name in `plugins`, with `renames.<name>: chain does not resolve`.
4. Push. Users with the old name enabled see `Renamed to "code-formatter" in the "your-marketplace" marketplace` once, and Claude Code rewrites the key in `enabledPlugins` and `pluginConfigs` in user, project and local settings.
5. Tell users of a git- or URL-added marketplace to run `/plugin install code-formatter@your-marketplace` once; until then the plugin reports `Plugin "<name>" not cached at <path>`.
6. Ask an admin to update managed `enabledPlugins`: Claude Code can't rewrite managed settings, so the notice recurs until they do.
7. Treat `renames` as append-only. On a second rename add a new key rather than editing the first; Claude Code follows the chain from the oldest name.

## How to remove a plugin

1. Remove the entry from `plugins` and map its name to `null` in `renames`. Users then see `Removed from the "your-marketplace" marketplace` and the key is dropped from their settings.
2. To uninstall the plugin from users' machines rather than leave a copy behind, set `"forceRemoveDeletedPlugins": true` at the top level. At each session start, Claude Code treats any installed plugin that is neither listed nor renamed as removed, uninstalls it from user, project and local scopes (plugins installed only by managed settings stay), and lists it under **Flagged** in `/plugin` with `Removed from marketplace`.

There is no deprecation state; removal plus `renames` → `null` (and optionally `forceRemoveDeletedPlugins`) is the option.

## How to authenticate archive downloads

For `archive` sources behind a private registry, set the HTTP headers Claude Code sends. On a plugin entry, `headers` and `headersHelper` affect only `archive` sources.

1. Choose where:

   | Place | Downloads that get the headers | When a `headersHelper` there runs |
   | :- | :- | :- |
   | Marketplace `url` source (in settings, such as `extraKnownMarketplaces`) | Archives on the marketplace URL's origin (scheme, host, port) | Before each fetch of `marketplace.json` and each archive download on that origin; output reused up to 60 seconds |
   | Plugin entry (v2.1.238+) | That entry's download only | Only when a user installs or updates that one plugin by itself and accepts the command |

   Entry headers override same-named marketplace headers; within one place, command output overrides `headers`.
2. For a short-lived token, set `headersHelper` instead of `headers` (v2.1.238+). An entry with `headersHelper` must also set `"strict": false`:

   ```json
   {
     "name": "my-plugin",
     "description": "Formatting commands for internal services",
     "strict": false,
     "source": {
       "source": "archive",
       "url": "https://registry.example.com/plugins/my-plugin-2.1.0.zip"
     },
     "headersHelper": "/opt/bin/mint-registry-token.sh"
   }
   ```

3. Write the command so that it:
   - is at most 500 characters of printable ASCII, with no run of four or more spaces;
   - prints one JSON object of header names to string values, such as `{"Authorization": "Bearer ..."}`, and exits 0 within 10 seconds;
   - uses an absolute path or a command on `PATH` (it runs through `sh` or `cmd.exe`, in `~/.claude` or `CLAUDE_CONFIG_DIR`);
   - reads its credential from a file or credential store. When set in a `marketplace.json` entry or a project's `.claude/settings.json`/`.claude/settings.local.json`, Claude Code strips credential-like variables such as `ANTHROPIC_API_KEY` and `MY_REGISTRY_TOKEN` from its environment.
   It receives `CLAUDE_CODE_PLUGIN_NAME` and `CLAUDE_CODE_PLUGIN_ARCHIVE_URL` (entry) or `CLAUDE_CODE_MARKETPLACE_URL` and `CLAUDE_CODE_MARKETPLACE_NAME` (`url` source).
4. Test with `claude plugin install my-plugin@your-marketplace`: Claude Code shows the command and archive URL, then downloads after you accept. Non-interactive installs need `--yes`, or `--accept-command` with the `sha256` a previous `--json` run reported.

Users must install or update such a plugin by itself. Bulk installs, plugin suggestions, dependency installs and background auto-update refuse it and point the user to the plugin's own view in `/plugin` or the Errors tab.

## Best practices

- Keep the catalog in a repository only your company can read, because access to a git-hosted marketplace follows each user's own git credentials and nothing in `marketplace.json` can restrict it.
- Send the full URL for non-GitHub hosts, because `owner/repo` shorthand always means github.com.
- Include `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` in instructions for users without a GitHub SSH key, because in-session installs and updates don't fall back to HTTPS.
- Use git hosting, not a bare `marketplace.json` URL, when entries use relative paths, because a URL marketplace downloads only the one file.
- Decide per plugin between bumping `version` every release and omitting it, because an unchanged version strands users on their cached copy.
- Set `version` in only one place, because `plugin.json` wins silently when both are set.
- Change labels with `displayName`, not `name`, because `name` is the key in users' settings.
- Record every rename and removal in `renames` and never edit old keys, because Claude Code follows the chain from the oldest name.
- Pin `archive` sources with `sha256`, because a changed download is then refused (`validate` warns when an archive fetched with a `headersHelper` has no pin).
- Use separately named marketplaces for separate audiences or channels, because entries have no audience field and a user can't register two marketplaces with one name.
- Keep plugin executables out of a top-level `bin/` if you may sync through claude.ai, because organization sync rejects that plugin.

## Pitfalls

| Symptom | Cause | Fix |
| :- | :- | :- |
| Users don't receive new commits | `version` unchanged; or auto-update off and nobody ran an update | Bump or omit `version`; enable auto-update or run `/plugin marketplace update <name>` |
| `Plugin "<name>" not found in marketplace` after a rename or removal | No `renames` entry | Add `"old": "new"` or `"old": null` |
| `Plugin "<name>" not cached at <path>` after a rename | Git/URL marketplace hasn't installed the new name | User runs `/plugin install <new>@<marketplace>` once |
| Rename notice keeps coming back | Plugin enabled in managed settings | Admin updates managed `enabledPlugins` |
| `renames.<name>: chain does not resolve` | Cycle, or target not in `plugins` and not `null` | Fix the chain |
| Relative entry fails with `its marketplace entry path does not stay inside the marketplace directory` | Marketplace added as a bare URL | Self-fetchable sources, or host in git |
| Private install works in the shell but fails from `/plugin` or on update | Relied on the shell's automatic HTTPS fallback | Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` |
| Background update silently stale | HTTPS credential helper needs to prompt | Store a credential (`gh auth login`, `gh auth setup-git`) |
| Plugin files are LFS pointer text | Files tracked in Git LFS | Remove them from LFS |
| `Plugin "x" sets headersHelper but is not "strict": false` | Missing `"strict": false` | Add it |
| `Plugin "x" sets headers/headersHelper, which only apply to "archive" sources; they have no effect on this entry.` | Headers on a non-archive entry | Remove them, or use git credentials |
| Header silently missing | `Host`, `Cookie`, `X-Forwarded-*` are dropped; cross-origin redirect strips all headers | Use auth headers only; avoid cross-origin redirects |
| Command-source plugin stops refreshing | You changed its `command` or `mode` | Users run the `claude plugin update` command shown in the Errors tab |
| claude.ai sync skips a plugin: `Plugin contains a top-level bin/ directory` | Top-level `bin/` | Move to `scripts/` |

## Sources

- https://code.claude.com/docs/en/plugins/host-marketplace — `#host-your-marketplace`, `#register-the-marketplace-for-everyone-in-a-repository`, `#avoid-relative-path-entries-in-a-url-hosted-marketplace`, `#stay-within-the-download-limits-for-hosted-files`, `#keep-plugin-files-out-of-git-lfs`, `#share-files-within-a-marketplace-with-symlinks`, `#distribute-through-organization-settings`, `#grant-access-to-a-private-marketplace`, `#serve-users-who-have-no-git-host-account`, `#what-background-auto-update-does-with-credentials`, `#roll-out-to-a-whole-company`, `#keep-users-up-to-date`, `#release-a-new-version`, `#hold-users-on-one-version`, `#run-release-channels`, `#rename-or-remove-a-plugin`, `#authenticate-archive-downloads`, `#work-around-what-a-marketplace-can’t-do`
- https://code.claude.com/docs/en/plugins/marketplace-reference (cross-check) — `#plugin-entries`, `#archive-plugin-source`, `#fields-by-type`, `#validation-messages`
- https://code.claude.com/docs/en/plugins/cli-reference (cross-check) — `#plugin-marketplace-add`, `#plugin-tag`

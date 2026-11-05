# Recommend plugins for your org

Claude Code can suggest installing a plugin from your organization's marketplace when a user's session matches signals you define for it: the working directory, files Claude has read, commands Claude has run, hosts in Bash commands, or dependencies in package manifests. Two roles are involved. The marketplace operator adds a `relevance` block to the plugin's entry in `marketplace.json`; an administrator allowlists the marketplace in managed settings. In the terminal, users see no suggestions from a marketplace until it is allowlisted. Use this when you want the right plugin offered at the moment it becomes useful instead of relying on people to discover it. The marketplace itself is covered in `create.md` and `maintain.md`.

## Contents

- [How plugin suggestions behave](#how-plugin-suggestions-behave)
- [How to add a relevance block](#how-to-add-a-relevance-block)
- [How to validate the relevance block](#how-to-validate-the-relevance-block)
- [How to allowlist the marketplace in managed settings](#how-to-allowlist-the-marketplace-in-managed-settings)
- [What users see](#what-users-see)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How plugin suggestions behave

- Matching runs locally on the user's machine, adds no network traffic, and nothing about which signals matched is reported to Anthropic or to you.
- When a signal matches and the plugin isn't installed, it is suggested in three places: a **spinner tip** while Claude responds, a **session-start notification** (only for a `cwd` match), and a pin at the top of the `/plugin` **Discover** tab.
- Claude Code never installs the plugin; the user always confirms.
- `spinnerTipsEnabled: false`, or a `spinnerTipsOverride` with `excludeDefault`, turns off the spinner tip and the session-start notification. The Discover pin is unaffected.

## How to add a relevance block

1. Add a `relevance` object to the plugin's entry. Set at least one signal, or the plugin is never suggested:

   ```json
   {
     "name": "your-marketplace",
     "owner": { "name": "Your Org" },
     "plugins": [
       {
         "name": "terraform-helpers",
         "source": "./plugins/terraform-helpers",
         "description": "Your organization's Terraform conventions and helpers",
         "relevance": {
           "topic": "Terraform",
           "signals": {
             "cli": ["terraform"],
             "filesRead": ["**/*.tf"]
           }
         }
       }
     ]
   }
   ```

2. Set `topic` (optional, at most 64 characters) to the phrase that fills "Working with *topic*?". It defaults to the plugin name with each hyphen segment capitalized. Use the product name (`Terraform`), or a domain such as `design` when the plugin name doesn't read naturally.
3. Choose signals from this table and stay within the limits. A recognized field over its limit invalidates the whole entry, and users can't install that plugin until you fix it.

   | Signal | Matches | Rule | Limit |
   | :- | :- | :- | :- |
   | `cwd` | Session working directory | Glob; absolute path, and path relative to the git root when in a repository; case-insensitive | 10 patterns of 256 characters |
   | `cli` | Command names Claude has run this session | Exact match on the command name | 10 entries of 64 characters |
   | `hosts` | Hostnames in `http://`/`https://` URLs in Bash commands | Bare lowercase hostname, no scheme, port or path; exact, case-insensitive | 20 entries of 128 characters |
   | `filesRead` | Paths of files Claude has read | Glob, forward-slash normalized, case-insensitive | 10 patterns of 256 characters |
   | `manifestDeps` | Dependencies in package manifests Claude has read | `{ "file": "...", "pattern": "..." }`, both regular expressions | 10 entries, each value at most 256 characters; manifests over 512 KB skipped |

   `filesRead` and `manifestDeps` also match files Claude has written or edited this session and the project's auto-loaded `CLAUDE.md` files.
4. Validate before publishing (next section).

While no signal matches, the plugin keeps its normal position in Discover and gets no spinner tip.

### How to target a directory with cwd

- `cwd` is the only signal that can match at session start, before the first message, so it is the one that triggers the session-start notification.
- Each pattern matches the directory and everything under it: `infra`, `infra/` and `infra/**` behave the same.

### How to target a command with cli

Claude Code records one name per shell command: the first token after leading environment variable assignments and `sudo`. Compound commands record only the leading command, so `cd infra && terraform plan` records `cd`, not `terraform`. Pair `cli` with a file or directory signal when the tool is usually run that way.

### How to target an SDK dependency with manifestDeps

1. Write `file` as a JavaScript `RegExp` matched case-insensitively against the manifest path. Paths are typically absolute and aren't separator-normalized here, so anchor at the end and accept both separators.
2. Write `pattern` as a `RegExp` matched case-sensitively against the file contents.
3. Double every backslash in JSON:

   ```json
   {
     "name": "your-plugin",
     "source": "./plugins/your-plugin",
     "relevance": {
       "signals": {
         "manifestDeps": [
           {
             "file": "[/\\\\]package\\.json$",
             "pattern": "\"your-sdk\"\\s*:"
           }
         ]
       }
     }
   }
   ```

   `[/\\\\]` matches `/` or `\`; `\\.` is a literal dot.

## How to validate the relevance block

1. From your shell:

   ```bash
   claude plugin validate ./my-marketplace
   ```

2. Read the findings, each printed with the path of the field it concerns. The validator warns on unknown keys under `relevance` and `relevance.signals`, flags a `relevance` value that isn't an object, rejects a `signals.hosts` entry with a scheme, port or path, and enforces the limits above.
3. Check the last line: `Validation passed`, `Validation passed with warnings`, or `Validation failed`.

Older clients ignore `relevance` fields they don't recognize, so adding a newer signal doesn't break their load.

## How to allowlist the marketplace in managed settings

This is the administrator's step; without it terminal users see nothing, even with `relevance` declared.

1. Add the marketplace name to `pluginSuggestionMarketplaces` in managed settings.
2. For any marketplace other than the official one, also declare its source, either as that name's entry in `extraKnownMarketplaces` or as an entry in `strictKnownMarketplaces`:

   ```json
   {
     "extraKnownMarketplaces": {
       "your-marketplace": {
         "source": {
           "source": "github",
           "repo": "your-org/your-marketplace"
         }
       }
     },
     "pluginSuggestionMarketplaces": ["your-marketplace"]
   }
   ```

3. For the official Anthropic marketplace, list the name alone, since it can only register from the official source:

   ```json
   {
     "pluginSuggestionMarketplaces": ["claude-plugins-official"]
   }
   ```

The source check means no suggestions appear on a machine where the marketplace isn't registered, or is registered under the allowlisted name from a different source. That stops an unrelated marketplace from taking the name to get its plugins suggested across the org.

## What users see

Spinner tip during a response:

```text
Working with Terraform? Install the terraform-helpers plugin:
/plugin install terraform-helpers@your-marketplace
```

Session-start notification on a `cwd` match:

```text
plugin suggestion: terraform-helpers@your-marketplace · /plugin
```

In Discover, the plugin is pinned with an annotation naming the signal, such as `suggested for this directory` or `suggested for terraform commands`.

Frequency limits:

- At most once every three sessions across the spinner tip and the session-start notification combined.
- The session-start notification stops after the two together have shown the plugin twice.
- Neither repeats once the plugin is installed.
- Discover pins the plugin only the first time the user opens the tab while signals match; this is recorded in `~/.claude.json`, and later opens show normal order.

## Best practices

- Prefer specific signals (`filesRead` globs on a file type, `manifestDeps` on your SDK) over broad ones, because users see each suggestion only a few times and a mismatched one wastes them.
- Add a `cwd` signal when the plugin belongs to a known directory, because only `cwd` can trigger the session-start notification.
- Don't rely on `cli` alone for tools usually run after `cd ... &&`, because only the leading command of a compound command is recorded.
- Set `topic` when the plugin name doesn't read naturally in "Working with *topic*?", because the default is just the capitalized plugin name.
- Anchor `manifestDeps.file` at the end of the path and accept both separators, because paths are absolute and not separator-normalized.
- Run `claude plugin validate` before every push, because an over-limit signal invalidates the whole entry for users.
- Give the plugin entry a clear `description`, because the Discover pin puts the plugin at the top of the `/plugin` list, where the description is the line users read.
- Coordinate with the administrator to declare the marketplace source alongside `pluginSuggestionMarketplaces`, because a name without its source yields no suggestions.

## Pitfalls

| Symptom | Cause | Fix |
| :- | :- | :- |
| No suggestions anywhere | Marketplace not in `pluginSuggestionMarketplaces`, or its source not declared in `extraKnownMarketplaces`/`strictKnownMarketplaces` | Administrator adds both |
| No suggestions on some machines | Marketplace not registered there, or registered under the name from a different source | Register it from the declared source |
| Plugin can't be installed after adding relevance | A signal exceeds its limit, invalidating the entry | Fix the field `validate` reports |
| `cli: ["terraform"]` never matches | Claude runs `cd dir && terraform ...`; only `cd` is recorded | Add a `filesRead` or `cwd` signal |
| `hosts` entry rejected | Includes scheme, port or path | Use the bare lowercase hostname |
| `manifestDeps` never matches | Pattern anchored at the start of an absolute path, or single backslashes in JSON | Anchor with `$`, double the backslashes |
| `'relevance' must be an object containing topic and signals; got <type>. It will be ignored at load time.` | `relevance` isn't an object | Make it an object |
| `Unknown field 'x'. Claude Code ignores it at load time.` under `relevance` | Typo in a signal name | Use `cwd`, `cli`, `hosts`, `filesRead`, `manifestDeps` |
| No spinner tip or start notification, but Discover pin works | `spinnerTipsEnabled: false` or `spinnerTipsOverride` with `excludeDefault` | Expected; the Discover pin still shows |
| Suggestion stopped appearing | Frequency limits reached, or plugin installed | Expected behaviour |

## Sources

- https://code.claude.com/docs/en/plugins/relevance — `#understand-how-plugin-relevance-works`, `#add-relevance-to-a-plugin-entry`, `#field-reference`, `#relevance-signals`, `#working-directory-matching`, `#command-name-matching`, `#manifest-dependency-matching`, `#validate-your-marketplace`, `#enable-suggestions-in-managed-settings`, `#preview-what-the-user-sees`
- https://code.claude.com/docs/en/plugins/host-marketplace — `#depend-on-and-recommend-other-plugins`
- https://code.claude.com/docs/en/plugins/marketplace-reference (cross-check) — `#plugin-entries`, `#validation-messages`

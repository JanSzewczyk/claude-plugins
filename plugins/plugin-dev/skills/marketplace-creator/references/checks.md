# What each check means, and how to repair it

Grouped by the layer that drifted. Every check is deterministic — none of them involve judgement
about whether a skill is *good*, only whether the repo's own statements about it agree.

---

## Contents

- [House conventions](#house-conventions)
- [Layer 1 — marketplace.json](#layer-1--marketplacejson)
- [Layer 2 — plugin.json](#layer-2--pluginjson)
- [The attribution contract (cuts across layers 1 and 2)](#the-attribution-contract-cuts-across-layers-1-and-2)
- [The $schema property (both manifests)](#the-schema-property-both-manifests)
- [Display metadata (plugin.json)](#display-metadata-pluginjson)
- [The dependencies contract (cuts across layers 1 and 2)](#the-dependencies-contract-cuts-across-layers-1-and-2)
- [Skill size and routing (every repo)](#skill-size-and-routing-every-repo)
- [Layer 3 — documentation](#layer-3--documentation)
- [The native pass](#the-native-pass)
- [The CLI pass: load, install, budget](#the-cli-pass-load-install-budget)

## House conventions

Some of what follows is a house rule rather than something Claude Code needs. A repo adopts those
rules by committing `.marketplace-creator.json` at its root (`.marketplace-doctor.json`, its old name, is still read):

```json
{ "conventions": true }
```

| Check | Without the file | With it |
| --- | --- | --- |
| Manifest or `version` missing | warning: both are optional | error |
| Attribution | warning when neither layer has `author`; a mismatch is always an error | each layer carries the block; unknown `author` keys and missing `email`/`url` warn |
| Agent frontmatter | `name` and `description` required; ignored keys warn | closed key set in a fixed order, every key required; ignored keys are errors |
| `agents` array | if present, unlisted files are errors; if absent, `agents/` is scanned | always required |
| Skill frontmatter | missing `description`, a differing `name` and non-kebab folders warn | closed key set in a fixed order; those three are errors |
| `dependencies` | a mismatch only when both layers declare it | both layers carry the same block |
| Doc tables | checked only if the file has a row for some plugin | every plugin needs a row |
| Per-plugin README | warning if a skill or agent is never mentioned | error unless the name appears in bold |
| `$schema` | warning when absent | error when absent |
| Manifest location | root `plugin.json` is read, warning | error: it must be `.claude-plugin/plugin.json` |
| Native pass | `claude plugin validate` | `claude plugin validate --strict` |

What the script could not audit is printed under `Not checked` (and in `skipped` with `--json`):
entries with a remote `source`, a missing doc table, a missing git checkout.

---

## Layer 1 — `marketplace.json`

The marketplace manifest is the only file where a **new plugin** must be registered by hand. New
skills and agents inside an existing plugin must *not* touch it. Local plugins are read from each
entry's `source` (`metadata.pluginRoot` included); `github`, `url`, `git-subdir` and other object
sources have nothing on disk, so they are listed under `Not checked`.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `<path>/ exists but is not listed in marketplace.json` | A directory with a manifest, `skills/`, `agents/` or `commands/` sits under `plugins/` or next to a listed plugin, but was never registered. Nobody installing the marketplace can see it. | Add an entry with `name` and `source: "./<path>"`. |
| `entry "<name>" points at a missing directory` | The plugin was renamed, moved, or deleted and the entry was left behind. Installing the marketplace fails here. | Fix `source`, or remove the entry if the plugin is genuinely gone. |
| `entry "<name>" lives in directory "<other>"` (warning, conventions only) | The entry name and the folder name disagree. Both are used as the plugin id depending on the surface, so this is a latent id collision. | Rename the folder to match the entry, and update `source`. |
| `entry has no name` / `no source` | Hand-edited JSON. | Restore the missing field. |

---

## Layer 2 — `plugin.json`

The manifest lives at `.claude-plugin/plugin.json`. A `plugin.json` beside `skills/` is still read, but flagged as misplaced.

The important asymmetry, and the source of most silent breakage:

- **`agents` in the manifest replaces the default scan of `agents/`.** Once it exists, an agent
  file that is not listed is never loaded. The repo looks correct, the agent simply does not exist
  at runtime. Without it, the folder is scanned.
- **`skills` adds to the default scan of `skills/`.** A new skill folder is discovered
  automatically. There is nothing to register — which is why skill drift shows up in the
  *documentation* rather than in the manifest.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `plugin.json sits in the plugin root` (warning; error with conventions) | Claude Code reads the manifest from `.claude-plugin/plugin.json`. A copy beside `skills/` is the older layout and may be ignored at install, taking `dependencies`, `displayName` and the `agents` list with it. | `git mv <plugin>/plugin.json <plugin>/.claude-plugin/plugin.json`. Paths inside it stay relative to the plugin directory, so nothing else changes. |
| `<folder>/ sits inside .claude-plugin/ and never loads` | A component folder was put next to the manifest. Only `plugin.json` belongs in `.claude-plugin/`. | Move the folder to the plugin root. |
| `CLAUDE.md in a plugin is never loaded as context` (warning) | Instructions were written where nothing reads them. | Move them into a skill (`user-invocable: false` for background knowledge). |
| `agents/<file>.md exists but is not listed in plugin.json` | The manifest has an `agents` value and the agent will not load. This is the check most worth having. With conventions on, the array is required even if the folder would be scanned. | Append `"./agents/<file>.md"` to the `agents` array. |
| `agents[] references a missing file` | The agent was renamed or deleted; the manifest still points at it. | Fix the path, or drop the entry. |
| `plugin.json name is "x" but marketplace.json lists it as "y"` | Ambiguous plugin id. | Make them identical — prefer changing the manifest if the marketplace name is already published. |
| `version "x" disagrees with marketplace.json` | Both layers set a version. `plugin.json` wins at install time and `claude plugin tag` refuses the mismatch. | Make them identical, or keep it in one layer. |
| `` no `version` in plugin.json or the marketplace entry `` (warning; error with conventions) | Installs follow the git commit, and there is nothing to tag. | Add `version`, unless following the commit is deliberate. |
| `version "..." is not semver` | A hand-typed version. Release tagging (`claude plugin tag`) will refuse it. | Restore `x.y.z`. |
| `skills is "..." — this repo's convention is the "./skills/" glob` (warning, conventions only) | Someone enumerated skills explicitly. It works, but every new skill now needs a manifest edit. | Replace with `"./skills/"` unless the deviation is deliberate. |

### Frontmatter contracts

With conventions on, both contracts are **closed sets in a fixed order** — a house rule, stricter
than what the runtime tolerates, which is why `claude plugin validate` does not catch it. Without
them, an agent needs `name` and `description`, and every official skill key is accepted.

- **Agents:** `name`, `version`, `lastUpdated`, `author`, `related-agents`, `description`,
  `tools`, `model`, `color`, `skills`. Every key is required. `permissionMode`, `hooks` and
  `mcpServers` are rejected: Claude Code ignores them on agents shipped in a plugin.
- **Skills:** exactly `name`, `description`, and optionally `allowed-tools`, `argument-hint` and
  `user-invocable`, in that order. No `version`, `tags`, `author`, `examples`, `metadata`.
  `user-invocable` takes `true` or `false`; `false` marks a background-knowledge skill that agents
  preload through `skills:` (the generated `*-rules` skills).

| Message | Repair |
| --- | --- |
| `frontmatter keys are out of order` | Reorder to the sequence above. The order is the contract; do not argue with it in the file. |
| `keys that plugin agents ignore` | Delete them. A hook that has to run goes in the plugin's `hooks/hooks.json`, where it is honoured. |
| `unrecognized ... keys` / `carries keys outside the skill contract` | Delete the key. If the information matters, it belongs in the body, not the frontmatter. |
| `missing required keys` | Fill them in. A missing `description` on an agent or skill means it will never route. |
| `frontmatter name does not match the folder` | The folder name becomes the slash command; the frontmatter name must equal it. Rename the frontmatter, not the folder, unless the command name is wrong. |
| `skill directory has no SKILL.md` | Either the entry point is missing (the skill never loads) or this is a stray directory. Both need a human decision. |

Note on YAML: a `description:` written as an indented block over several lines is valid and the
script reads it correctly. A `description:` that is genuinely empty is an error.

---

## The attribution contract (cuts across layers 1 and 2)

Two surfaces read two different files. The marketplace browser renders the **entry in
`marketplace.json`**; an installed plugin renders its **own `plugin.json`**. Values set in both must
agree. With conventions on, both layers carry this block, because attribution written into only one
of them is invisible in the other view:

```json
{
  "author": { "name": "...", "email": "...", "url": "..." },
  "homepage": "https://github.com/<owner>/<repo>",
  "license": "MIT"
}
```

| Message | What actually broke | Repair |
| --- | --- | --- |
| ``entry "<name>" has no `author` object`` / ``plugin.json has no `author` object`` | The plugin is displayed attributed to nobody in that surface. Usually a new plugin created by copying a manifest before the standard existed. | Add the block above. Copy it verbatim from a sibling plugin if the repo uses one author. |
| ``author has no `name` `` | `author` exists but is empty or a bare string. `name` is the field every surface actually renders. | Make `author` an object with at least `name`. |
| `author is missing: email, url` (warning, conventions only) | Partial attribution. Renders, but there is no way to reach the author. | Fill both in. |
| `author carries unrecognized keys` (warning, conventions only) | Someone added `github`, `twitter`, `nick`, … The contract is a closed set of three. | Drop the extra keys. |
| ``has no `homepage` `` (warning) | Nothing links the listing back to the source repository. | Point it at the repo root. |
| ``has no `license` `` (warning) | Legally the plugin cannot be used by whoever installs it. | Add the SPDX id, and make sure a `LICENSE` file actually exists. |
| `author.name is "X" but marketplace.json says "Y"` | The two layers drifted — the plugin is attributed to one author while browsing and another once installed. | Make them identical. The marketplace entry is the one users see first, but neither is more authoritative: pick the correct value and write it into both. |
| `license "X" disagrees with marketplace.json` | Same drift, on the license. | Same repair. |
| ``marketplace has no `owner.name` `` | The marketplace itself is unattributed; every plugin without its own author falls back to nothing. | Add `owner: { name, email, url }` at the top of `marketplace.json`. |

When adding a **new plugin**, write this block into both manifests at creation time rather than
letting the doctor find it later — it is the single most-forgotten part of registering a plugin.

---

## The `$schema` property (both manifests)

A `$schema` URL lets editors validate and autocomplete a manifest while it is typed. Claude Code
ignores the key at load time, so a manifest without it works — it only loses that feedback.
`marketplace.json` uses `https://www.schemastore.org/claude-code-marketplace.json`, each
`plugin.json` `https://www.schemastore.org/claude-code-plugin-manifest.json`. Any other URL or path is
accepted: a repo may pin its own copy.

| Message | What actually broke | Repair |
| --- | --- | --- |
| ``has no `$schema` `` (warning; error with conventions) | The manifest gets no editor validation. | Add `"$schema"` as the first key, or run the script with `--fix`, which inserts the line and leaves the rest of the file untouched. |
| ``$schema is not a URL or path`` | The value is empty, not a string, or not a URL. Editors silently ignore it. | Use the URL above. |

---

## Display metadata (`plugin.json`)

`claude plugin validate` doesn't require either of these — a plugin without them still loads and
runs. They only affect how the plugin looks in the `/plugin` marketplace browser:

- **`displayName`** replaces the raw kebab-case `name` in the UI. Without it, `code-quality`
  shows up as `code-quality` instead of `Code Quality`.
- **`keywords`** (array of strings) is what the browser's search matches against. Without them,
  a plugin is findable only by typing its exact `name`.

Neither field controls the icon, the "by `<author>`" line (that's `author.name`), or a "New"
badge — those come from the attribution block above and from Anthropic's own curated directory,
which a self-hosted marketplace entry can't reproduce.

| Message | What actually broke | Repair |
| --- | --- | --- |
| ``plugin.json has no `displayName` `` (warning) | The browser falls back to the raw slug. | Add a Title Case name, e.g. `"displayName": "Code Quality"` for `name: "code-quality"`. |
| ``displayName` is identical to `name`` (warning) | The field is set but adds nothing over the slug. | Give it an actual human-readable title. |
| ``plugin.json has no `keywords` `` (warning) | The plugin can't be found by topic search in the browser. | Add 3-5 lowercase terms a user would search for — the tech stack and the capability, not the plugin name itself. |

---

## The dependencies contract (cuts across layers 1 and 2)

An agent that preloads a skill through `skills:` only gets it when the plugin that owns the skill
is installed. A plugin that preloads from another one therefore declares it in `dependencies`,
which Claude Code installs automatically and checks at load time. `claude plugin validate` checks
only the shape of an entry: it accepts a range that no version satisfies, a name that does not
exist, and a cycle. It also does not read a `plugin.json` at the plugin root, so the marketplace
entry is the copy that is enforced. With conventions on, both layers carry the same block, like
attribution; otherwise they only have to agree when both declare it:

```json
"dependencies": [
  { "name": "testing", "version": "^2.2.0" }
]
```

| Message | What actually broke | Repair |
| --- | --- | --- |
| `` `dependencies` differs between plugin.json and the marketplace.json entry `` | One layer was edited alone. The installed plugin follows the marketplace entry. | Make the two blocks identical. |
| `skills: preloads "<s>" from <p>, but <q> does not depend on <p>` | Installing `<q>` alone leaves the agent without the skill, silently. | Add the dependency the hint prints, in both manifests, or drop the preload. |
| `depends on "<p>", which is not a plugin in this marketplace` | A typo, or a renamed or removed plugin. The install fails. | Fix the name. A plugin from another marketplace needs `"marketplace"` set (and the allowlist in `marketplace.json`). |
| `requires <p> <range>, but <p> is at <version>` | The dependency's own `version` falls outside the range, so the dependent plugin fails to load. | Widen the range, or bump it to the dependency's new major on purpose. |
| `no release tag of <p> satisfies <range>` (warning, only in a repo with `*--v*` tags) | No `<p>--v<version>` tag matches. Relative-path plugins still load from the marketplace copy, but a pinned install has nothing to resolve to. | Release the dependency with the `claude plugin tag` command the hint prints. |
| `cannot evaluate the range "<r>"` (warning) | The doctor reads `x.y.z`, `=`, `^`, `~` and `>=`. | Use one of those forms. |
| `dependency cycle: a → b → a` / `depends on itself` | Installing either plugin installs both, and how a cycle resolves is undocumented. | Drop the preload that closes the cycle, as `nextjs-backend-engineer` did with `firebase-firestore`. |
| `skills: preloads "<s>", which no plugin in this marketplace provides` (warning) | A misspelled or removed skill, or one from outside the marketplace. The agent starts without it. | Fix or drop the name. |

---

## Skill size and routing (every repo)

| Message | What actually broke | Repair |
| --- | --- | --- |
| `description is N characters; the skill listing cuts it at 1536` (warning) | The listing truncates `description` + `when_to_use`; trigger phrases and the `NOT for` clause at the end are lost first. | Cut the description to what it does, when to use it, what it is not for. Move detail into the body. |
| `SKILL.md is N lines` (warning) | Past 500 lines the whole body is paid on every use, and only its first 5,000 tokens survive compaction. | Move tables, long examples and rare cases into `references/`. |
| `SKILL.md frontmatter carries keys Claude Code does not read` (warning, without conventions) | An unknown key is ignored silently — usually a typo such as `allowed_tools`. | Fix the spelling, or drop the key. |
| `agent frontmatter carries keys that plugin agents ignore` | `permissionMode`, `hooks`, `mcpServers` and `initialPrompt` are dropped from plugin agents. | Put hooks in `hooks/hooks.json` and servers in `.mcp.json`. |

---

## Layer 3 — documentation

Nothing here affects runtime. All of it affects whether a user can find a capability, and whether
the next Claude session working in the repo has an accurate map.

A table counts as maintained once it has a row for any plugin (`| **name**` in `CLAUDE.md`,
`| [**name**]` or `| **name**` in the root README); without one it goes under `Not checked`, unless
conventions are on. Agents and Skills columns are found by their header, and a table without them
is not compared. A non-numeric cell in a root README counts as a note rather than a stale count.

| Message | Repair |
| --- | --- |
| `Plugins table row "<p>" does not list the skill "<s>"` (CLAUDE.md) | Add the skill to the row's Skills cell. **Never** resolve this by deleting the skill. |
| `Plugins table row "<p>" lists "<s>", which no longer exists` | Check `git log -- plugins/<p>/skills/<s>` first. Deliberately removed → drop it from the table. Moved → point the table at its new home. |
| `row "<p>" claims N skill(s) but the plugin has M` (root README) | The root table carries counts, not names. Update the number. |
| `README does not document the skill "<s>"` (per-plugin README) | Add a row to that README's skills table: name in bold, the `/slash-command`, and one line on what it does. Match the surrounding rows' style. |
| `plugin has no README.md` (warning) | Every plugin should have one. `/repository-documentation` generates it. |

With conventions on, the per-plugin check looks for the skill or agent name in **bold** (`**name**`)
anywhere in the README, so a skill mentioned only in prose is flagged: it belongs in the table.
Without them, any mention of the name counts, and a miss is a warning.

---

## The native pass

Unless `--no-native` is given, the script runs `claude plugin validate <target>` against the repo
root and each local plugin, and reports the output verbatim under the matching scope. It adds
`--strict`, which fails on the validator's own warnings, when conventions are on or the script
itself was given `--strict`. If the
`claude` CLI is not on `PATH`, the pass is skipped with a warning rather than failing the run.

Anything reported by that pass is a **schema** problem — fix it against the message it prints, not
against this file. If it disagrees with something here, the native validator wins: house
conventions can only be stricter than the runtime's, never looser.

---

## The CLI pass: load, install, budget

`scripts/check-cli.mjs` asks the CLI what neither the native pass nor the drift check can see.
Load and install run in a throwaway `HOME` and `CLAUDE_CONFIG_DIR` deleted afterwards, so the
user's settings, installs and marketplaces are never read or written. Entries with a remote
source are listed under Not checked. Needs Claude Code 2.1.265 or later.

| Check | Message | What it means | Repair |
| --- | --- | --- | --- |
| load | `Path not found: <path> (agents)` (or skills, hooks, …) | A component path in `plugin.json` names a file that isn't there; the rest of the plugin loads with errors | Fix the path or create the file; a missing agent is also a drift error in the main script |
| load | `Failed to load plugin: …` / `not listed at all` | A corrupt manifest or an invalid `hooks.json`; the whole plugin is dropped | Fix the file the message names, then `claude plugin validate` it |
| install | `Source path does not exist: <path>` | The entry's relative `source` points at a missing directory | Fix the `source` or move the plugin |
| install | `Dependency "<p>@<m>" is installed at <v>, which does not satisfy: <range>` | A dependency range no version of that plugin satisfies | Raise the dependency's version or widen the range, in both manifests |
| install | `` `claude plugin marketplace add` failed `` | A reserved or invalid marketplace name, or a catalog the CLI rejects | Read the CLI output under the message |
| budget | `~<n> always-on tokens, over <warn>` / `at or over <fail>` | Skill and agent descriptions every session pays for, whether or not the plugin is used. Defaults warn above 1,800 and fail at 2,000, where the official marketplace highlights the cost | Shorten the longest descriptions (the per-component table of `claude plugin details <plugin>` names them), move rarely used skills behind `disable-model-invocation`, or split the plugin |

The budget is only as good as the count. A signed-in CLI counts through the API; signed out it
prints an offline estimate 25–40% lower, so the script scales both limits by `--offline-factor`
(0.77, the lowest counted-to-offline ratio measured) and says `offline estimate` in the report.
An offline failure is always a real one; an offline pass near the limit is worth a signed-in run.

A dependency range with no matching `<plugin>--v*` tag is a drift warning (the dependencies
contract), not an install error: on Claude Code 2.1.309 a directory or GitHub marketplace
installs on the `plugin.json` versions, so the tag matters to `claude plugin update` and to users
whose recorded version came from an older tag, not to a fresh install.

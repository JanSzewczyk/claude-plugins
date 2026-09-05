# What each check means, and how to repair it

Grouped by the layer that drifted. Every check is deterministic — none of them involve judgement
about whether a skill is *good*, only whether the repo's own statements about it agree.

---

## Layer 1 — `marketplace.json`

The marketplace manifest is the only file where a **new plugin** must be registered by hand. New
skills and agents inside an existing plugin must *not* touch it.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `plugins/<name>/ exists but is not listed in marketplace.json` | A plugin directory was created but never registered. Nobody installing the marketplace can see it. | Add an entry with `name` and `source: "./plugins/<name>"`. |
| `entry "<name>" points at a missing directory` | The plugin was renamed, moved, or deleted and the entry was left behind. Installing the marketplace fails here. | Fix `source`, or remove the entry if the plugin is genuinely gone. |
| `entry "<name>" lives in directory "<other>"` (warning) | The entry name and the folder name disagree. Both are used as the plugin id depending on the surface, so this is a latent id collision. | Rename the folder to match the entry, and update `source`. |
| `entry has no name` / `no source` | Hand-edited JSON. | Restore the missing field. |

---

## Layer 2 — `plugin.json`

The important asymmetry, and the source of most silent breakage:

- **`agents` is an explicit array of paths.** An agent file that is not listed is never loaded.
  The repo looks correct, the agent simply does not exist at runtime.
- **`skills` is a directory glob (`"./skills/"`).** A new skill folder is discovered
  automatically. There is nothing to register — which is why skill drift shows up in the
  *documentation* rather than in the manifest.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `agents/<file>.md exists but is not listed in plugin.json` | The agent will not load. This is the check most worth having. | Append `"./agents/<file>.md"` to the `agents` array. |
| `agents[] references a missing file` | The agent was renamed or deleted; the manifest still points at it. | Fix the path, or drop the entry. |
| `plugin.json name is "x" but the directory is "y"` | Ambiguous plugin id. | Make them identical — prefer changing the manifest if the folder name is already published. |
| `version "..." is not semver` | A hand-typed version. Release tagging (`claude plugin tag`) will refuse it. | Restore `x.y.z`. |
| `skills is "..." — this repo's convention is the "./skills/" glob` (warning) | Someone enumerated skills explicitly. It works, but every new skill now needs a manifest edit. | Replace with `"./skills/"` unless the deviation is deliberate. |

### Frontmatter contracts

Both contracts are **closed sets in a fixed order** — this is a repo convention, stricter than
what the runtime tolerates, which is why `claude plugin validate` does not catch it.

- **Agents:** `name`, `version`, `lastUpdated`, `author`, `related-agents`, `description`,
  `tools`, `model`, `color`, `permissionMode`, `skills`, then optional `hooks`. Every key except
  `hooks` is required.
- **Skills:** exactly `name`, `description`, and optionally `allowed-tools` and `argument-hint`,
  in that order. No `version`, `tags`, `author`, `examples`, `metadata`.

| Message | Repair |
| --- | --- |
| `frontmatter keys are out of order` | Reorder to the sequence above. The order is the contract; do not argue with it in the file. |
| `unrecognized ... keys` / `carries keys outside the four-field contract` | Delete the key. If the information matters, it belongs in the body, not the frontmatter. |
| `missing required keys` | Fill them in. A missing `description` on an agent or skill means it will never route. |
| `frontmatter name does not match the folder` | The folder name becomes the slash command; the frontmatter name must equal it. Rename the frontmatter, not the folder, unless the command name is wrong. |
| `skill directory has no SKILL.md` | Either the entry point is missing (the skill never loads) or this is a stray directory. Both need a human decision. |

Note on YAML: a `description:` written as an indented block over several lines is valid and the
script reads it correctly. A `description:` that is genuinely empty is an error.

---

## Layer 3 — documentation

Nothing here affects runtime. All of it affects whether a user can find a capability, and whether
the next Claude session working in the repo has an accurate map.

| Message | Repair |
| --- | --- |
| `Plugins table row "<p>" does not list the skill "<s>"` (CLAUDE.md) | Add the skill to the row's Skills cell. **Never** resolve this by deleting the skill. |
| `Plugins table row "<p>" lists "<s>", which no longer exists` | Check `git log -- plugins/<p>/skills/<s>` first. Deliberately removed → drop it from the table. Moved → point the table at its new home. |
| `row "<p>" claims N skill(s) but the plugin has M` (root README) | The root table carries counts, not names. Update the number. |
| `README does not document the skill "<s>"` (per-plugin README) | Add a row to that README's skills table: name in bold, the `/slash-command`, and one line on what it does. Match the surrounding rows' style. |
| `plugin has no README.md` (warning) | Every plugin should have one. `/repository-documentation` generates it. |

The per-plugin check looks for the skill or agent name in **bold** (`**name**`) anywhere in the
README, which is how the tables in this repo are written. A skill mentioned only in prose will
still be flagged — that is intentional: it belongs in the table.

---

## The native pass

Unless `--no-native` is given, the script runs `claude plugin validate <target> --strict` against
the repo root and each plugin, and reports the output verbatim under the matching scope. If the
`claude` CLI is not on `PATH`, the pass is skipped with a warning rather than failing the run.

Anything reported by that pass is a **schema** problem — fix it against the message it prints, not
against this file. If it disagrees with something here, the native validator wins: this repo's
conventions can only be stricter than the runtime's, never looser.

---
name: plugin-release
description: Cut a release for one or more plugins in a Claude Code marketplace repo — work out which plugins changed since the last tag, propose the semver bump each change implies, write the new versions into plugin.json, keep the docs tables in step, and create the release tags with `claude plugin tag`. Use when the user wants to release, publish, version, or tag a plugin, asks "what needs a version bump", says they forgot to bump a version, or has finished a batch of skill and agent edits and wants the repo release-ready.
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[plugin name to release, or nothing for every changed plugin]"
---

# Plugin Release

In a marketplace with no changelog, the manifest is the entire release record — so the version
bump is the release. This skill makes that bump correct and repeatable instead of remembered.

> - [scripts/plan-release.mjs](./scripts/plan-release.mjs) — diffs each plugin against its last
>   release, and proposes a bump per plugin with its reasons. `--apply` writes them.

## The versioning rules

If the repository's `CLAUDE.md` has a Versioning section, read it before deciding anything: it is
the contract, and where it differs from the defaults below, it wins.

- **Versions live in the manifest**, in `plugin.json` or the marketplace entry. A plugin with
  neither follows the git commit and has nothing to bump; the plan says so. **Skills have no
  version field** — a skill's version is its parent plugin's version.
- **Every plugin bumps independently.** Three plugins changed in one batch means three separate
  decisions, not one bump size applied across all of them.
- **An agent that carries its own `version`** bumps along with its plugin, and sets `lastUpdated`
  to today if it has one. The script flags which agents need this; it does not edit agent
  frontmatter for you, because the agent's own semver is a semantic call.

Bump sizes: **patch** for wording, typos, formatting and other non-behavioral edits; **minor** for
a new skill or agent, a new capability, meaningfully expanded guidance; **major** for a removed or
renamed skill or agent, a changed frontmatter contract, or a restructure that invalidates prior
usage.

## Run it

The script ships with this skill, not with the repo you are releasing. The argument is the
marketplace repo root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/plan-release.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--since <ref>` | What to compare every plugin against. Defaults per plugin to its last `<plugin>--v*` tag; a repo without such tags uses its last plain tag, then the upstream branch, then `HEAD~1`. |
| `--plugin <name>` | Plan only that plugin. |
| `--apply` | Write the proposed versions into every layer that declares one. Without it the script only reports. |
| `--json` | Machine-readable plan. |

The plan includes **uncommitted work**, so a new skill that exists only in the working tree is
still seen as a new skill. That is deliberate: you plan a release before committing the bump, not
after.

Plugins are found through each marketplace entry's `source`. Under `not planned` the script names
what it cannot release: remote sources, which ship from their own repo, and plugins with no version.
A plugin with no tag in a repo that tags per plugin is a **first release**: tag the version it
already declares, with no bump.

## The workflow

1. **Run the planner without `--apply` first** and read the reasons per plugin. The script
   proposes a *floor*, derived from what files moved — it cannot see intent.
2. **Overrule it where the diff is semantically bigger than it looks.** The script says patch for
   an edit inside an existing skill. If that edit changed the skill's frontmatter contract,
   renamed its slash command, or removed a documented capability, it is a **major** and you must
   say so. This step is the reason the skill exists; do not skip it.
3. **Run `/marketplace-doctor` before bumping anything.** A release that ships a README claiming
   the wrong skill count is the failure this pairing exists to prevent. Fix the drift first — the
   doc edits belong in the same release, not a follow-up.
4. **Apply the bumps.** `--apply` for the mechanical ones; edit the manifest by hand where you
   overruled the proposal. For every agent the script flagged, bump its frontmatter `version` and
   set `lastUpdated` to today's date.
5. **Commit** the version bumps together with the changes they describe.
6. **Tag**, with the path the plan printed for that plugin. The native command validates that
   `plugin.json` and the marketplace entry agree before it writes anything:
   ```bash
   claude plugin tag <plugin-path> --dry-run
   claude plugin tag <plugin-path> -m "<name> v%s" --push
   ```
   It creates `<name>--v<version>`. Refuses to run on a dirty tree, and refuses to overwrite an
   existing tag — both are guardrails, not obstacles; do not reach for `--force` to get past them.

## Guardrails

- **Never bump without a reason you can state.** If you cannot name what changed, the plugin
  probably should not be released.
- **Never tag a dirty tree, and never `--force` a tag.** A tag that does not correspond to a
  commit is worse than no tag.
- **Do not create a `CHANGELOG.md`** in a repo that has none: versioning goes through the manifest,
  and release notes belong in the tag annotation (`-m`). Keep one that already exists up to date.
- **Pushing tags is a publishing action** — confirm with the user before `--push`, even when they
  asked for a release.

## Reporting back

One line per plugin: name, old version → new version, bump size, and the one-phrase reason.
Then the tag commands, and explicitly whether they were run or are waiting for confirmation.

---
name: plugin-release
description: Cut a release for one or more plugins in a Claude Code marketplace repo — work out which plugins changed since the last tag, propose the semver bump each change implies, write the new versions into plugin.json, keep the docs tables in step, and create the release tags with `claude plugin tag`. Use when the user wants to release, publish, version, or tag a plugin, asks "what needs a version bump", says they forgot to bump a version, or has finished a batch of skill and agent edits and wants the repo release-ready.
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[plugin name to release, or nothing for every changed plugin]"
---

# Plugin Release

In a marketplace with no changelog, `plugin.json` is the entire release record — so the version
bump is the release. This skill makes that bump correct and repeatable instead of remembered.

> - [scripts/plan-release.mjs](./scripts/plan-release.mjs) — diffs the repo against a git ref,
>   groups the changes per plugin, and proposes a bump per plugin with its reasons. `--apply`
>   writes them.

## What the repo's rules already say

Read the repository's `CLAUDE.md` before deciding anything — the Versioning section is the
contract, and this skill implements it rather than replacing it. The parts that matter most:

- **Versions live in two places.** `plugin.json` (`version`, per plugin) and agent frontmatter
  (`version` + `lastUpdated`, per agent). **Skills have no version field** — a skill's version is
  its parent plugin's version.
- **Every plugin bumps independently.** Three plugins changed in one batch means three separate
  decisions, not one bump size applied across all of them.
- **Editing an agent bumps both** that agent's own `version` and its plugin's — and sets
  `lastUpdated` to today. The script flags which agents need this; it does not edit agent
  frontmatter for you, because `lastUpdated` and the agent's own semver are semantic calls.

Bump sizes: **patch** for wording, typos, formatting and other non-behavioral edits; **minor** for
a new skill or agent, a new capability, meaningfully expanded guidance; **major** for a removed or
renamed skill or agent, a changed frontmatter contract, or a restructure that invalidates prior
usage.

## Run it

The script sits next to this SKILL.md at `scripts/plan-release.mjs` — invoke it by its absolute
path, built from this skill's own directory. The argument is the marketplace repo root:

```bash
node "<skill-dir>/scripts/plan-release.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--since <ref>` | What to compare against. Defaults to the last git tag, then the upstream branch, then `HEAD~1`. |
| `--plugin <name>` | Plan only that plugin. |
| `--apply` | Write the proposed versions into each `plugin.json`. Without it the script only reports. |
| `--json` | Machine-readable plan. |

The plan includes **uncommitted work**, so a new skill that exists only in the working tree is
still seen as a new skill. That is deliberate: you plan a release before committing the bump, not
after.

## The workflow

1. **Run the planner without `--apply` first** and read the reasons per plugin. The script
   proposes a *floor*, derived from what files moved — it cannot see intent.
2. **Overrule it where the diff is semantically bigger than it looks.** The script says patch for
   an edit inside an existing skill. If that edit changed the skill's frontmatter contract,
   renamed its slash command, or removed a documented capability, it is a **major** and you must
   say so. This step is the reason the skill exists; do not skip it.
3. **Run `/marketplace-doctor` before bumping anything.** A release that ships a README claiming
   the wrong skill count is the exact failure this repo keeps hitting. Fix the drift first — the
   doc edits belong in the same release, not a follow-up.
4. **Apply the bumps.** `--apply` for the mechanical ones; edit `plugin.json` by hand where you
   overruled the proposal. For every agent the script flagged, bump its frontmatter `version` and
   set `lastUpdated` to today's date.
5. **Commit** the version bumps together with the changes they describe.
6. **Tag.** The native command validates that `plugin.json` and the marketplace entry agree before
   it writes anything:
   ```bash
   claude plugin tag plugins/<name> --dry-run
   claude plugin tag plugins/<name> -m "<name> v%s" --push
   ```
   It creates `<name>--v<version>`. Refuses to run on a dirty tree, and refuses to overwrite an
   existing tag — both are guardrails, not obstacles; do not reach for `--force` to get past them.

## Guardrails

- **Never bump without a reason you can state.** If you cannot name what changed, the plugin
  probably should not be released.
- **Never tag a dirty tree, and never `--force` a tag.** A tag that does not correspond to a
  commit is worse than no tag.
- **Do not create a `CHANGELOG.md`.** This repo deliberately has none; versioning goes through
  `plugin.json`. If release notes are wanted, they belong in the tag annotation (`-m`).
- **Pushing tags is a publishing action** — confirm with the user before `--push`, even when they
  asked for a release.

## Reporting back

One line per plugin: name, old version → new version, bump size, and the one-phrase reason.
Then the tag commands, and explicitly whether they were run or are waiting for confirmation.

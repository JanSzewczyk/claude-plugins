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

- **Versions live in the manifest**, in `.claude-plugin/plugin.json` or the marketplace entry. A plugin with
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
| `--check` | The CI gate, with `--since <base>`: exit 1 when a changed plugin has no bump, a warning when the bump is smaller than the change implies. Writes nothing. |

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
3. **Run `/marketplace-creator audit` before bumping anything.** A release that ships a README claiming
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

## Rules

The plugin authoring rules behind these checks, generated from the knowledge notes. Open one when a
finding needs its reason or its fix.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 16 note(s) (sha256 3744261c2336); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Bump the plugin version in every change that touches the plugin](references/rules.md#bump-the-plugin-version-in-every-change-that-touches-the-plugin) — A pinned version keeps users on the cached copy until the string changes, however many commits land. | claude-code |
| critical | [Keep plugin.json in .claude-plugin/ and every component at the plugin root](references/rules.md#keep-pluginjson-in-claude-plugin-and-every-component-at-the-plugin-root) — The manifest is .claude-plugin/plugin.json; skills/, agents/ and hooks/ sit beside .claude-plugin/, never in it. | claude-code |
| high | [Give a version range to every dependency whose skills or tools your plugin calls](references/rules.md#give-a-version-range-to-every-dependency-whose-skills-or-tools-your-plugin-calls) — An unconstrained dependency moves to every release, so one rename breaks your plugin for everyone who updates. | claude-code |
| high | [Keep name, version and dependencies identical in plugin.json and the marketplace entry](references/rules.md#keep-name-version-and-dependencies-identical-in-pluginjson-and-the-marketplace-entry) — Two surfaces read two files; a value set in both must match, or install and browse disagree. | claude-code |
| high | [Read plugin files from CLAUDE_PLUGIN_ROOT and write state to CLAUDE_PLUGIN_DATA](references/rules.md#read-plugin-files-from-claude_plugin_root-and-write-state-to-claude_plugin_data) — The install directory changes on every update; state written there is lost. | claude-code |
| high | [Keep a skill description inside the 1,536-character listing limit](references/rules.md#keep-a-skill-description-inside-the-1536-character-listing-limit) — The listing cuts description + when_to_use at 1,536 characters; the rest never reaches the router. | claude-code |
| high | [List every agent file once the manifest sets agents](references/rules.md#list-every-agent-file-once-the-manifest-sets-agents) — `agents`, `commands`, `outputStyles` and `workflows` replace their default folder scan; `skills` only adds to it. | claude-code |
| high | [Tag a release for every version another plugin's dependency range points at](references/rules.md#tag-a-release-for-every-version-another-plugins-dependency-range-points-at) — Dependency ranges resolve against <plugin>--v<version> git tags, not against plugin.json. | claude-code |
| high | [Treat a published plugin's name as permanent and relabel it with displayName](references/rules.md#treat-a-published-plugins-name-as-permanent-and-relabel-it-with-displayname) — Installs, settings and configuration are keyed by name; a renamed plugin is a different plugin to every user. | claude-code |
| high | [Run claude plugin validate and the drift check on every pull request](references/rules.md#run-claude-plugin-validate-and-the-drift-check-on-every-pull-request) — validate checks each manifest's shape; the drift check catches docs, agents arrays and versions that fell behind. | claude-code |
| medium | [Install the plugin from a local marketplace before pushing a release](references/rules.md#install-the-plugin-from-a-local-marketplace-before-pushing-a-release) — validate checks files; only an install finds a wrong source, a missing directory or a reserved name. | claude-code |
| medium | [Put instructions a plugin needs in a skill, not a CLAUDE.md inside the plugin](references/rules.md#put-instructions-a-plugin-needs-in-a-skill-not-a-claudemd-inside-the-plugin) — A CLAUDE.md at the plugin root is never loaded as context. | claude-code |
| medium | [Keep SKILL.md under 500 lines and move reference material into references/](references/rules.md#keep-skillmd-under-500-lines-and-move-reference-material-into-references) — Every body line is paid on each use; reference files load only when the task needs them. | claude-code |
| medium | [Put hooks and MCP servers in the plugin, never in plugin agent frontmatter](references/rules.md#put-hooks-and-mcp-servers-in-the-plugin-never-in-plugin-agent-frontmatter) — Plugin agents ignore permissionMode, hooks, mcpServers and initialPrompt; the plugin-level files are what load. | claude-code |
| medium | [Start every component path with ./ relative to the plugin root](references/rules.md#start-every-component-path-with--relative-to-the-plugin-root) — Paths in a manifest are relative to the plugin root, start with ./, use forward slashes and never contain .. | claude-code |
| low | [Open every plugin.json and marketplace.json with a SchemaStore $schema](references/rules.md#open-every-pluginjson-and-marketplacejson-with-a-schemastore-schema) — $schema gives editor validation and autocomplete; Claude Code ignores it at load, so it costs nothing. | claude-code |

<!-- END:knowledge -->

## Reporting back

One line per plugin: name, old version → new version, bump size, and the one-phrase reason.
Then the tag commands, and explicitly whether they were run or are waiting for confirmation.

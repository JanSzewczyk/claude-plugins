---
name: marketplace-doctor
description: Audit a Claude Code plugin marketplace repository for drift between its manifest layers and the documentation that enumerates them by hand — marketplace.json vs the plugins on disk, plugin.json's explicit agents array vs the agent files, SKILL.md frontmatter contracts, the skill/agent tables in CLAUDE.md and every README, and the display metadata (displayName, keywords) that controls how each plugin looks in the /plugin marketplace browser. Use whenever the user asks to validate, audit, or health-check a marketplace or plugin repo, before publishing or tagging a plugin release, after adding or renaming a skill or agent, when plugins aren't showing descriptions/names properly in the browser, or when they say the docs are out of sync, "check the manifests", "did I forget to register something", or "is this repo consistent".
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[path to the marketplace repo root, defaults to the current directory]"
---

# Marketplace Doctor

A marketplace repo describes the same capabilities in five places: `marketplace.json`, each
`plugin.json`, the skill and agent files themselves, the root `README.md`, and every per-plugin
`README.md` — plus the Plugins table in `CLAUDE.md`. Only one of those is the truth; the rest are
typed by hand and silently rot. This skill finds the disagreements and fixes them. It works on any
marketplace: plugins are found through each entry's `source`, wherever they live.

> - [scripts/check-marketplace.mjs](./scripts/check-marketplace.mjs) — the deterministic sweep.
>   Walks the repo, builds the real inventory, and reports every disagreement with a file path.
> - [references/checks.md](./references/checks.md) — what each check means, why it exists, and
>   the right repair for it. Read this before fixing anything you don't recognize.

## What this is not

`claude plugin validate <path> --strict` already answers **"is this manifest well-formed?"** —
schema, required fields, unrecognized keys. Do not reimplement it; the script shells out to it
when the CLI is on `PATH` and folds its output in.

This skill answers the question the native validator cannot: **"does the repo still describe
itself truthfully?"** A `plugin.json` that lists two agents when three exist on disk is perfectly
valid JSON — and the third agent will never load. A README claiming 6 skills when there are 7 is
valid Markdown — and the seventh is invisible to anyone reading the docs.

## House conventions are opt-in

Drift is checked everywhere. Rules that go beyond what Claude Code requires apply only to a repo
that commits `.marketplace-doctor.json` with `{ "conventions": true }`: the closed frontmatter key
sets, an explicit `agents` array, attribution and `dependencies` in both manifests, a bold README
row per skill. Without that file they stay quiet or drop to warnings, so do not tell the user their
repo breaks a rule it never adopted. See [references/checks.md](./references/checks.md#house-conventions).

## Attribution is checked across both layers

The browse view reads the marketplace entry, the installed view reads `plugin.json`. A value set in
both must match, or it is an error. A plugin with no `author` anywhere gets a warning, and with
conventions on each layer must carry `author`, `homepage` and `license` itself. See
[references/checks.md](./references/checks.md#the-attribution-contract-cuts-across-layers-1-and-2).

## Cross-plugin preloads need a declared dependency

An agent whose `skills:` names a skill from another plugin makes its plugin depend on that one.
The doctor checks that the dependency is declared, that two layers declaring it agree, that each
range is satisfied by the dependency's current version and by a release tag (in a repo that tags
releases), and that no two plugins depend on each other. See [references/checks.md](./references/checks.md#the-dependencies-contract-cuts-across-layers-1-and-2).

## Display metadata controls how a plugin looks in the browser

`displayName` and `keywords` in `plugin.json` are what make a plugin show a readable title and be
findable by search in the `/plugin` marketplace browser — the thing to check when a user says their
plugins "don't display nicely". Both are checked but only ever warnings, since the plugin still
loads without them. See [references/checks.md](./references/checks.md#display-metadata-pluginjson).

## Manifests carry a `$schema`

`marketplace.json` and each `plugin.json` should open with a `$schema` URL, which gives editors
validation and autocomplete. A missing one is a warning (an error with conventions); `--fix` adds
it. See [references/checks.md](./references/checks.md#the-schema-property-both-manifests).

## The manifest belongs in `.claude-plugin/`

Claude Code reads `<plugin>/.claude-plugin/plugin.json`. A `plugin.json` in the plugin root is
still found by this skill, but reported (a warning, an error with conventions) and moved with
`git mv`. See [references/checks.md](./references/checks.md#layer-2--pluginjson).

## Run it

The script ships with this skill, not with the repo you are auditing (they are usually different
repos). The argument is the marketplace repo root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-marketplace.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--json` | Machine-readable report: full inventory plus every issue. Use it in CI or when you want to diff two runs. |
| `--strict` | Warnings fail the run too (exit 1). Use in CI once the repo is clean. |
| `--fix` | Insert the missing `$schema` line into each manifest. The only flag that writes, and it changes nothing else in the file. |
| `--no-native` | Skip the `claude plugin validate` pass — useful when the CLI is unavailable or you only care about doc drift. |

The text report opens with a banner and the counts, then a per-plugin checklist (`✓` clean, `⚠`
warnings, `✗` errors, with version, skill and agent counts), the issues grouped by plugin, and a
closing status line. Colour appears only on a terminal; set `NO_COLOR` to turn it off.

Exit code is 0 when clean, 1 when anything failed. Without `--fix` the script never writes to the repo.

## The workflow

1. **Run the script first, before reading any file.** It is cheap and it tells you exactly which
   files are worth opening. Do not start by grepping the repo by hand.
2. **Read [references/checks.md](./references/checks.md) for every issue class in the output.**
   Several failures have a repair that is not the obvious one — in particular, a "does not list
   the skill" error in `CLAUDE.md` is fixed in the table, never by deleting the skill.
3. **Fix the source of truth, not the report.** The plugins, agents and skills on disk are the
   truth. Manifests and docs follow them. If a doc lists something that no longer exists, the
   right fix is almost always to remove the stale row — but confirm with `git log` that the
   capability was deliberately deleted rather than accidentally moved.
4. **Group the fixes by file, not by issue.** One edit per README beats seven.
5. **Re-run the script.** A fix that does not move the count is not a fix.
6. **Bump the versions the repo's own rules require**, if it has any (look in its `CLAUDE.md`).
   `marketplace-doctor` does not bump versions for you, and it does not check them beyond "is this
   semver" and "do the two layers agree".

## Rules

The plugin authoring rules behind these checks, generated from the knowledge notes. Open one when a
finding needs its reason or its fix.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 13 note(s) (sha256 7eb12c614a11); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Bump the plugin version in every change that touches the plugin](references/rules.md#bump-the-plugin-version-in-every-change-that-touches-the-plugin) — A pinned version keeps users on the cached copy until the string changes, however many commits land. | claude-code |
| critical | [Keep plugin.json in .claude-plugin/ and every component at the plugin root](references/rules.md#keep-pluginjson-in-claude-plugin-and-every-component-at-the-plugin-root) — The manifest is .claude-plugin/plugin.json; skills/, agents/ and hooks/ sit beside .claude-plugin/, never in it. | claude-code |
| high | [Keep name, version and dependencies identical in plugin.json and the marketplace entry](references/rules.md#keep-name-version-and-dependencies-identical-in-pluginjson-and-the-marketplace-entry) — Two surfaces read two files; a value set in both must match, or install and browse disagree. | claude-code |
| high | [Read plugin files from CLAUDE_PLUGIN_ROOT and write state to CLAUDE_PLUGIN_DATA](references/rules.md#read-plugin-files-from-claude_plugin_root-and-write-state-to-claude_plugin_data) — The install directory changes on every update; state written there is lost. | claude-code |
| high | [Keep a skill description inside the 1,536-character listing limit](references/rules.md#keep-a-skill-description-inside-the-1536-character-listing-limit) — The listing cuts description + when_to_use at 1,536 characters; the rest never reaches the router. | claude-code |
| high | [List every agent file once the manifest sets agents](references/rules.md#list-every-agent-file-once-the-manifest-sets-agents) — `agents`, `commands`, `outputStyles` and `workflows` replace their default folder scan; `skills` only adds to it. | claude-code |
| high | [Tag a release for every version another plugin's dependency range points at](references/rules.md#tag-a-release-for-every-version-another-plugins-dependency-range-points-at) — Dependency ranges resolve against <plugin>--v<version> git tags, not against plugin.json. | claude-code |
| high | [Run claude plugin validate and the drift check on every pull request](references/rules.md#run-claude-plugin-validate-and-the-drift-check-on-every-pull-request) — validate checks each manifest's shape; the drift check catches docs, agents arrays and versions that fell behind. | claude-code |
| medium | [Put instructions a plugin needs in a skill, not a CLAUDE.md inside the plugin](references/rules.md#put-instructions-a-plugin-needs-in-a-skill-not-a-claudemd-inside-the-plugin) — A CLAUDE.md at the plugin root is never loaded as context. | claude-code |
| medium | [Keep SKILL.md under 500 lines and move reference material into references/](references/rules.md#keep-skillmd-under-500-lines-and-move-reference-material-into-references) — Every body line is paid on each use; reference files load only when the task needs them. | claude-code |
| medium | [Put hooks and MCP servers in the plugin, never in plugin agent frontmatter](references/rules.md#put-hooks-and-mcp-servers-in-the-plugin-never-in-plugin-agent-frontmatter) — Plugin agents ignore permissionMode, hooks, mcpServers and initialPrompt; the plugin-level files are what load. | claude-code |
| medium | [Start every component path with ./ relative to the plugin root](references/rules.md#start-every-component-path-with--relative-to-the-plugin-root) — Paths in a manifest are relative to the plugin root, start with ./, use forward slashes and never contain .. | claude-code |
| low | [Open every plugin.json and marketplace.json with a SchemaStore $schema](references/rules.md#open-every-pluginjson-and-marketplacejson-with-a-schemastore-schema) — $schema gives editor validation and autocomplete; Claude Code ignores it at load, so it costs nothing. | claude-code |

<!-- END:knowledge -->

## Reporting back

State the counts (plugins, agents, skills) and then the issues that remain, grouped by plugin.
Never claim the repo is clean unless the script exited 0 — quote the summary line as evidence, and
pass on its `Not checked` lines: remote plugins and missing doc tables were not audited.
If you fixed things, say what the count went from and to.

When the run is clean, say so in one line. Do not pad a clean report with a restatement of
everything that was checked.

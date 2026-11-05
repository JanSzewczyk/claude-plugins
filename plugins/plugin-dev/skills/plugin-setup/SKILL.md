---
name: plugin-setup
description: Set up a Claude Code plugin or marketplace repository so that every change is versioned, documented and checked — writes a managed plugin-development block into the project's CLAUDE.md (where manifests live, what to bump and update after each change, when to run the marketplace-creator audit and plugin-release), and optionally adds a CI workflow that fails a pull request with manifest drift or a missing version bump. Re-running refreshes the block in place. Use when starting or adopting a plugin repo, when version bumps or README updates keep getting forgotten, or when the user asks to "set up the plugin repo", "set up plugin-dev", "add the plugin workflow to CLAUDE.md", "make version bumps automatic", "skonfiguruj repo pluginów", "dodaj zasady pluginów do CLAUDE.md". NOT for building a plugin (plugin-creator), auditing an existing repo (marketplace-creator) or cutting a release (plugin-release).
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
argument-hint: "[path to the repo root, defaults to the current directory] [--ci]"
---

# Plugin Setup

Nothing in Claude Code bumps a plugin version, updates a README or runs a check on its own. What
happens after a change is whatever the project's `CLAUDE.md` tells Claude to do, plus whatever CI
refuses to merge. This skill writes both, so another plugin repository gets the same workflow as
this one without copying its `CLAUDE.md` by hand.

> - [templates/claude-md-block.md](./templates/claude-md-block.md) — the block written into
>   `CLAUDE.md`, with the placeholders step 3 fills.
> - [templates/plugin-checks.yml](./templates/plugin-checks.yml) — the optional CI workflow.
> - [references/rules.md](./references/rules.md) — the plugin authoring rules, generated from the
>   knowledge notes. The block links none of them; read them when a step below needs the reason.

## What is automatic, and what this changes

| Step | Without this skill | After it |
| --- | --- | --- |
| Version bump | only if someone remembers | `CLAUDE.md` tells Claude to do it in the same change; CI (`--ci`) fails a PR without it |
| README and doc tables | only if someone remembers | `CLAUDE.md` names the files; `/marketplace-creator audit` finds what is stale |
| Manifest drift, `$schema` | found at install | `/marketplace-creator audit` before each commit, and in CI |
| Release tags | manual | still manual, through `/plugin-release`: tagging publishes, so it stays a decision |

Say this to the user in their language when you report: the block makes the workflow the default,
CI makes it enforced, and nothing runs in the background.

## Steps

Show progress in a task list: one item per step below.

### 1. Find the repo shape

```bash
ls .claude-plugin/ 2>/dev/null
```

- `.claude-plugin/marketplace.json` → a marketplace. Read it: plugin names, `source` paths,
  `metadata.pluginRoot`, whether entries carry `version` or `dependencies`.
- Only `.claude-plugin/plugin.json` → a single plugin. The block drops the marketplace lines.
- Neither → stop and say this is not a plugin repository. Do not create a manifest unasked.

Then note, from the files rather than assumptions: where each plugin's manifest is, whether
`version` is set (pinned) or absent (users follow commits), whether any plugin has an explicit
`agents` array, whether `git tag --list '*--v*'` finds release tags, and which READMEs list skills.

### 2. Audit before writing

Audit the repo so the block describes one that is already true. In a marketplace, run the
marketplace audit script:

```bash
node "${CLAUDE_SKILL_DIR}/../marketplace-creator/scripts/check-marketplace.mjs" . --no-native
```

Offer, do not apply unasked: `--fix` for a missing `$schema`, and `git mv` for a `plugin.json`
outside `.claude-plugin/`.

In a single-plugin repo the script has no `marketplace.json` to read and stops, so validate the
plugin instead, and offer `/plugin-creator audit .` for the full checklist:

```bash
claude plugin validate . --strict
```

Report the errors either way. The block is written either way.

### 3. Write the block into CLAUDE.md

Fill [templates/claude-md-block.md](./templates/claude-md-block.md):

- `{{LAYOUT}}`: the real paths from step 1, for example `plugins/<name>/.claude-plugin/plugin.json`.
- `{{AGENTS_LINE}}`: the explicit-array line if any plugin sets `agents`, otherwise the scan line.
- `{{VERSIONING}}`: the pinned-version rules when `version` is set; the "follows commits, nothing to
  bump" line when it is not.
- `{{DOCS}}`: every file that enumerates skills or agents by hand (root and per-plugin READMEs, a
  table in `CLAUDE.md`). Leave out any that do not exist.
- `{{TAGS}}`: the tag line only when the repo tags releases or a plugin declares `dependencies`.
- `{{AUDIT}}`: `/marketplace-creator audit` in a marketplace, `/plugin-creator audit .` for a
  single plugin.
- `{{BUMP_CHECK}}`: the `/plugin-release` line below in a marketplace; drop the line for a single
  plugin, whose bump the release script cannot plan:
  `4. **Check the bump** with \`/plugin-release\` in plan mode: it proposes the semver size per plugin. Do not let it tag.`

Then place it:

- `CLAUDE.md` has `<!-- BEGIN:plugin-dev -->` … `<!-- END:plugin-dev -->` → replace only what lies
  between the markers, markers included.
- No markers → append the block at the end. Never edit text outside the markers: the rest of the
  file is the user's.
- No `CLAUDE.md` → create it with a one-line title and the block.

If the existing `CLAUDE.md` already states a rule the block would contradict (another bump policy,
another manifest path), stop and ask which one wins before writing.

### 4. CI, only with `--ci` or when the user agrees

Copy [templates/plugin-checks.yml](./templates/plugin-checks.yml) to
`.github/workflows/plugin-checks.yml`, replacing `{{PLUGIN_DEV_REF}}` with this plugin's release tag,
`plugin-dev--v<version>` from `${CLAUDE_SKILL_DIR}/../../.claude-plugin/plugin.json`. Confirm the tag
exists before writing it:

```bash
git ls-remote --tags https://github.com/JanSzewczyk/claude-plugins "plugin-dev--v*"
```

If that version is not tagged, use the newest tag the command lists and say so. The workflow calls
the shared `plugin-checks` action at that tag (Node 26, optional `strict`, `base-ref` and `path`
inputs), so the project vendors nothing and any other repository can use the same action. Skip the
step when the repo is not on GitHub, and say why.

### 5. Report

Name the file the block went into and whether it was added or refreshed, what the audit found,
whether CI was added, and the one thing that stays manual: `/plugin-release` to tag.

## Rules

The block points at these through the audit it names; read the rule when the user asks why.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 16 note(s) (sha256 d519526b042e); edit the notes in knowledge/, then run build -->

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

## Guardrails

- Never write outside the `plugin-dev` markers in an existing `CLAUDE.md`.
- Never move manifests, add `$schema` or bump versions unasked; step 2 reports, the user decides.
- Never commit, push or tag. A caller such as `/ship-task` owns that.
- Never add a hook to make this "automatic": a plugin hook fires in every project where the plugin
  is enabled. CI is the enforcement point.

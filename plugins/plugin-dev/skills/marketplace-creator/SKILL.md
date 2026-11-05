---
name: marketplace-creator
description: "Creates, maintains and audits a Claude Code plugin marketplace: the .claude-plugin/marketplace.json catalog, plugin entries and source types, hosting and private access, version policy, renames and removals, channels and org relevance suggestions. Its audit finds drift between marketplace.json, each plugin.json, agent and skill files, CLAUDE.md and every README, plus what the docs warn about: unpinned sources, missing renames, version set twice, reserved names. Use to start a marketplace, add, rename or remove a plugin entry, host or share one, or validate, audit or health-check a marketplace or plugin repo before a release, after adding or renaming a skill or agent, or when plugins show no name in /plugin: 'is this repo consistent', 'did I forget to register something', 'zrób marketplace', 'zrób audyt marketplace'. NOT for one plugin's skills, hooks or MCP servers (plugin-creator), mods (mod-creator), cutting a release (plugin-release) or one SKILL.md's quality (skill-audit)."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[create <name> | add <plugin> | rename <old> <new> | remove <plugin> | audit [repo root] | question about marketplaces]"
---

# Marketplace Creator

A marketplace is a directory or git repository whose `.claude-plugin/marketplace.json` lists
plugins and where to fetch each one. Users add it once with `claude plugin marketplace add` and
install by `<plugin>@<marketplace>`. A marketplace repo also describes the same capabilities by
hand in several places: each `plugin.json`, the skill and agent files, the root `README.md`,
every per-plugin `README.md` and the Plugins table in `CLAUDE.md`. Only the files on disk are the
truth; the rest rot silently.

This skill builds the catalog, keeps it working as plugins change, and audits it. Building one
plugin's contents is `plugin-creator`; tagging releases is `plugin-release`.

## Modes

| Argument or request | Mode |
| --- | --- |
| `create <name>`, "start a marketplace" | **Create** a new catalog |
| `add <plugin>`, "register this plugin" | **Add** an entry for a plugin that exists |
| `rename <old> <new>`, `remove <plugin>` | **Rename or remove** without breaking installs |
| "host it", "make it private", "channels", "suggest it to the org" | **Maintain**: hosting, versions, relevance |
| `audit`, "validate", "is this consistent", or no argument in a marketplace repo | **Audit** |
| A question | Answer from the references below, and name the file |

With no argument, a directory that has `.claude-plugin/marketplace.json` means audit; one that
has none means create.

## Sources of truth, in order

1. The repository's own `CLAUDE.md`. Its conventions (attribution, versioning, doc tables) win
   over the defaults here, and `.marketplace-creator.json` with `{ "conventions": true }` turns
   them into errors in the audit.
2. `claude plugin validate <path>` output: it decides whether a manifest is well-formed. Never
   reimplement it.
3. The references in this skill, distilled from the Claude Code docs; each ends with the pages
   it came from. When `claude --version` is older than a version gate they mention, say so
   before using the feature.

## Knowledge base

Open only what the task needs:

| File | Open it when |
| --- | --- |
| [references/create.md](references/create.md) | Laying out the root, writing `marketplace.json`, reserved names, entry fields and how they merge with `plugin.json`, choosing a source type, submodules, validating and testing locally |
| [references/maintain.md](references/maintain.md) | Hosting (GitHub, other git, URL, shared directory), private access, users without git, claude.ai org sync, auto-update, releasing a version, pinning, channels, renames, removals, authenticated archives |
| [references/relevance.md](references/relevance.md) | Getting a plugin suggested to an organization: `relevance` signals, limits, the admin allowlist, what users see |
| [references/audit.md](references/audit.md) | Auditing: running the script, the judgement checklist M1–M6, severity, verdict and report format |
| [references/checks.md](references/checks.md) | What each script message means and its repair; house conventions |
| [references/rules.md](references/rules.md) | The reason and fix behind a rule in the index at the end of this file |

## Progress list

**Your first tool call in this skill creates the task list, before any command below.** Every
mode reads and writes several files, and the user needs to see where it stands. Use the
task-list tool the session has: `mcp__ccd_turn__update_plan` in the Claude desktop app,
otherwise `TaskCreate` and `TaskUpdate`, or `TodoWrite`; load it with `ToolSearch` first if it is
only listed as deferred. With none of them, print the items as a Markdown checklist and reprint
it as each step finishes. Write the items in the user's language:

| Mode | Items |
| --- | --- |
| Create | `Agree on name, owner and layout` / `Write marketplace.json` / `Add the plugin entries` / `Validate and install locally` / `Audit and hand over` |
| Add | `Read the plugin's manifest` / `Write the entry` / `Update the doc tables` / `Validate and audit` |
| Rename or remove | `Check who depends on the name` / `Change the entry and renames` / `Update docs and versions` / `Validate and audit` |
| Maintain | one item per change the user asked for, then `Validate and audit` |
| Audit | `Run the marketplace script` / `Ask the CLI: load, install, budget` / `Read the checks behind each issue` / `Review M1–M6` / `Report findings and verdict` |

One item in progress at a time. A step that won't run stays on the list with the reason. Show
an outcome that isn't a plain success in the item: `Validate and audit: 2 errors, stopped`.

## Create

1. **Agree.** The marketplace `name` (distinctive, kebab-case, not reserved: create.md → How to
   write marketplace.json), `owner`, a `description`, and the root directory. Ask where the
   plugins live: inside the repo under `plugins/` (relative sources), or in their own
   repositories (remote sources). Read the target repo's `CLAUDE.md` for attribution and
   versioning rules.
2. **Write `marketplace.json`** at `<root>/.claude-plugin/marketplace.json`, opening with
   `"$schema": "https://www.schemastore.org/claude-code-marketplace.json"`. Fill `name`,
   `description`, `owner` (`name`, plus `email` and `url` when known) and an empty `plugins`.
3. **Add the entries** with the Add steps for each plugin that already exists. For a plugin that
   doesn't exist yet, hand over to `plugin-creator` and add its entry afterwards.
4. **Validate and install.** `claude plugin validate <root>` and `claude plugin validate` on each
   plugin directory (a marketplace run doesn't open component files). Then
   [scripts/check-cli.mjs](scripts/check-cli.mjs) loads and installs every plugin in a throwaway
   config and measures its always-on tokens, leaving the user's settings alone. Installing into
   the user's own config is `claude plugin marketplace add <root>` and
   `claude plugin install <plugin>@<name>`; ask first (create.md → How to test the marketplace locally).
5. **Audit and hand over.** Run the audit; it is the self-check. Give the user the add and
   install lines for their host (maintain.md → How to host the marketplace) and say what was
   verified and what only a real install from the host can show.

## Add

1. Read the plugin's `.claude-plugin/plugin.json`. The entry `name` must equal its `name`.
2. Write the entry: `name`, `source` (from the root, starting `./`, never `..`), `description`.
   Add `version`, `author`, `homepage`, `license`, `dependencies` only where the repo's rules put
   them in both layers, and keep them identical to `plugin.json`. A remote source carries its
   display fields on the entry (create.md → How to add a plugin entry; rules: display fields).
3. Update the docs that enumerate plugins by hand: the root `README.md`, the Plugins table in
   `CLAUDE.md`, any counts. The audit names what is missing.
4. Validate and audit. Bump nothing in the marketplace itself; a new plugin starts at the
   version its own rules say (often `1.0.0`).

## Rename or remove

A plugin's `name` is the key in every user's `enabledPlugins` and `pluginConfigs`, so changing
or dropping it breaks installs unless `renames` migrates them (maintain.md → How to rename a
plugin without breaking installs, How to remove a plugin).

1. Prefer `displayName` when the user only wants a different label. Otherwise grep the repo for
   the old name: `dependencies` of other plugins, agents' `skills:` preloads, docs, CI.
2. Rename the entry and `plugin.json` together, or delete the entry; add `"old": "new"` or
   `"old": null` to the top-level `renames`. Never edit an existing key. Offer
   `forceRemoveDeletedPlugins` only when the user wants copies uninstalled.
3. Move the folder with `git mv` when it carries the name, update every reference found in
   step 1, and bump versions as the repo's rules require (a rename is a major change).
4. Validate (it rejects a `renames` chain that does not resolve) and audit.

## Maintain

Hosting, private access, auto-update, release policy, pinning, channels and archive
authentication are in maintain.md; relevance suggestions in relevance.md. Make each change the
user asked for, explain what users must do on their side (credentials, `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`,
`/plugin marketplace update`), validate and audit. A change that only an administrator can make
(managed `extraKnownMarketplaces`, `enabledPlugins`, `pluginSuggestionMarketplaces`) is written
out for the user to pass on, not applied.

## Audit

Runs on `audit`, on a request to validate or health-check a marketplace, and as the last step of
every other mode. Follow audit.md: run [scripts/check-marketplace.mjs](scripts/check-marketplace.mjs)
and [scripts/check-cli.mjs](scripts/check-cli.mjs) (load, install, token budget),
read checks.md for each issue class, review
the judgement checklist M1–M6 the script can't see, then one report with ranked findings and a
verdict.

The audit changes nothing on its own, except `--fix`, which only inserts missing `$schema` lines.
In the user's own repo, offer to fix the findings after the report, or fix them in the same run
when the request already asked for it ("fix the drift", "napraw"). Fix the source of truth, not
the report: files on disk are the truth and manifests and docs follow them. Re-run the script
after fixing; a fix that does not move the count is not a fix. A marketplace someone else
maintains is never edited.

## Rules that break marketplaces silently

- The entry `name` equals the plugin's `plugin.json` `name`; installs by the other one fail with
  `not found in marketplace`.
- Relative sources resolve from the marketplace root, start with `./` and never contain `..`.
- `version` lives in one place per plugin, or nowhere: `plugin.json` wins silently when both set
  it, and a set but unchanged `version` keeps every user on the cached copy.
- Unknown keys are ignored at load; only `claude plugin validate` reports a typo, as a warning.
- Entry `hooks` work only as an inline object; with `strict: false` any component field on the
  entry conflicts with a `plugin.json` and the plugin fails to load.
- A bare `marketplace.json` URL downloads only that file, so relative-path entries fail there.
- `renames` is append-only, and a removed plugin maps to `null`.
- Validate each plugin directory as well as the root: a marketplace run doesn't open skills,
  agents or hooks of plugins in other directories.

## Rules

The plugin authoring rules behind these checks, and the reporting rules the audit report
follows, generated from the knowledge notes. Open one when a finding needs its reason or its
fix, or when you write the report.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 30 note(s) (sha256 0129310254b0); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Bump the plugin version in every change that touches the plugin](references/rules.md#bump-the-plugin-version-in-every-change-that-touches-the-plugin) — A pinned version keeps users on the cached copy until the string changes, however many commits land. | claude-code |
| critical | [Keep plugin.json in .claude-plugin/ and every component at the plugin root](references/rules.md#keep-pluginjson-in-claude-plugin-and-every-component-at-the-plugin-root) — The manifest is .claude-plugin/plugin.json; skills/, agents/ and hooks/ sit beside .claude-plugin/, never in it. | claude-code |
| high | [Give a version range to every dependency whose skills or tools your plugin calls](references/rules.md#give-a-version-range-to-every-dependency-whose-skills-or-tools-your-plugin-calls) — An unconstrained dependency moves to every release, so one rename breaks your plugin for everyone who updates. | claude-code |
| high | [Keep name, version and dependencies identical in plugin.json and the marketplace entry](references/rules.md#keep-name-version-and-dependencies-identical-in-pluginjson-and-the-marketplace-entry) — Two surfaces read two files; a value set in both must match, or install and browse disagree. | claude-code |
| high | [Read plugin files from CLAUDE_PLUGIN_ROOT and write state to CLAUDE_PLUGIN_DATA](references/rules.md#read-plugin-files-from-claude_plugin_root-and-write-state-to-claude_plugin_data) — The install directory changes on every update; state written there is lost. | claude-code |
| high | [Keep a skill description inside the 1,536-character listing limit](references/rules.md#keep-a-skill-description-inside-the-1536-character-listing-limit) — The listing cuts description + when_to_use at 1,536 characters; the rest never reaches the router. | claude-code |
| high | [List every agent file once the manifest sets agents](references/rules.md#list-every-agent-file-once-the-manifest-sets-agents) — `agents`, `commands`, `outputStyles` and `workflows` replace their default folder scan; `skills` only adds to it. | claude-code |
| high | [Record every plugin rename and removal in the append-only renames map](references/rules.md#record-every-plugin-rename-and-removal-in-the-append-only-renames-map) — renames migrates existing installs; without it they fail with not found in marketplace. | claude-code |
| high | [Tag a release for every version another plugin's dependency range points at](references/rules.md#tag-a-release-for-every-version-another-plugins-dependency-range-points-at) — Dependency ranges resolve against <plugin>--v<version> git tags, not against plugin.json. | claude-code |
| high | [Treat a published plugin's name as permanent and relabel it with displayName](references/rules.md#treat-a-published-plugins-name-as-permanent-and-relabel-it-with-displayname) — Installs, settings and configuration are keyed by name; a renamed plugin is a different plugin to every user. | claude-code |
| high | [Run claude plugin validate and the drift check on every pull request](references/rules.md#run-claude-plugin-validate-and-the-drift-check-on-every-pull-request) — validate checks each manifest's shape; the drift check catches docs, agents arrays and versions that fell behind. | claude-code |
| high | [List findings in one numbered table, worst first](references/rules.md#list-findings-in-one-numbered-table-worst-first) — Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on. | any |
| high | [Mark every status with the shared five-mark scale](references/rules.md#mark-every-status-with-the-shared-five-mark-scale) — 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike. | any |
| high | [Open an audit report with a verdict line that quotes the tool's own summary](references/rules.md#open-an-audit-report-with-a-verdict-line-that-quotes-the-tools-own-summary) — First line is the worst status, the count at each severity, and the checking tool's summary line as evidence. | any |
| medium | [Install the plugin from a local marketplace before pushing a release](references/rules.md#install-the-plugin-from-a-local-marketplace-before-pushing-a-release) — validate checks files; only an install finds a wrong source, a missing directory or a reserved name. | claude-code |
| medium | [Put instructions a plugin needs in a skill, not a CLAUDE.md inside the plugin](references/rules.md#put-instructions-a-plugin-needs-in-a-skill-not-a-claudemd-inside-the-plugin) — A CLAUDE.md at the plugin root is never loaded as context. | claude-code |
| medium | [Keep SKILL.md under 500 lines and move reference material into references/](references/rules.md#keep-skillmd-under-500-lines-and-move-reference-material-into-references) — Every body line is paid on each use; reference files load only when the task needs them. | claude-code |
| medium | [Give a plugin's relevance block specific signals, with cwd when it belongs to a directory](references/rules.md#give-a-plugins-relevance-block-specific-signals-with-cwd-when-it-belongs-to-a-directory) — Suggestions show only a few times per user, so a broad signal spends them where the plugin does not help. | claude-code |
| medium | [Host a marketplace whose entries use relative paths in git, not as a bare URL](references/rules.md#host-a-marketplace-whose-entries-use-relative-paths-in-git-not-as-a-bare-url) — A marketplace.json URL downloads only that file, so every relative-path plugin fails to install. | claude-code |
| medium | [Give the marketplace a distinctive, unreserved name before the first push](references/rules.md#give-the-marketplace-a-distinctive-unreserved-name-before-the-first-push) — Users cannot register two marketplaces with one name, and official-looking names are refused. | claude-code |
| medium | [Pin archive sources with sha256, and git sources with sha when installs must reproduce](references/rules.md#pin-archive-sources-with-sha256-and-git-sources-with-sha-when-installs-must-reproduce) — ref follows a branch or tag and an unpinned archive can change under the same URL. | claude-code |
| medium | [Set description and display fields on the entry when the plugin source is remote](references/rules.md#set-description-and-display-fields-on-the-entry-when-the-plugin-source-is-remote) — Before install Claude Code reads plugin.json only for relative-path entries, so a remote one shows blank. | claude-code |
| medium | [Put hooks and MCP servers in the plugin, never in plugin agent frontmatter](references/rules.md#put-hooks-and-mcp-servers-in-the-plugin-never-in-plugin-agent-frontmatter) — Plugin agents ignore permissionMode, hooks, mcpServers and initialPrompt; the plugin-level files are what load. | claude-code |
| medium | [Start every component path with ./ relative to the plugin root](references/rules.md#start-every-component-path-with--relative-to-the-plugin-root) — Paths in a manifest are relative to the plugin root, start with ./, use forward slashes and never contain .. | claude-code |
| medium | [Show a scorecard when the audit covers a fixed set of areas](references/rules.md#show-a-scorecard-when-the-audit-covers-a-fixed-set-of-areas) — One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line. | any |
| medium | [Give a detail block only to findings whose fix will not fit the table, at most five](references/rules.md#give-a-detail-block-only-to-findings-whose-fix-will-not-fit-the-table-at-most-five) — Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding. | any |
| medium | [Close an audit report with what was not checked and the one next step](references/rules.md#close-an-audit-report-with-what-was-not-checked-and-the-one-next-step) — A Not checked line names what the run could not see; a Next line says what the user does now. | any |
| medium | [Report a clean run as the heading and one line](references/rules.md#report-a-clean-run-as-the-heading-and-one-line) — When nothing was found, skip the scorecard, the table and any list of what passed. | any |
| low | [Open every plugin.json and marketplace.json with a SchemaStore $schema](references/rules.md#open-every-pluginjson-and-marketplacejson-with-a-schemastore-schema) — $schema gives editor validation and autocomplete; Claude Code ignores it at load, so it costs nothing. | claude-code |
| low | [Write reports in GitHub-flavoured Markdown without HTML](references/rules.md#write-reports-in-github-flavoured-markdown-without-html) — Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour. | any |

<!-- END:knowledge -->

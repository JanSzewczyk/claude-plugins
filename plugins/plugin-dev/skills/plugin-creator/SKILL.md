---
name: plugin-creator
description: "Creates, extends, debugs and audits a Claude Code plugin: the .claude-plugin/plugin.json manifest and its components (skills, agents, hooks, MCP and LSP servers, bin/, monitors, output styles, themes, workflows, userConfig), dependencies with version ranges, an evals/ suite, token cost and release readiness; also converts a .claude/ setup into a plugin. Use when the user wants a new plugin, to add a skill, agent, hook or MCP server to one, to know why a plugin or component doesn't load, or to check a plugin before release or install: 'make a plugin that…', 'turn my .claude folder into a plugin', 'add a hook to this plugin', 'is this plugin ready to publish', 'audit this plugin', 'zrób plugin', 'dodaj hooka do pluginu', 'zrób audyt pluginu'. NOT for the marketplace catalog, entries, hosting or renames (marketplace-creator), mods whose hooks.json lists modules (mod-creator), tagging a release (plugin-release), or one SKILL.md's writing quality (skill-audit)."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[what the plugin should do | add <component> to <plugin> | convert <.claude dir> | audit <plugin dir> | question about plugins]"
---

# Plugin Creator

A plugin is a directory of components (skills, agents, hooks, MCP servers and the rest) plus a
`.claude-plugin/plugin.json` manifest that names it. Claude Code loads the directory as one
unit, so it can be shared, installed in several projects and released in versions. Keep a
standalone `.claude/` setup while it serves one project or one person; make a plugin once it
should be shared or versioned.

This skill turns a request into a plugin that validates, loads and changes what Claude does, and
audits an existing one. The catalog that lists plugins is `marketplace-creator`; a plugin whose
`hooks/hooks.json` lists `modules` is a mod, built and audited with `mod-creator`.

## Modes

| Argument or request | Mode |
| --- | --- |
| A description of what the plugin should do | **Create** |
| `add <component> to <plugin>`, "add a hook / agent / MCP server" | **Extend** an existing plugin |
| `convert <dir>`, "turn my .claude setup into a plugin" | **Convert** (create.md → How to convert an existing `.claude/` setup), then Extend steps 4–7 |
| "doesn't load", "skill missing", an error from `/plugin` | **Debug** |
| `audit <dir>`, "is it ready to publish", "is it safe to install" | **Audit** |
| A question | Answer from the references below, and name the file |

## Sources of truth, in order

1. `claude plugin validate <dir>` and `claude --plugin-dir <dir> plugin details <name>`: what
   Claude Code actually reads from the directory.
2. The repository's own `CLAUDE.md`. Its conventions (plugin placement, frontmatter contracts,
   attribution, versioning, required evals and docs) win over the defaults here.
3. The references in this skill, distilled from the Claude Code docs; each ends with the pages
   it came from. Check `claude --version` against any version gate they mention before using
   the feature.

## Knowledge base

Open only what the task needs:

| File | Open it when |
| --- | --- |
| [references/create.md](references/create.md) | The minimal plugin, the directory layout, loading for one session (`--plugin-dir`, `--plugin-url`), skills-directory plugins, converting `.claude/`, debugging |
| [references/components.md](references/components.md) | Adding any component: the component map, skills, commands, agents and their supported frontmatter, hooks, MCP and LSP servers, `bin/`, `settings.json`, themes, output styles, workflows, channels, monitors, `userConfig`, path variables |
| [references/dependencies.md](references/dependencies.md) | Depending on another plugin, version ranges, bundles, cross-marketplace dependencies, tags, local testing with two `--plugin-dir` flags |
| [references/evals.md](references/evals.md) | Writing and running `claude plugin eval` cases, graders, mocks, the baseline, CI gating |
| [references/publish.md](references/publish.md) | Distribution routes, the pre-release checklist, updates, tags, renames, Anthropic's directory |
| [references/measure.md](references/measure.md) | Always-on token cost, lowering it, usage signals |
| [references/cli-hints.md](references/cli-hints.md) | A CLI or SDK that should suggest its plugin from an official marketplace |
| [references/audit.md](references/audit.md) | Auditing: the checklist P1–P9, severity, verdict and report format |
| [references/rules.md](references/rules.md) | The reason and fix behind a rule in the index at the end of this file |

## Progress list

**Your first tool call in this skill creates the task list, before any command below.** A plugin
run writes files and loops through validation, so the user needs to see where it stands. Use the
task-list tool the session has: `mcp__ccd_turn__update_plan` in the Claude desktop app,
otherwise `TaskCreate` and `TaskUpdate`, or `TodoWrite`; load it with `ToolSearch` first if it is
only listed as deferred. With none of them, print the items as a Markdown checklist and reprint
it as each step finishes. Write the items in the user's language:

| Mode | Items |
| --- | --- |
| Create | `Frame the plugin and agree on name and place` / `Design the components` / `Scaffold the manifest and README` / `Write the components` / `Validate and load` / `Add evals` / `Register in the marketplace` / `Audit and hand over` |
| Extend | `Read the plugin` / `Design the component` / `Write it` / `Validate and load` / `Update evals, docs and version` / `Audit` |
| Debug | `Find the error line` / `Look it up` / `Fix, then validate and load` |
| Audit | `Inventory the plugin` / `Validate with --strict` / `Review against P1–P9` / `Measure cost and run evals` / `Report findings and verdict` |

One item in progress at a time. A step that won't run stays on the list with the reason
(`Register in the marketplace: skipped, standalone plugin`). Show an outcome that isn't a plain
success in the item: `Validate and load: 2 errors, stopped`.

## Create

1. **Frame.** Restate the plugin in one sentence: what it changes in Claude's behaviour, for whom,
   and on which surfaces (Claude Code only, or also claude.ai and Cowork). If a standalone
   `.claude/` setup, a settings hook or a mod fits better, say so and stop. Agree on the `name`:
   kebab-case, without `claude`, `anthropic` or `official`, and permanent from the first
   release. Agree on the place: `plugins/<name>/` in the user's marketplace repo, or a directory
   of its own. Read the repo's `CLAUDE.md` now.
2. **Design.** List each component with its file, the name users see (`/<plugin>:<skill>`,
   `<plugin>:<agent>`, `mcp__plugin_<plugin>_<server>__<tool>`) and why it is that kind of
   component: guidance Claude applies when relevant is a skill; a rule that must hold every time
   is a hook; an outside tool is an MCP server. Add the `userConfig` it needs, the `dependencies`
   with ranges, and what it stores in `${CLAUDE_PLUGIN_DATA}`. Read the matching sections of
   components.md and dependencies.md.
3. **Scaffold.** `<dir>/.claude-plugin/plugin.json` (nothing else in that folder) with
   `$schema` (`https://www.schemastore.org/claude-code-plugin-manifest.json`), `name`,
   `displayName`, `description`, `version` per the repo's policy (usually `1.0.0`), `author`,
   `homepage`, `license`, `keywords`. Components live at the plugin root. Write `README.md` with
   what it does, each skill and agent, and the install line.
4. **Write the components** against the rules below and components.md. New commands are skills
   under `skills/`; give every skill a `description` that says when to use it.
5. **Validate and load.** `claude plugin validate <dir> --strict`, fix every error and warning,
   run it again. Then `claude --plugin-dir <dir> plugin details <name>`: the inventory must list
   every component from step 2, and `Always-on` is the token cost every session pays (measure.md).
   Tell the user to try it with `claude --plugin-dir <dir>` and `/reload-plugins` after edits.
6. **Add evals.** In `evals/`, one case per skill with a `tool_used` grader on `Skill`, an outcome
   case where the artifact is worth grading, and one prompt that must not trigger it (evals.md;
   rules: grade the result and the skill firing). Running them makes billed model calls, so
   ask before `claude plugin eval <dir> --runs 1 --ablation none`.
7. **Register.** Inside a marketplace repo, add the entry and the doc rows through
   `marketplace-creator` (`add <name>`). A standalone plugin skips this.
8. **Audit and hand over.** Run the audit as the self-check. Report what was verified
   (validate, details, evals) and what only a live session can show (hooks firing, MCP servers
   connecting, `userConfig` dialogs, which appear only from `/plugin`, never with `--plugin-dir`).

## Extend

Read `plugin.json`, the component folders and the repo's `CLAUDE.md`, then run Create steps 2,
4 and 5 for the new component only. A manifest key that *replaces* a default folder (`commands`,
`agents`, `outputStyles`, `workflows`, `experimental.themes`, `experimental.monitors`) must list
the new file, or it never loads. Add or update its eval case, the README and every doc table
that enumerates it, and bump the version as the repo's rules require. Audit at the end.

## Debug

Start from the exact line the user saw and look it up in create.md → How to debug a plugin that
doesn't behave and the Pitfalls tables of create.md and components.md. When there is no line,
run `claude plugin validate <dir>` and `claude --plugin-dir <dir> plugin list`, and ask for the
`/plugin` Errors tab. A plugin that loads but doesn't change Claude's behaviour is an eval
question, not a load error (evals.md). After the fix, run Create step 5.

## Audit

Runs on `audit`, on a request to check a plugin before release or install, and as the last step
of Create and Extend. Follow audit.md: inventory, `validate --strict`, the plugin read against
checklist P1–P9, `plugin details` and the evals, then one report with ranked findings and a
verdict. Inside a marketplace repo, also run the marketplace script (marketplace-creator →
audit.md) and fold in the issues for this plugin.

The audit changes nothing. For the user's own plugin, offer to fix the findings afterwards and
do it through the Extend steps. A third-party plugin is never edited and gets no new evals, only
an install recommendation. Per-skill writing quality (descriptions, progressive disclosure, dead
links) is `skill-audit`'s job: name it in `Next` instead of re-checking it here.

## Rules that break plugins silently

Besides the rules indexed below:

- Only `plugin.json` goes inside `.claude-plugin/`; `skills/`, `agents/`, `hooks/` and the rest
  sit at the plugin root, or they don't load.
- A manifest key that replaces a default folder stops that folder being scanned.
- `${CLAUDE_PLUGIN_ROOT}` is not exported to commands Claude runs through the Bash tool: write
  it in the skill body, where it is substituted at load.
- claude.ai and Cowork refuse a plugin with a top-level `bin/` and can't run local stdio MCP
  servers.

## Rules

The plugin authoring rules behind these checks, and the reporting rules the audit report
follows, generated from the knowledge notes. Open one when a design choice or a finding needs
its reason or its fix, or when you write the report.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 31 note(s) (sha256 345b19d84222); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| critical | [Bump the plugin version in every change that touches the plugin](references/rules.md#bump-the-plugin-version-in-every-change-that-touches-the-plugin) — A pinned version keeps users on the cached copy until the string changes, however many commits land. | claude-code |
| critical | [Keep plugin.json in .claude-plugin/ and every component at the plugin root](references/rules.md#keep-pluginjson-in-claude-plugin-and-every-component-at-the-plugin-root) — The manifest is .claude-plugin/plugin.json; skills/, agents/ and hooks/ sit beside .claude-plugin/, never in it. | claude-code |
| high | [Ask for plugin settings through userConfig and mark secrets sensitive](references/rules.md#ask-for-plugin-settings-through-userconfig-and-mark-secrets-sensitive) — Claude Code prompts for each value and keeps sensitive ones in the credential store, not in settings.json. | claude-code |
| high | [Run plugin hook scripts in exec form, or double-quote ${CLAUDE_PLUGIN_ROOT}](references/rules.md#run-plugin-hook-scripts-in-exec-form-or-double-quote-claude_plugin_root) — An unquoted plugin path splits on spaces in a shell-form hook, so the script never runs on that machine. | claude-code |
| high | [Name a plugin's MCP tools in full in hook matchers and permission rules](references/rules.md#name-a-plugins-mcp-tools-in-full-in-hook-matchers-and-permission-rules) — Plugin MCP tools are mcp__plugin_<plugin>_<server>__<tool>; a shorter form never matches. | claude-code |
| high | [Give a version range to every dependency whose skills or tools your plugin calls](references/rules.md#give-a-version-range-to-every-dependency-whose-skills-or-tools-your-plugin-calls) — An unconstrained dependency moves to every release, so one rename breaks your plugin for everyone who updates. | claude-code |
| high | [Keep name, version and dependencies identical in plugin.json and the marketplace entry](references/rules.md#keep-name-version-and-dependencies-identical-in-pluginjson-and-the-marketplace-entry) — Two surfaces read two files; a value set in both must match, or install and browse disagree. | claude-code |
| high | [Read plugin files from CLAUDE_PLUGIN_ROOT and write state to CLAUDE_PLUGIN_DATA](references/rules.md#read-plugin-files-from-claude_plugin_root-and-write-state-to-claude_plugin_data) — The install directory changes on every update; state written there is lost. | claude-code |
| high | [Keep a skill description inside the 1,536-character listing limit](references/rules.md#keep-a-skill-description-inside-the-1536-character-listing-limit) — The listing cuts description + when_to_use at 1,536 characters; the rest never reaches the router. | claude-code |
| high | [List every agent file once the manifest sets agents](references/rules.md#list-every-agent-file-once-the-manifest-sets-agents) — `agents`, `commands`, `outputStyles` and `workflows` replace their default folder scan; `skills` only adds to it. | claude-code |
| high | [Tag a release for every version another plugin's dependency range points at](references/rules.md#tag-a-release-for-every-version-another-plugins-dependency-range-points-at) — Dependency ranges resolve against <plugin>--v<version> git tags, not against plugin.json. | claude-code |
| high | [Treat a published plugin's name as permanent and relabel it with displayName](references/rules.md#treat-a-published-plugins-name-as-permanent-and-relabel-it-with-displayname) — Installs, settings and configuration are keyed by name; a renamed plugin is a different plugin to every user. | claude-code |
| high | [Run claude plugin validate and the drift check on every pull request](references/rules.md#run-claude-plugin-validate-and-the-drift-check-on-every-pull-request) — validate checks each manifest's shape; the drift check catches docs, agents arrays and versions that fell behind. | claude-code |
| high | [List findings in one numbered table, worst first](references/rules.md#list-findings-in-one-numbered-table-worst-first) — Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on. | any |
| high | [Mark every status with the shared five-mark scale](references/rules.md#mark-every-status-with-the-shared-five-mark-scale) — 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike. | any |
| high | [Open an audit report with a verdict line that quotes the tool's own summary](references/rules.md#open-an-audit-report-with-a-verdict-line-that-quotes-the-tools-own-summary) — First line is the worst status, the count at each severity, and the checking tool's summary line as evidence. | any |
| medium | [Enforce a rule that must hold every time with a hook, not a skill](references/rules.md#enforce-a-rule-that-must-hold-every-time-with-a-hook-not-a-skill) — A skill loads only when Claude matches its description; a hook runs on every matching event. | claude-code |
| medium | [Narrow every plugin hook's matcher to the tools and events it is for](references/rules.md#narrow-every-plugin-hooks-matcher-to-the-tools-and-events-it-is-for) — Plugin hooks fire on every matching event once the plugin loads, not only while its skills run. | claude-code |
| medium | [Grade both the result and the skill firing, and add a case that must not trigger](references/rules.md#grade-both-the-result-and-the-skill-firing-and-add-a-case-that-must-not-trigger) — A case that grades only the answer cannot tell whether the plugin produced it or the model already knew. | claude-code |
| medium | [Install the plugin from a local marketplace before pushing a release](references/rules.md#install-the-plugin-from-a-local-marketplace-before-pushing-a-release) — validate checks files; only an install finds a wrong source, a missing directory or a reserved name. | claude-code |
| medium | [Put instructions a plugin needs in a skill, not a CLAUDE.md inside the plugin](references/rules.md#put-instructions-a-plugin-needs-in-a-skill-not-a-claudemd-inside-the-plugin) — A CLAUDE.md at the plugin root is never loaded as context. | claude-code |
| medium | [Keep SKILL.md under 500 lines and move reference material into references/](references/rules.md#keep-skillmd-under-500-lines-and-move-reference-material-into-references) — Every body line is paid on each use; reference files load only when the task needs them. | claude-code |
| medium | [Put hooks and MCP servers in the plugin, never in plugin agent frontmatter](references/rules.md#put-hooks-and-mcp-servers-in-the-plugin-never-in-plugin-agent-frontmatter) — Plugin agents ignore permissionMode, hooks, mcpServers and initialPrompt; the plugin-level files are what load. | claude-code |
| medium | [Start every component path with ./ relative to the plugin root](references/rules.md#start-every-component-path-with--relative-to-the-plugin-root) — Paths in a manifest are relative to the plugin root, start with ./, use forward slashes and never contain .. | claude-code |
| medium | [Show a scorecard when the audit covers a fixed set of areas](references/rules.md#show-a-scorecard-when-the-audit-covers-a-fixed-set-of-areas) — One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line. | any |
| medium | [Give a detail block only to findings whose fix will not fit the table, at most five](references/rules.md#give-a-detail-block-only-to-findings-whose-fix-will-not-fit-the-table-at-most-five) — Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding. | any |
| medium | [Close an audit report with what was not checked and the one next step](references/rules.md#close-an-audit-report-with-what-was-not-checked-and-the-one-next-step) — A Not checked line names what the run could not see; a Next line says what the user does now. | any |
| medium | [Report a clean run as the heading and one line](references/rules.md#report-a-clean-run-as-the-heading-and-one-line) — When nothing was found, skip the scorecard, the table and any list of what passed. | any |
| low | [Write new slash commands as skills under skills/, not as commands/ files](references/rules.md#write-new-slash-commands-as-skills-under-skills-not-as-commands-files) — Skills supersede commands, run by the same name and can carry references, scripts and templates. | claude-code |
| low | [Open every plugin.json and marketplace.json with a SchemaStore $schema](references/rules.md#open-every-pluginjson-and-marketplacejson-with-a-schemastore-schema) — $schema gives editor validation and autocomplete; Claude Code ignores it at load, so it costs nothing. | claude-code |
| low | [Write reports in GitHub-flavoured Markdown without HTML](references/rules.md#write-reports-in-github-flavoured-markdown-without-html) — Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour. | any |

<!-- END:knowledge -->

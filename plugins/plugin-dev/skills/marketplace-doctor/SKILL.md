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

## Reporting back

State the counts (plugins, agents, skills) and then the issues that remain, grouped by plugin.
Never claim the repo is clean unless the script exited 0 — quote the summary line as evidence, and
pass on its `Not checked` lines: remote plugins and missing doc tables were not audited.
If you fixed things, say what the count went from and to.

When the run is clean, say so in one line. Do not pad a clean report with a restatement of
everything that was checked.

---
name: marketplace-doctor
description: Audit a Claude Code plugin marketplace repository for drift between its manifest layers and the documentation that enumerates them by hand — marketplace.json vs the plugins on disk, plugin.json's explicit agents array vs the agent files, SKILL.md frontmatter contracts, and the skill/agent tables in CLAUDE.md and every README. Use whenever the user asks to validate, audit, or health-check a marketplace or plugin repo, before publishing or tagging a plugin release, after adding or renaming a skill or agent, or when they say the docs are out of sync, "check the manifests", "did I forget to register something", or "is this repo consistent".
allowed-tools: Read, Glob, Grep, Bash, Edit
argument-hint: "[path to the marketplace repo root, defaults to the current directory]"
---

# Marketplace Doctor

A marketplace repo describes the same capabilities in five places: `marketplace.json`, each
`plugin.json`, the skill and agent files themselves, the root `README.md`, and every per-plugin
`README.md` — plus the Plugins table in `CLAUDE.md`. Only one of those is the truth; the rest are
typed by hand and silently rot. This skill finds the disagreements and fixes them.

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

## Attribution is checked in both layers

The one contract that spans two files: `author` (`{ name, email, url }`), `homepage` and `license`
must be present in the marketplace entry **and** in the plugin's own `plugin.json`, with matching
values. The browse view reads the first, the installed view reads the second — a block written into
only one of them means the plugin renders with no author in the other. A missing `author` object is
an error; missing `email`/`url`/`homepage`/`license` are warnings; a mismatch between the layers is
an error. See [references/checks.md](./references/checks.md#the-attribution-contract-cuts-across-layers-1-and-2).

## Run it

The script sits next to this SKILL.md at `scripts/check-marketplace.mjs` — invoke it by its
absolute path, built from this skill's own directory, not from the repo you are auditing (they
are usually different repos). The argument is the marketplace repo root:

```bash
node "<skill-dir>/scripts/check-marketplace.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--json` | Machine-readable report: full inventory plus every issue. Use it in CI or when you want to diff two runs. |
| `--strict` | Warnings fail the run too (exit 1). Use in CI once the repo is clean. |
| `--no-native` | Skip the `claude plugin validate` pass — useful when the CLI is unavailable or you only care about doc drift. |

Exit code is 0 when clean, 1 when anything failed. The script never writes to the repo.

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
6. **Bump the versions the repo's own rules require.** Editing anything under a plugin's
   `skills/` or `agents/` means bumping that plugin's `version` in `plugin.json` — see the
   repository's `CLAUDE.md`. `marketplace-doctor` does not bump versions for you, and it does not
   check them beyond "is this semver".

## Reporting back

State the counts (plugins, agents, skills) and then the issues that remain, grouped by plugin.
Never claim the repo is clean unless the script exited 0 — quote the summary line as evidence.
If you fixed things, say what the count went from and to.

When the run is clean, say so in one line. Do not pad a clean report with a restatement of
everything that was checked.

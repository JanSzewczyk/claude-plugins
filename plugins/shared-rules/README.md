# shared-rules

Single source of truth for `.claude/rules/` files shared across many repositories — pull the
latest canonical rules into any project with drift detection.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **sync-rules** | `/sync-rules` | Copies canonical `.claude/rules/*.md` files into the current repo, tracking a hash manifest so re-runs distinguish new / updated / locally-modified files |

## Installation

```bash
cp -r plugins/shared-rules/skills/*  your-project/.claude/skills/
```

## Usage

```bash
/sync-rules
```

Claude checks which canonical rules are new, updated, or drifted for this repo, judges which
ones actually fit the project's stack, and presents them as an approval checklist
(`AskUserQuestion`, multi-select) — nothing is written until you approve the selection. Rules
already up to date are skipped automatically; rules with local edits are flagged as conflicts
and only overwritten if you approve them explicitly.

## How It Works

1. Canonical rule files live in `skills/sync-rules/rules/` in this repo — that's the source
   of truth. See its own `README.md` for the current list.
2. `/sync-rules` runs `scripts/sync-rules.mjs --list` (report-only, writes nothing) to get each
   file's status against the current repo, then reads the relevant ones and checks them against
   the project's stack.
3. Candidates are presented as a checkbox list for approval. Only approved files are written,
   via `scripts/sync-rules.mjs --only=<selected files>`, which also writes
   `.claude/rules/.sync-manifest.json` recording each synced file's hash.
4. On the next run, each file's current hash is compared against the manifest:
   - unchanged since last sync + canonical moved on → offered again as `update`
   - hand-edited locally since last sync → offered as `conflict` (only overwritten if
     re-approved)
   - a same-named file existed before the first sync ever touched it → left alone
     (never adopts unmanaged files)
5. To change a rule for every repo, edit it under `skills/sync-rules/rules/` in this
   repository and commit — each consumer re-evaluates and re-approves it next time it runs
   `/sync-rules`.

## Why not just symlink `.claude/rules/`?

Claude Code's `.claude/rules/` natively supports symlinks to a shared directory, which works
well on a single machine. This skill instead copies with a manifest, which also works across
different machines, teammates, and CI — nothing needs to resolve a symlink to a path that only
exists on your disk.

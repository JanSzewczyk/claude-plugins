---
name: sync-rules
description: Pull canonical `.claude/rules/` files from the claude-plugins shared-rules source of truth into the current project. Analyzes the repo to judge which rules apply, then presents them as an approval checklist (via AskUserQuestion) so the user picks exactly which ones to add or update — nothing is written without approval. Use when the user wants to add shared/company-wide Claude rules to a repo, update rules that changed upstream, or check whether a repo's rules have drifted from the canonical version. Trigger on "sync rules", "update shared rules", "pull the latest rules", "/sync-rules", "add company rules to this repo", "are our rules out of date".
allowed-tools: Bash, Read, Glob, AskUserQuestion
argument-hint: "[--force]"
---

# Sync rules

Solves the "same rules file copy-pasted into N repos, now I have to edit N places" problem.
Canonical rule files live in this skill's `rules/` folder (versioned in the `claude-plugins`
repo — the source of truth). This skill never syncs blindly: it decides which canonical rules
are *relevant* to the current project, then asks the user to approve the selection with a
checkbox-style question before writing anything.

Paths in this skill are relative to the skill's own directory (given to you when the skill is
invoked), **not** the target project. The bundled script finds the target project root itself
by walking up from the current working directory to the nearest `.git`.

## Steps

1. **Get the status of every canonical rule against this repo**, without writing anything:

   ```bash
   node "<skill-dir>/scripts/sync-rules.mjs" --list
   ```

   Running the script with no `--only`/`--all` flag is always report-only — it never writes.
   Each row is one candidate rule with a status: `add` (new), `update` (canonical changed,
   safe to pull), `up to date`, `conflict` (locally edited since last sync), or `stale`
   (removed from the source upstream).

2. **Drop `up to date` rows** — nothing to decide there. For every remaining row (`add`,
   `update`, `conflict`, `stale`), read the canonical file at `<skill-dir>/rules/<rel>` (skip
   this for `stale`, since the source file is gone) to understand what it governs and which
   `paths:` frontmatter it scopes to.

3. **Judge relevance against this repo.** Inspect the project (e.g. `package.json` for
   Drizzle/Supabase/Next.js, presence of `app/` or `features/` directories) and compare against
   each rule's `paths:` scope and content. Form a one-line recommendation per rule: applies
   directly, applies partially, or likely not relevant to this stack.

4. **Ask the user to approve the selection** with `AskUserQuestion`, `multiSelect: true`. One
   option per candidate rule from step 2, its `description` stating: what it covers, its status
   (new / update / conflict), and your relevance judgment from step 3. `AskUserQuestion` caps
   options at 4 per question and 4 questions per call — if more than ~16 candidates need review,
   run multiple rounds sequentially rather than truncating the list. For `conflict` rows,
   make clear in the description that approving means overwriting a local edit.

5. **Sync only what was approved.** Collect the selected relative filenames and run:

   ```bash
   node "<skill-dir>/scripts/sync-rules.mjs" --only=<rel1>,<rel2>,...
   ```

   Add `--force` only for approved rows that were in `conflict` status — without it the
   script still refuses to overwrite local edits even if the filename is in `--only`.

6. **Report** what was written (and, for `stale` rows the user didn't ask to delete, remind
   them the file still exists locally with no upstream source). If `.claude/rules/` didn't
   exist before this run, mention it's new and should be committed to version control.

## Updating the canonical rules themselves

To change what gets distributed to every repo, edit the `.md` files under this skill's
`rules/` directory (see its own `README.md`) and commit to the `claude-plugins` repo. Nothing
pushes automatically — each consuming repo re-evaluates and re-approves the change next time it
runs `/sync-rules`.

## Examples

**Example 1**
Input: `/sync-rules` in a Next.js + Drizzle/Supabase repo that has never synced before.
Action: `--list` shows all four canonical rules as `add`. Read each, note that
`db-patterns.md`, `nextjs-page-layout-patterns.md`, and `feature-architecture.md` match the
stack directly and `code-style.md` is stack-agnostic and generally applicable. Present all four
as a checklist recommending all four; sync whatever the user leaves checked.

**Example 2**
Input: `/sync-rules` in a repo with no `app/` directory (Pages Router or non-Next.js).
Action: still list `nextjs-page-layout-patterns.md` as a candidate (don't silently exclude it),
but flag in its description that this repo doesn't appear to use the App Router, so the
recommendation is to leave it unchecked.

**Example 3**
Input: `/sync-rules` where `code-style.md` shows `conflict` because someone hand-edited it
locally.
Action: include it in the checklist with a note that it has local edits and selecting it will
discard them; if approved, sync that file with `--force`.

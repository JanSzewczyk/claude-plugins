# Phase 5 — Review

**Exit:** `05-plan.json` passes `--dry-run` and `05-approved` was written by the script after the
user answered **Apply**. Or `05-cancelled` holds the reason. The plan file is the only thing phase 6 executes, so anything not
in it does not happen, and anything in it was approved here.

**Input:** `01-brief.md` to `04-protection.md` (or `.skipped`),
`${CLAUDE_SKILL_DIR}/../../references/plan-schema.md`, and
`${CLAUDE_SKILL_DIR}/../../references/settings-catalog.md` for the exact flags and payloads.

## 1. Build the plan

Translate every accepted or adjusted decision into one step of `05-plan.json`, following
`plan-schema.md`. Skipped groups contribute no step. Use only the commands listed in
`settings-catalog.md`; a command you compose yourself has not been checked against the
API and will fail or do something else.

## 2. Dry-run it

Run as written:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/05-plan.json --dry-run
```

Exit 2 means the plan is invalid; fix `05-plan.json` and run the dry run again. Never hand the user a
plan that the script rejects.

## 3. Show it and ask once

Show the user, in this order:

1. The repository: `<owner>/<name>`, visibility, source (template, or empty with its gitignore,
   license and README), description, topics.
2. The command list from the dry run, grouped by `group`, protection last — the exact commands
   phase 6 will run.
3. What is **not** in the plan and why: skipped groups, settings the owner's tier does not allow,
   Dependabot version updates (needs a file).

Then one `AskUserQuestion`:

- **Apply (Recommended)** — record the approval, as written:

  ```bash
  node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/05-plan.json --approve
  ```

  It writes `05-approved` with the plan's sha256. Phase 6 refuses to run if the plan changed after
  it, so the user's "yes" covers exactly this file. Then go to phase 6.
- **Change a group** — ask which one, return to that phase's question, rewrite its artifact and
  this plan, dry-run again, ask again.
- **Cancel** — write `05-cancelled` with "declined by the user" and end the run. Nothing was
  written to GitHub; say so.

If the plan has to change after approval, go back to step 2: dry-run, show, ask, approve again.

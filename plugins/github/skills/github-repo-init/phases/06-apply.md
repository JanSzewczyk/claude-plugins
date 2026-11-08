# Phase 6 — Apply

**Exit:** `06-apply.json` is the script's own report, including its read-back from GitHub. A
summary written from memory instead of the report is not this artifact.

**Input:** `05-plan.json` and `05-approved`.

## Run

Run once, as written — do not modify the command or the plan:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/05-plan.json --out <run-dir>/06-apply.json
```

The script creates the repository, waits for its first commit, runs the settings steps, runs the
protection steps last, and reads the result back. One failed setting does not stop the others; a
step that `needs` a failed step is skipped.

| Exit | Meaning | Next |
|---|---|---|
| 0 | Repository created; some steps may have failed | phase 7 |
| 1 | `gh repo create` failed — nothing else ran | show the error, end the run; nothing exists on GitHub |
| 2 | Plan invalid, not approved, or changed since approval — nothing ran | back to phase 5 |
| 3 | Repository created, but the script crashed or could not write `--out` | save the JSON it printed as `06-apply.json` (it says what ran), then phase 7 |

## Read the report

For each step with `status: failed`, read its `error`:

- `403` / `404` with "upgrade" or "not available" → the owner's tier does not allow it; report it as
  not available, do not retry.
- `422` → the API refused the value (for example push protection before secret scanning was on);
  report it with the error text.
- Anything else → report it as is.

`waitedForCommit: false` means the template's files had not arrived after about a minute. Steps that
then failed with `404` or `409` may succeed on a retry: mark them as retry candidates for phase 7.

Compare `readBack` with the plan: a setting that reports `ok` but reads back differently (merge
methods, `deleteBranchOnMerge`, visibility, the ruleset list) goes into the report as "applied but
not confirmed". Do not re-run individual `gh` commands here — phase 7 offers the fix-up, on its own
approval.

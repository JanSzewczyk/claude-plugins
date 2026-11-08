# Phase 5 — Apply

**Exit:** `05-apply.json` is the apply script's own report, and `05-after.json` is the read-back
below. Both must exist before phase 6.

**Input:** `04-plan.json` and `04-approved`.

Run once, as written — do not modify the command or the plan:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/04-plan.json --out <run-dir>/05-apply.json
```

The script runs the steps in order, protection last, skips a step whose `needs` failed, and reads
the result back.

| Exit | Meaning | Next |
|---|---|---|
| 0 | Steps ran; some may have failed | phase 6 |
| 2 | Plan invalid, not approved, or changed since approval — nothing ran | back to phase 4 |
| 3 | The script crashed or could not write `--out` | save the JSON it printed as `05-apply.json`, run the read-back below, then phase 6; if it says `crashed`, the report takes the state of every step from `05-after.json` |

For each failed step read its `error`: `403`/`404` with "upgrade" → not available on the owner's
tier; `422` → the API refused the value (quote it); anything else → report it as is. Do not retry
here. Then read the result back once more with the read-only script, so the report can show what
changed:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/read-settings.mjs <owner/repo> --out <run-dir>/05-after.json
```

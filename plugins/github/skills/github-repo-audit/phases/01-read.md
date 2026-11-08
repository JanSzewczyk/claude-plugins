# Phase 1 — Read

**Exit:** `01-settings.json` is the script's own output. A summary typed from individual `gh`
calls is not this artifact: the comparison in phase 2 needs the script's snapshot and findings.

**Input:** `00-preflight.md`.

Run as written — it makes only GET requests:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/read-settings.mjs <owner/repo> --out <run-dir>/01-settings.json
```

| Exit | Meaning | Next |
|---|---|---|
| 0 | Read and compared | phase 2 |
| 1 | The repository cannot be read, or the token is not an admin | show the message, end the run |
| 2 | Bad argument | fix the `owner/repo` and run again |

The output holds:

- `snapshot` — what GitHub returned: repository flags, security and analysis, Dependabot, Actions
  token permissions, every ruleset in full, classic branch protection, each workflow file scanned
  for pushes to the default branch and for `secrets.*`, and the checks of the last merged pull
  request.
- `findings` — the differences from the baseline, each with `severity` (`high`, `medium`, `low`),
  `current`, `recommended`, and a ready `step` when one catalog command fixes it.
- `unreadable` — endpoints that answered with an error. Each one is a gap in the audit, not a
  setting that is off.

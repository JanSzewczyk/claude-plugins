# Phase 6 — Report

**Exit:** `06-report.md` is written and shown. Each line traces to `02-findings.md`,
`03-fixes.md`, `05-apply.json` or `05-after.json`.

**Input:** `02-findings.md`, `03-fixes.md`, and — when phase 5 ran — `05-apply.json` and
`05-after.json`.

## The artifact — `06-report.md`

```markdown
# <owner>/<repo> · audit <date>

Before: <n> high · <n> medium · <n> low    After: <n> high · <n> medium · <n> low   (or "no changes made")

## Fixed
<finding id — what changed, confirmed by 05-after.json; the ids under `Covers:` count as fixed when
the `ruleset` step is ok and they are gone from 05-after.json>

## Not fixed
| Finding | Why |
|---|---|
| <id> | kept: deliberate | kept: not now | failed: <short error> | not available on <tier> |

## Still to do by hand
- <Dependabot version updates: add `.github/dependabot.yml` — no file is committed by this skill>
- <Remove classic branch protection in Settings → Branches, now that the ruleset covers it>
- <Secrets referenced by workflows that the repository may lack: names from the snapshot>
```

"Before" counts come from `01-settings.json`, "After" from `05-after.json`; a fix that reported `ok`
but still appears in `05-after.json` goes under **Not fixed** as "applied but not confirmed".

Show the report. End the run there: no further writes without a new request.

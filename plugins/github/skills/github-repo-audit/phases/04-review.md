# Phase 4 — Review

**Exit:** one of `04-approved` (written by the script after the user answered **Apply**),
`04-cancelled` with the reason, or `04-nothing-to-fix` when no group was set to fix.

**Input:** `03-fixes.md`, `01-settings.json`, `${CLAUDE_SKILL_DIR}/../../references/plan-schema.md`.

## 1. Build the plan

If `03-fixes.md` fixes nothing, write `04-nothing-to-fix` and go to phase 6.

Otherwise write `04-plan.json` with `repo` set to `{ "owner": "<owner>", "name": "<repo>",
"existing": true }` and one step per approved fix:

- copy each finding's `step` as `args`, with `id` = the finding id and `group` = its group, and keep
  its `needs`;
- the ruleset is one step in group `protection`, with the full target ruleset from phase 3 as
  `body`: `["api","-X","PUT","repos/{repo}/rulesets/<id>","--input","-"]` to update, or
  `["api","-X","POST","repos/{repo}/rulesets","--input","-"]` to create.

Use no command that is not a finding's `step` or one of these two ruleset forms.

## 2. Dry-run, show, ask

Run as written:

```bash
node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/04-plan.json --dry-run
```

Exit 2 → fix the plan and run again. Then show the command list, grouped, protection last, and for
an updated ruleset the rules before and after. One `AskUserQuestion`:

- **Apply (Recommended)** — record the approval, as written:

  ```bash
  node ${CLAUDE_SKILL_DIR}/../../scripts/apply-plan.mjs <run-dir>/04-plan.json --approve
  ```

  It writes `04-approved` with the plan's sha256; phase 5 refuses to run if the plan changed after
  it. Then go to phase 5.
- **Change** — back to phase 3 for the group named, then build, dry-run and ask again.
- **Cancel** — write `04-cancelled` with "declined by the user"; nothing was changed.

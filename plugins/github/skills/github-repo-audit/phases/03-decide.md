# Phase 3 — Decide

**Exit:** `03-fixes.md` records a decision for every group that has findings: **fix all**,
**choose**, or **keep as is**. A group with findings and no decision cannot be told apart from one that was
forgotten.

**Input:** `02-findings.md`, `01-settings.json`, `${CLAUDE_SKILL_DIR}/../../references/settings-catalog.md`.

## How to ask

One `AskUserQuestion` per group with findings (up to four groups per call), never one per
setting. Each question lists the group's findings in the question text, worst first, and offers:

1. **Fix all (Recommended)** — every finding of the group that has a fix
2. **Choose** — a multi-select follow-up with one option per finding. A finding whose `needs` names
   another finding brings that one in with it (security updates need alerts, push protection needs
   secret scanning); say so in the follow-up question
3. **Keep as is** — nothing changes; ask in one line whether it is deliberate, and record the answer

Findings with no `step` that no ruleset can fix (`dependabot-version-updates` needs a file;
`protection-not-available` means a private repository on Free cannot have rulesets) are not offered
as fixes; they go under `## Report only` in `03-fixes.md` and on to `06-report.md`. When
`protection-not-available` is present, skip the Protection questions and record `Ruleset: none`.

## Protection

Ask separately, because a wrong answer here breaks releases or merges:

- **Required checks** — multi-select of the checks proposed in `02-findings.md`, all recommended,
  plus **strict** (branch up to date before merging): recommended yes.
- **Bypass** — multi-select of the detected pushers with their `file:line`, recommended; plus
  **Repository admin** (`RepositoryRole` 5), not recommended by default.
- **Rules** — the missing rules from the findings (`deletion`, `non_fast_forward`,
  `pull_request` with 0 approvals and the merge methods the repository allows).

Then build the target ruleset:

- **A ruleset already targets the default branch** → if its `source_type` is `Organization`, do not
  update it: offer a repository ruleset next to it, or report that the org owner must change it.
  Otherwise start from its full current body in `01-settings.json` and add only what was approved. Every rule the user did not ask to change stays
  exactly as it is. The step will be a `PUT` to `repos/{repo}/rulesets/<id>`.
- **No ruleset** → start from `${CLAUDE_SKILL_DIR}/../../references/ruleset-default.json`. The step
  will be a `POST` to `repos/{repo}/rulesets`.
- **Classic branch protection only** → offer a ruleset next to it (rulesets stack, the stricter rule
  wins) and say that removing the classic protection afterwards is a manual step in Settings →
  Branches.

Add a `required_status_checks` rule only when at least one check was approved: an empty list is
rejected.

## The artifact — `03-fixes.md`

```markdown
## <Group>
Decision: fix all | choose | keep as is
Fix: <finding ids>
Kept: <finding ids> — deliberate | not now

## Protection
Decision: …
Ruleset: update <id> | create | none
Covers: <the protection finding ids this ruleset fixes>
Required checks: <names>
Strict: yes | no
Bypass: <actor type:id — evidence>

## Report only
<findings with no API fix>
```

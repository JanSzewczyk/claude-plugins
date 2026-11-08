# Phase 2 — Judge

**Exit:** `02-findings.md` lists every finding from `01-settings.json` with its evidence, the
protection analysis below is done, and the findings are shown to the user. Nothing is changed yet.

**Input:** `01-settings.json`, `${CLAUDE_SKILL_DIR}/../../references/settings-catalog.md`.

## 1. Verify the script's findings

Take each finding as the script wrote it. Do not drop one because it looks minor and do not add one
the snapshot does not support. Where `unreadable` lists an endpoint, write the matching group as
**not checked**, never as "off". `plan` in `unreadable` means the billing tier is not visible:
say that findings on a private repository may need a paid tier, as their notes do.

## 2. Protection — the part the script cannot finish

The script flags missing protection, missing rules, missing or stale required checks, and release
workflows with no bypass. Finish the analysis from the snapshot:

- **Who pushes to the default branch.** For each workflow with `onPushToDefault` and an uncommented
  `pusherLines` entry, name the actor: `GITHUB_TOKEN` (or no token) → GitHub Actions,
  `Integration` 15368; an app token (`usesAppToken`) → that app, whose id the user must confirm;
  a PAT secret (`secrets.GH_TOKEN`, `secrets.PAT`) → the token's owner. Quote `file:line`.
- **Which checks should be required.** Propose the names in `lastMergedPr.checks`, leaving out
  checks posted by third-party apps that do not gate merging (for example deployment previews and
  comment bots); say which you left out and why. When there is no merged pull request, read the
  workflows with `pullRequestTrigger` and mark those names "unverified".
- **Required checks that never ran** (`required-check-never-ran:*`) are the most urgent finding: a
  pull request waits forever for them.

## 3. Show the findings

Write `02-findings.md` and show it:

```markdown
# Audit · <owner>/<repo>

> <worst severity> · <n> high · <n> medium · <n> low · <n> groups not checked

| Group | Status | Found |
|---|:-:|---|
| Features | 🟢/🔵/🟡/🔴/⚪ | … |
| Merge | … | … |
| Dependabot | … | … |
| Security | … | … |
| Actions | … | … |
| Protection | … | … |

| # | Sev | Group | Current | Recommended | Why it matters |
|:-:|:-:|---|---|---|---|
| 1 | 🔴 | Protection | `"Old CI"` is required | a check that runs | never ran on PR #<n>; PRs wait forever |

## Protection analysis
- Direct pushers: <file:line — actor>, or "none found in <files>"
- Proposed required checks: <names, with source>
- Left out: <names and why>

## Not checked
<endpoints from `unreadable`, or "nothing">
```

Marks: 🔴 `high`, 🟡 `medium`, 🔵 `low`, 🟢 nothing found, ⚪ not checked. If there are no
findings, the report is the heading and one line: `🟢 Matches the baseline`. Then write
`03-fixes.md` with the single line `No findings — nothing to decide`, mark `3 decide: skipped, no
findings`, and go to phase 4, which writes `04-nothing-to-fix`.

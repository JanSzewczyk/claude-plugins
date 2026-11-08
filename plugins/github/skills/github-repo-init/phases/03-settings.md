# Phase 3 — Settings

**Exit:** `03-settings.md` records a decision — accepted, adjusted or skipped — for every group
below. A group with no recorded decision cannot be told apart from a group that was forgotten.

**Input:** `01-brief.md`, `02-template.md`, and
`${CLAUDE_SKILL_DIR}/references/settings-catalog.md` for the exact values and the
tier availability of each setting.

## How to ask

One `AskUserQuestion` per group, never one per setting — thirty questions wear the user out and
they start accepting blindly. Each question shows the group's preset as a short list in the
question text and offers:

1. **Accept preset (Recommended)**
2. **Adjust** — then ask follow-up questions only for the settings the user wants to change
3. **Skip group** — nothing from this group goes into the plan

Leave a setting the owner's tier cannot have out of the preset and add one line to the question:
"Not available on <tier>: <settings>". Only when the template already configures something
differently (read it with `gh repo view <t> --json deleteBranchOnMerge,mergeCommitAllowed,
squashMergeAllowed,rebaseMergeAllowed,hasWikiEnabled,hasProjectsEnabled,hasDiscussionsEnabled`)
mention the template's value next to the preset, so the user can keep it.

Up to four groups fit one `AskUserQuestion` call. Use two calls for the six groups.

## The groups

| Group | Preset |
|---|---|
| Features | issues on; wiki, projects, discussions off |
| Merge | squash, merge commit and rebase **all enabled**; rebase recommended (see the note); delete head branch on merge; auto-merge on; update-branch button on; squash commit = PR title + commit messages; merge commit = PR title + PR body |
| Dependabot | alerts and dependency graph on; security updates on |
| Security | public only: secret scanning, push protection, private vulnerability reporting, code scanning default setup |
| Actions | `GITHUB_TOKEN` read-only by default; Actions may not approve pull requests; approval required for first-time contributors' fork workflows |
| Labels | template only: copy the template's labels (`gh label clone`) — skip when the template has none |

**Merge note.** GitHub has no setting for the default merge method; the merge button remembers each
user's last choice. Say so when the user asks for "rebase by default", and record the recommendation
in the report.

**Dependabot version updates** need a `.github/dependabot.yml` file, which this skill does not
write. Say so in the Dependabot question and in the report; if the template already has the file,
say that version updates arrive with the template.

## The artifact — `03-settings.md`

```markdown
## Features
Decision: accepted | adjusted | skipped
<the final values, one per line>

## Merge
Decision: …

## Dependabot
Decision: …

## Security
Decision: …
Not available: <settings and why, or none>

## Actions
Decision: …

## Labels
Decision: … | not applicable (empty option)
```

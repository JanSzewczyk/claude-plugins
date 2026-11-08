# Phase 7 — Clone and report

**Exit:** `07-report.md` is written and shown to the user. Each line in it traces to
`06-apply.json` or to an earlier artifact.

**Input:** `01-brief.md`, `02-template.md`, `03-settings.md`, `04-protection.md` (or `.skipped`),
`06-apply.json`.

## 1. Clone

Propose a directory with one `AskUserQuestion`. The recommended option is the parent directory of the
user's other projects plus the repository name: look at the current working directory and its
parent, for example `~/Projekty/<name>`. Also offer **Don't clone**.

Check that the target does not exist yet (`ls <dir>` must fail); never clone into an existing
directory. Then:

```bash
gh repo clone <owner>/<name> <dir>
```

## 2. The report — `07-report.md`

```markdown
# <owner>/<name>

URL: https://github.com/<owner>/<name>
Visibility: <…>   Source: <template owner/repo | empty + gitignore/license/readme>
Cloned to: <dir> | not cloned

## Applied
<one line per step with status ok, grouped>

## Not applied
| Setting | Why |
|---|---|
| <step> | failed: <short error> | not available on <plan> | skipped by you |

## Applied but not confirmed
<read-back mismatches, or "none">

## Still to do by hand
- Dependabot version updates: add `.github/dependabot.yml` (this skill writes no files).
- Required checks: <added | add them after the first CI run — names from 04-protection.md>.
- Secrets the template's workflows read: `gh secret set <NAME> -R <owner>/<name>` — you type
  the value.
- Social preview image: Settings → General → Social preview (no API).
- Merge button: there is no default merge method; pick <recommended method> on your first merge
  and GitHub remembers it.
- README and About text: `/repository-documentation` in the clone.
```

List under "Secrets" the names in `## Secrets referenced` of `04-protection.md`; if there are none,
drop the line.

Show the report in the reply.

## 3. Fix-up (only when needed)

If `## Applied but not confirmed` is not `none`, or phase 6 marked retry candidates, list the exact
`gh` command for each and ask once with `AskUserQuestion`: **Run these (Recommended) / Leave
them**. On yes, run exactly those commands and add their results to `07-report.md`. This is the
only write allowed after phase 6.

End the run there: no further `gh` writes without a new request.

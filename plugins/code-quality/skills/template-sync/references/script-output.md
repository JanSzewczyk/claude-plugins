# drift.json — what the script reports

`scripts/template_drift.py` writes `<workdir>/drift.json` and one patch per
changed file under `<workdir>/patches/`. Options: `--template`, `--ref`
(template branch), `--since` (anchor override), `--repo`, `--workdir`. Re-running
with the same workdir reuses the clone and fetches.

## Top level

| Field | Meaning |
|---|---|
| `template.spec`, `found_via` | which template, and whether it came from `--template`, the marker or GitHub |
| `template.ref`, `head` | template branch and the commit compared against |
| `template.web_url` | GitHub page; build links as `<web_url>/commit/<sha>` and `<web_url>/pull/<n>` |
| `anchor.sha`, `method`, `confidence` | the template commit the project last matched, and how it was found |
| `derived_head`, `derived_has_uncommitted_changes` | the project commit states were computed against |
| `commits[]` | template default-branch commits after the anchor (first-parent, so one per merged PR): `sha`, `date`, `subject`, `pr`, `files` |
| `files[]` | every file that differs between anchor and head in the template |

## Anchor methods, strongest first

1. `explicit --since` — the user said so.
2. `marker file .template-sync.json` — recorded by a previous sync.
3. `shared history` — the project is a clone or fork of the template; the
   newest commit both have.
4. `root tree hash matches a template commit` — "Use this template" copies the
   template tree into the project's first commit, so that commit's tree hash
   equals the tree of the template commit it was cut from. Exact.
5. `date fallback` — newest commit on the template's default branch (first
   parent only) before the project was created. Low confidence: confirm it.

## Per-file fields

| Field | Meaning |
|---|---|
| `path`, `old_path` | path at template head; `old_path` when the template renamed it |
| `template_status` | `A` added, `M` modified, `D` deleted, `R…` renamed |
| `category` | `runtime-and-dependencies`, `ci-cd`, `containers-and-environments`, `ai-agent-config`, `tooling-and-config`, `repo-meta`, `docs`, `generated-output`, `lockfile`, `source-and-scaffold` |
| `state` | see below |
| `touched_by` | short SHAs of the template commits that changed it |
| `template_patch`, `patch_lines` | the template's own diff, anchor → head (not written for lockfiles or already-applied files) |
| `package_json_delta` | for `package.json`: one row per changed dependency, script, engine or field, with `template_old`, `template_new`, `repo` and a `state` |
| `previously_skipped` | the reason recorded in the marker's `skipped` list |

## States — comparing three versions of each file

`old` = template at anchor, `new` = template at head, `cur` = project at HEAD.

| State | Condition | First reading |
|---|---|---|
| `already-applied` | cur = new | done |
| `clean-apply` | cur = old | project never touched it; template version can be taken as is |
| `missing-new-file` | template added it, project lacks it | probably missing; check it fits |
| `added-upstream-differs-here` | template added it, project has its own | compare: maybe done another way |
| `diverged` | cur differs from both | project edited it; merge by hand |
| `removed-here` | project deleted a file the template changed | probably not applicable |
| `delete-pending` | template deleted it, project has the old version | delete, if nothing here still uses it |
| `deleted-upstream-but-modified-here` | template deleted it, project edited it | decide: the project may depend on it |

These compare whole files. A `diverged` `package.json` is normal (the project
has its own name and dependencies); read its `package_json_delta` instead,
where each row is judged on its own.

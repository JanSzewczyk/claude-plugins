# drift.json — what the script reports

`scripts/template_drift.py` writes `<workdir>/drift.json`, one patch per
changed file under `<workdir>/patches/`, and the predefined message of the
commit that closes this sync in `<workdir>/sync-commit-message.txt`. Options:
`--template`, `--ref` (template branch), `--since` (anchor override), `--repo`,
`--workdir`. Re-running with the same workdir reuses the clone and fetches.

## Top level

| Field | Meaning |
|---|---|
| `template.spec`, `found_via` | which template, and whether it came from `--template`, a sync commit trailer, the legacy marker or GitHub |
| `template.ref`, `head` | template branch and the commit compared against |
| `template.web_url` | GitHub page; build links as `<web_url>/commit/<sha>` and `<web_url>/pull/<n>` |
| `anchor.sha`, `method`, `confidence`, `notes` | the template commit the project last matched, how it was found, and pointers that were found but could not be used |
| `last_sync` | the newest sync commit in the project: `commit`, `date`, `subject`, `template_sha` (its `Template-Sync` trailer); `null` on a first sync |
| `sync_count` | how many sync commits the project's history holds |
| `legacy_marker` | `.template-sync.json` exists; the next sync commit replaces it |
| `up_to_date` | anchor equals head: nothing to plan |
| `derived_head`, `derived_has_uncommitted_changes` | the project commit states were computed against |
| `commits[]` | template default-branch commits after the anchor (first-parent, so one per merged PR): `sha`, `date`, `subject`, `pr`, `kind`, `files` |
| `commits[].kind` | `dependency-bump` when the author is a bot (Dependabot, Renovate, …) or the subject is bump-shaped ("Bump X from A to B", "chore(deps): …", "Update dependency X to v9", "Lock file maintenance"); otherwise `change`. A heuristic: a human "Bump vite to 6" also lands here, so read the commit when its files matter |
| `files[]` | every file that differs between anchor and head in the template |
| `sync_commit_message` | path of the predefined commit message for step 7 |

## Anchor methods, strongest first

1. `explicit --since` — the user said so.
2. `sync commit <sha> (Template-Sync trailer, <date>)` — recorded by a
   previous sync; the normal case after the first run. Validated: the SHA
   must exist in the template and be an ancestor of the compared head,
   otherwise a `notes` entry says why it was ignored and the next method runs.
3. `marker file .template-sync.json (legacy)` — the file-based pointer from
   before sync commits, validated the same way.
4. `shared history` — the project is a clone or fork of the template; the
   newest commit both have.
5. `root tree hash matches a template commit` — "Use this template" copies the
   template tree into the project's first commit, so that commit's tree hash
   equals the tree of the template commit it was cut from. Exact.
6. `date fallback` — newest commit on the template's default branch (first
   parent only) before the project was created. Low confidence: confirm it.

Methods 4–6 walk the template's whole history and may call `gh`; 1–3 do
neither.

## The sync commit

The commit that closes a sync carries git trailers; the script finds it with
`git log --grep='^Template-Sync: '` anywhere in `HEAD`'s ancestry (a sync
merged through a pull request still counts) and takes the newest.

```
chore: sync with template OWNER/NAME @ 1d3782e

Template OWNER/NAME (main): 4b886fae2d..1d3782e5f7, 5 commits.

Template-Sync: 1d3782e5f775790ac51ef0943e19ba8e561892ca
Template-Source: OWNER/NAME
Template-Ref: main
Template-Skipped: .prettierrc -- Prettier replaced by Biome (team decision)
```

| Trailer | Meaning |
|---|---|
| `Template-Sync` | full SHA of the template commit the project matched after this sync; the next run's anchor |
| `Template-Source` | the template as given to `--template` or discovered: `OWNER/NAME`, URL or local path |
| `Template-Ref` | the template branch compared against |
| `Template-Skipped` | one per file the user chose not to take: `<path> -- <reason>`; collected from every sync commit, newest reason wins |

## Per-file fields

| Field | Meaning |
|---|---|
| `path`, `old_path` | path at template head; `old_path` when the template renamed it |
| `template_status` | `A` added, `M` modified, `D` deleted, `R…` renamed |
| `category` | `runtime-and-dependencies`, `ci-cd`, `containers-and-environments`, `ai-agent-config`, `tooling-and-config`, `repo-meta`, `docs`, `generated-output`, `lockfile`, `source-and-scaffold` |
| `state` | see below |
| `touched_by` | short SHAs of the template commits that changed it |
| `template_patch`, `patch_lines` | the template's own diff, anchor → head (not written for lockfiles or already-applied files) |
| `package_json_delta` | for `package.json`: one row per changed dependency, script, engine or field, with `template_old`, `template_new`, `repo`, a `state`, `touched_by` (the template commits that moved this row) and `routine_only` (every one of them is a `dependency-bump`: the row is the template's own update round, not a change) |
| `previously_skipped` | the reason recorded in a `Template-Skipped` trailer (or the legacy marker's `skipped` list) |

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

# Assessing a change against the project

The file states in drift.json say *how the bytes compare*. The status in the
plan says *what the project needs to do*. They usually agree, but not always,
and the cases where they disagree are the ones a plan gets wrong.

## Reading each state

**`clean-apply`** — the project never touched the file. Usually **missing**, and
the step is "take the template's version". Still read the template patch: if it
references something the project does not have (a script name, a directory, a
secret, a package), the step must add that too, or the change becomes
**adapt**.

**`missing-new-file`** — the template added it. Ask whether it fits here: a
new workflow for publishing a GitHub Action does not belong in a project that
turned the template into a web app. If it fits, **missing**; if not,
**not applicable** with the reason.

**`diverged`** — the project edited the file. Read three things: the template
patch (what the template wanted), the project's current file, and the
project's own history of that file (`git log -p --follow -- <path>` in the
project). Then:

- the template's hunks touch lines the project did not change → **adapt**,
  steps say which hunks to apply and that they apply cleanly; a three-way
  merge does this mechanically:
  `git merge-file <project file> <template@anchor> <template@head>` on copies
  in the scratchpad, to see whether it conflicts;
- the project already contains the template's result (same lines, or a newer
  or equivalent setting) → **already done**;
- the project's edit and the template's edit pull in different directions →
  **decision needed**, show both.

**`removed-here`** — the project deleted the file. Find out why (`git log
--diff-filter=D -- <path>`). Usually **not applicable**. If the commit that
removed it says it was replaced, look for the replacement and judge the change
against that file instead.

**`delete-pending`** — the template stopped using a file the project still has
unchanged. Before planning a delete, search the project for references to it
(configs that extend it, scripts that read it). If something still uses it,
the step includes moving that user over first.

**`added-upstream-differs-here`**, **`deleted-upstream-but-modified-here`** —
the project and the template made independent decisions about the same file.
Compare them; **already done** if equivalent, otherwise **decision needed**.

**`already-applied`** — nothing to do; list under *Already done*.

## Dependencies (`package_json_delta`, and the same reasoning for other manifests)

Judge each row, not the file. A row's `state` is a string comparison, so
re-check it:

- `diverged` with a project version **at or above** the template's new range
  → **already done** (the project upgraded on its own).
- `diverged` with a project version **below** the template's new range →
  **missing** (the project upgraded partway, or pinned).
- the template **removed** a dependency the project still has → check whether
  the project's own code imports it before planning the removal; often the
  template replaced it with something else, and the plan item is the
  replacement, not the removal.
- a **major** version bump → look up the dependency's official migration
  guide or changelog for the versions crossed and list the breaking changes
  that touch this project's code, with the files they touch. A major bump
  without that check is not a plan item yet.
- `engines`, `packageManager`, `.nvmrc`, `.node-version`, `.python-version`
  and the CI runtime version usually move together; plan them as one change.

For `pyproject.toml`, `requirements*.txt`, `go.mod`, `Cargo.toml` and other
manifests the script gives only the text patch: read it and apply the same
row-by-row judgment.

Lockfiles are never planned as edits. The step is the install command that
regenerates them after the manifest changes.

## Signs that a divergence is deliberate

Mark **decision needed** rather than **missing** when:

- a project commit message explains the difference ("pin X because…",
  "remove Y, we don't use it", "revert template's …");
- the project replaced a whole tool (another linter, another CI system,
  another package manager);
- the template change targets a use case the project dropped (publishing,
  a demo, a platform the project does not deploy to).

Say what the evidence is. The user decides; the plan does not overrule them.

## Effort

S — copy or edit a few lines, no code changes.
M — config migration or a minor bump touching some project code.
L — a major bump with breaking changes across the codebase, or a tool swap.

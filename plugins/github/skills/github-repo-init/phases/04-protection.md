# Phase 4 — Protection of the default branch

**Exit:** `04-protection.md` holds an approved ruleset: its rules, its bypass actors with the
evidence behind each one, and its required status checks with where each name came from. Or the
phase writes `04-protection.skipped` with the reason (the tier cannot have rulesets, or the user
declined).

**Input:** `01-brief.md`, `02-template.md`, `03-settings.md` (the Merge and Security decisions),
`${CLAUDE_SKILL_DIR}/../../references/ruleset-default.json`.

Do the evidence steps even when the answer looks obvious: both failures this phase prevents stay
invisible until the first release or the first pull request.

## 0. Availability

Rulesets work on public repositories on every plan, and on private repositories only with Pro,
Team or Enterprise. If the brief says private on Free, write `04-protection.skipped` with
"rulesets need Pro or higher for private repositories" and go on.

## 1. Who pushes to the default branch directly

Read every workflow in the template (for the empty option there are none — go to step 2):

```bash
gh api repos/<t>/contents/.github/workflows/<file> -H "Accept: application/vnd.github.raw"
```

Read commented-out steps too: a template often ships the release step disabled, and the new
repository will enable it. Look for a workflow triggered by `push` to the default branch that runs
one of `semantic-release`, `release-please`, `changesets`, `standard-version`, `npm version`,
`git push`, or `git commit` — or that creates an app token (`actions/create-github-app-token`,
`tibdex/github-app-token`). Then name the actor that pushes:

| What the workflow uses | Bypass actor to propose |
|---|---|
| `secrets.GITHUB_TOKEN` (or no token, `actions/checkout` default) | `Integration`, GitHub Actions app, `actor_id` 15368 |
| an app token from `app-id: ${{ vars.X }}` / `secrets.X` | `Integration` with that app's id — read `gh variable get X -R <t>` for a variable; a secret cannot be read, so ask the user for the id |
| a personal access token (`secrets.GH_TOKEN`, `secrets.PAT`) | the token owner as `User`, after asking who owns it |

Also read the template's existing rulesets (`gh api repos/<t>/rulesets/<id> --jq .bypass_actors`)
and offer to carry their bypass actors over.

Commits by `dependabot[bot]` arrive through pull requests and need no bypass.

While reading each workflow, record every `secrets.<NAME>` other than `GITHUB_TOKEN` for the
`## Secrets referenced` section of the artifact; phase 7 lists them for the user.

## 2. Ask about the bypass

One `AskUserQuestion`, multi-select:

- each detected actor, with its evidence (`release.yml:31 runs semantic-release with
  GITHUB_TOKEN`) — pre-recommended;
- **Repository admin** (`RepositoryRole`, `actor_id` 5) — not recommended by default: it lets you
  push to `main` past your own checks;
- **Nothing bypasses** — recommended only when step 1 found no direct pusher.

When step 1 found nothing, say so in the question ("no workflow in the template pushes to main")
and still ask, because the user may add a release workflow later.

Use `bypass_mode: always` for a release bot (it pushes, it does not open pull requests).

## 3. Required status checks

Checks must be required — a protected branch whose pull requests can merge red is protection in
name only. Take the names from checks that really ran:

```bash
pr=$(gh pr list -R <t> --state merged -L 1 --json number --jq '.[0].number')
gh pr checks "$pr" -R <t> --json name,workflow --jq '.[] | "\(.workflow) / \(.name)"'
```

The `name` is the check context to require (a job's `name:`, with ` (matrix values)` for a
matrix). If the template has no merged pull request, read the jobs of workflows triggered by
`pull_request` and use each job's `name:` (or its id when there is no name), and mark them
`source: workflow file — unverified`.

Ask with one multi-select `AskUserQuestion` listing each check with its source, all recommended,
and a second question for **strict** (the branch must be up to date with `main` before merging):
recommended yes.

If the template has no CI at all (or the repository is empty), say plainly that a required check
cannot be named yet and offer: **ruleset without required checks (Recommended)** — add them after
the first CI run — or **skip the ruleset**.

When the template has `codeql.yml` (or the Security group enabled code scanning), offer the
`code_scanning` rule (CodeQL, alerts `errors`, security alerts `high_or_higher`) as a separate
choice.

## 4. The rest of the ruleset

Start from `${CLAUDE_SKILL_DIR}/../../references/ruleset-default.json`: deletion and force-push blocked,
pull request required with **0 approvals** (a solo owner cannot approve their own pull request),
`allowed_merge_methods` set to the methods enabled in `03-settings.md` (all three when the Merge
group was accepted or skipped), review threads resolved before merge. Add the
`required_status_checks` rule (shape in `settings-catalog.md` → Protection) only when at least one
check was approved — GitHub rejects it with an empty list. Show the final rule list
in one question: **Accept (Recommended) / Adjust / Skip ruleset**.

## The artifact — `04-protection.md`

```markdown
Ruleset: default-branch
Enforcement: active
Strict checks: yes | no

## Rules
<rule types with their parameters>

## Bypass
| Actor type | Actor id | Mode | Evidence |
|---|---|---|---|
| Integration | 15368 | always | <file>:<line> runs semantic-release with GITHUB_TOKEN |

(or: "None — no direct pusher found in <files read>")

## Required checks
| Context | Source |
|---|---|
| <name> | template PR #<n> | workflow file — unverified |

## Secrets referenced
<`NAME` — <file> per line, or "none">

## Not verified
<what could not be confirmed — e.g. an app id the user typed, check names taken from workflow
files rather than a real run. Never empty: write "nothing" only if every row came from a run.>
```

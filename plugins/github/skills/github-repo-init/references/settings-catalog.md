# Settings catalog

Every setting the skill may propose, with the exact command phase 5 puts into the plan. Checked
against gh 2.103 and the GitHub REST API (version `2026-03-10`) in November 2026. `{repo}` is
replaced by `<owner>/<name>` by the apply script.

Tier column: **All** = every billing tier, public and private. **Public** = public repositories on
every tier; private ones need what the note says. Treat an unknown org tier as Free.

## Contents

- Creation: the `gh repo create` flags the script builds from `repo`
- Features: issues, wiki, projects, discussions
- Merge: merge methods, head-branch cleanup, commit-message templates
- Dependabot: alerts and security updates, linked with `needs`
- Security: secret scanning, push protection, vulnerability reporting, code scanning by tier
- Actions: token permissions and fork pull request approval
- Labels: copying labels from the template
- Protection: the ruleset request, rule shapes, bypass actor ids
- Ordering rules: the order the script enforces
- Not available through the API: what to tell the user instead

## Creation (built by the script from `repo`, not a step)

| Setting | gh | Tier | Default |
|---|---|---|---|
| Visibility | `--public` / `--private` / `--internal` | internal: Enterprise org | public, unless the brief says otherwise |
| Description | `--description` | All | from the brief, ≤ 350 chars |
| Template | `--template OWNER/REPO` | All | from phase 2 |
| All template branches | `--include-all-branches` | All | no |
| gitignore / license / README | `--gitignore NAME`, `--license KEY`, `--add-readme` | All; not with `--template` | from phase 2 |

## Features

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Issues, wiki, projects, discussions | `["repo","edit","{repo}","--enable-issues","--enable-wiki=false","--enable-projects=false","--enable-discussions=false"]` | wiki on private: Pro+ | as shown |

## Merge

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Merge methods, cleanup, auto-merge, update branch | `["repo","edit","{repo}","--enable-merge-commit","--enable-squash-merge","--enable-rebase-merge","--delete-branch-on-merge","--enable-auto-merge","--allow-update-branch"]` | All (auto-merge does nothing without a ruleset) | all methods on |
| Commit titles and messages | `["api","-X","PATCH","repos/{repo}","-f","squash_merge_commit_title=PR_TITLE","-f","squash_merge_commit_message=COMMIT_MESSAGES","-f","merge_commit_title=PR_TITLE","-f","merge_commit_message=PR_BODY"]` | All | as shown |

Values: `squash_merge_commit_title` `PR_TITLE`|`COMMIT_OR_PR_TITLE`; `squash_merge_commit_message`
`PR_BODY`|`COMMIT_MESSAGES`|`BLANK`; `merge_commit_title` `PR_TITLE`|`MERGE_MESSAGE`;
`merge_commit_message` `PR_BODY`|`PR_TITLE`|`BLANK`. Disabling a method: `--enable-<method>=false`.
`use_squash_pr_title_as_default` is deprecated — never use it.

## Dependabot

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Alerts + dependency graph | `["api","-X","PUT","repos/{repo}/vulnerability-alerts"]` (id `vulnerability-alerts`) | All | on |
| Security updates | `["api","-X","PUT","repos/{repo}/automated-security-fixes"]`, `needs: ["vulnerability-alerts"]` | All | on |
| Version updates | file `.github/dependabot.yml` — **not done by this skill** | All | report only |

Since 2026-07-14 version updates wait a 3-day cooldown by default; mention it if the user asks.

## Security

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Secret scanning | `["repo","edit","{repo}","--enable-secret-scanning"]` (id `secret-scanning`) | Public; private: org on Team/Enterprise with Secret Protection | on when public |
| Push protection | `["repo","edit","{repo}","--enable-secret-scanning-push-protection"]`, `needs: ["secret-scanning"]` | as above | on when public |
| Private vulnerability reporting | `["api","-X","PUT","repos/{repo}/private-vulnerability-reporting"]` | Public | on when public |
| Code scanning default setup | `["api","-X","PATCH","repos/{repo}/code-scanning/default-setup","-f","state=configured"]` | Public; private: Code Security | on when public and the template has code; answers 202 and runs asynchronously |

If the template already ships `codeql.yml` (advanced setup), do **not** enable default setup — the
two conflict; say that the template's workflow covers it.

## Actions

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Token permissions | `["api","-X","PUT","repos/{repo}/actions/permissions/workflow","-f","default_workflow_permissions=read","-F","can_approve_pull_request_reviews=false"]` | All | as shown |
| Fork PR approval | `["api","-X","PUT","repos/{repo}/actions/permissions/fork-pr-contributor-approval","-f","approval_policy=first_time_contributors"]` | All | as shown |

`default_workflow_permissions=read` is safe for templates whose workflows declare their own
`permissions:` block; if a template workflow has no `permissions:` and pushes or comments, say so
and offer `write`.

## Labels

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Copy labels | `["label","clone","<template>","-R","{repo}","--force"]` | All | when the template has custom labels |

## Protection

| Setting | Step args | Tier | Default |
|---|---|---|---|
| Default-branch ruleset | `["api","-X","POST","repos/{repo}/rulesets","--input","-"]` with `body` = the ruleset from `04-protection.md`, `group: "protection"` | Public; private: Pro, Team, Enterprise | on |

Rule types used: `deletion`, `non_fast_forward`, `pull_request`, `required_status_checks`
(`required_status_checks: [{ "context": "<name>" }]`, `strict_required_status_checks_policy`),
`code_scanning` (`code_scanning_tools: [{ "tool": "CodeQL", "alerts_threshold": "errors",
"security_alerts_threshold": "high_or_higher" }]`). Drop the `required_status_checks` rule entirely
when there are no checks — an empty list is rejected. Bypass actor: `{ "actor_type":
"Integration" | "RepositoryRole" | "User" | "Team", "actor_id": <id>, "bypass_mode": "always" |
"pull_request" }`; GitHub Actions app id `15368`, Admin role id `5`.

## Ordering rules

1. Create, then wait for the first commit (the script polls `commits?per_page=1`).
2. Settings steps in the order of this catalogue.
3. `automated-security-fixes` after `vulnerability-alerts`; push protection after secret scanning
   (expressed with `needs`).
4. Protection last (`group: "protection"`), so the ruleset never blocks an earlier step.
5. Topics: `["repo","edit","{repo}","--add-topic","a,b,c"]` (group `features`). `PUT /topics`
   replaces the set, `--add-topic` appends — on a new repository either works.

## Not available through the API

Social preview image (Settings UI only); secret values (the user runs `gh secret set`); the
default merge method (does not exist).

Sources: docs.github.com/en/rest/repos/repos, /rest/repos/rules, /rest/actions/permissions,
/rest/code-scanning/code-scanning, cli.github.com/manual/gh_repo_create and gh_repo_edit,
github.blog changelog 2026-07-14 (Dependabot cooldown) and 2026-02-13 (pull request access).

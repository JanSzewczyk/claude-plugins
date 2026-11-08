# `05-plan.json` schema

The file `scripts/apply-plan.mjs` executes. The script validates it first (exit 2 on any error) and
refuses `gh auth`, `gh secret`, `gh repo delete` and any `DELETE` request.

| Command | Does |
|---|---|
| `apply-plan.mjs <plan> --dry-run` | validates and prints the commands; calls nothing |
| `apply-plan.mjs <plan> --approve` | validates and writes `05-approved` (the plan's sha256) beside it |
| `apply-plan.mjs <plan> --out <report>` | applies; refuses (exit 2) unless `05-approved` matches the plan |

Exit codes: 0 created (see the report for each step), 1 create failed, 2 nothing ran (invalid,
unapproved or changed plan), 3 created but the run crashed or the report could not be written — the
JSON on stdout says what ran.

```json
{
  "repo": {
    "owner": "JanSzewczyk",
    "name": "invoice-tracker",
    "visibility": "public",
    "description": "Next.js app that tracks freelance invoices and payment status.",
    "homepage": "",
    "template": "JanSzewczyk/nextjs-szumplate",
    "includeAllBranches": false,
    "gitignore": null,
    "license": null,
    "addReadme": false
  },
  "steps": [
    { "id": "features", "group": "features",
      "args": ["repo", "edit", "{repo}", "--enable-issues", "--enable-wiki=false"] },
    { "id": "vulnerability-alerts", "group": "dependabot",
      "args": ["api", "-X", "PUT", "repos/{repo}/vulnerability-alerts"] },
    { "id": "automated-security-fixes", "group": "dependabot", "needs": ["vulnerability-alerts"],
      "args": ["api", "-X", "PUT", "repos/{repo}/automated-security-fixes"] },
    { "id": "ruleset", "group": "protection",
      "args": ["api", "-X", "POST", "repos/{repo}/rulesets", "--input", "-"],
      "body": "<the full ruleset approved in 04-protection.md, starting from references/ruleset-default.json>" }
  ]
}
```

| Field | Rule |
|---|---|
| `repo.template` | `owner/repo`, or `null` for the empty option. Not combined with `gitignore`, `license`, `addReadme`. |
| `repo.description` | ≤ 350 characters |
| `steps[].id` | unique; referenced by `needs` |
| `steps[].group` | `features`, `merge`, `dependabot`, `security`, `actions`, `labels`, `protection`. `protection` always runs last. |
| `steps[].args` | strings only: the gh arguments **without** the leading `gh`; `{repo}` is replaced with `owner/name` |
| `steps[].needs` | ids that must have succeeded; otherwise the step is reported `skipped` |
| `steps[].body` | JSON object sent on stdin; the args must contain `--input -`. In the example above it is abbreviated |

The report (`06-apply.json`) holds `create`, `waitedForCommit`, one entry per step with `status`
(`ok` | `failed` | `skipped` | `planned` in a dry run) and `error`, and `readBack` with the
repository view, Dependabot alerts and security updates, Actions token permissions and rulesets.

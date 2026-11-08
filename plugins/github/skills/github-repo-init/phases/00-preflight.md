# Phase 0 — Preflight

**Exit:** `00-preflight.md` names the login, every owner the user may create under, and each
owner's billing tier. A dead token stops the run here, in seconds, not after the user has answered ten
questions.

**Input:** the user's description of the project (the skill's argument, or ask for it in one line).

## Checks

Create the run directory first: `mkdir -p <session scratchpad>/github-repo-init/<YYYYMMDD-HHMMSS>`.

Then run these as written:

```bash
gh --version
gh auth status
gh api user --jq '{login: .login, plan: .plan.name}'
gh api user/orgs --jq '.[].login'
```

- `gh` missing or `gh auth status` failing → stop and tell the user to run `gh auth login`
  themselves.
- For each organization, read its billing plan; a 404 or empty answer means the user is not an org admin —
  record `plan: unknown` and treat the org as Free in later phases:

  ```bash
  gh api orgs/<org> --jq '.plan.name // "unknown"'
  ```

- Record the token scopes from `gh auth status`. `repo` is required. `workflow` is not needed,
  because the skill never pushes files.

## Billing tiers used later

| `plan.name` value | Tier |
|---|---|
| `free` (user) / `free` (org) | Free |
| `pro` | Pro |
| `team`, `business` | Team |
| `enterprise`, unknown enterprise values | Enterprise |
| `unknown` | Free |

## The artifact — `00-preflight.md`

```markdown
Login: <login>
Scopes: <scopes>
gh: <version>

## Owners
| Owner | Kind | Tier |
|---|---|---|
| <login> | user | <tier> |
| <org> | org | <tier, or Free when unknown> |

## Project description
<the user's words, verbatim>
```

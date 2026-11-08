# Phase 0 — Preflight

**Exit:** `00-preflight.md` names one repository and confirms the token is an admin of it. Without
admin access most settings answer 404, and an audit built on that would report everything as off.

**Input:** the skill's argument (`owner/repo`), or the current directory.

## Checks

Create the run directory, then run these as written:

```bash
gh --version
gh auth status
```

`gh` missing or not signed in → stop and tell the user to run `gh auth login` themselves.

Resolve the repository: the argument if given, otherwise the current directory's:

```bash
gh repo view --json nameWithOwner,viewerPermission,isArchived,isFork --jq '.'
```

(with an argument: `gh repo view <owner/repo> --json …`). If the directory is not a GitHub
repository and there is no argument, ask for `owner/repo` with `AskUserQuestion`.

- `viewerPermission` is not `ADMIN` → stop: say which repository and that only an admin can audit
  and change its settings.
- Archived → stop: an archived repository is read-only, nothing could be fixed.
- A fork → continue, but say that some security features are configured on the upstream.

## The artifact — `00-preflight.md`

```markdown
Repository: <owner>/<repo>
Permission: ADMIN
Fork: yes | no
gh: <version>
```

---
title: Record every public change in CHANGELOG.md in the Keep a Changelog format
summary: Each pull request that changes public behaviour adds an entry under Unreleased, grouped by kind.
impact: low
applies: []
sources: [https://keepachangelog.com/en/1.1.0/]
---

## Rule

Every pull request that changes public behaviour adds an entry to `CHANGELOG.md` under `Unreleased`, grouped as Added, Changed, Deprecated, Removed, Fixed or Security.

## Why

Without a changelog users learn about a removal from a stack trace, and maintainers rebuild the history from commit messages at release time.

## Incorrect

```markdown
## Unreleased

- misc fixes
```

## Correct

```markdown
## Unreleased

### Deprecated

- `get_user()`; use `fetch_user()`. Removal planned for 3.0.

### Fixed

- `fetch_user()` no longer retries on 404.
```

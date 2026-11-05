---
title: Install from a hashed lockfile and audit dependencies in CI on every pull request
summary: Install from a hashed lockfile (uv.lock, pylock.toml) and run pip-audit on every pull request and on a schedule.
impact: high
applies: [python]
sources: [https://peps.python.org/pep-0751/, https://docs.astral.sh/uv/concepts/projects/sync/]
---

## Rule

Install from a lockfile that records hashes and fail CI when it is out of date. Run `pip-audit` (or `uv audit` where available) on every pull request and on a schedule. Treat the result as a check against known CVEs, not against zero-days.

## Why

An unlocked install resolves to whatever was published a minute ago, so a hijacked release reaches production unreviewed, while a hashed lockfile makes the same bytes install everywhere.

## Incorrect

```python
pip install -r requirements.txt
```

## Correct

```python
uv sync --locked          # fails when uv.lock is stale
pip-audit
```

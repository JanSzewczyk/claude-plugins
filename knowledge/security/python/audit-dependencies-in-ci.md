---
title: Audit dependencies in CI on every pull request and on a schedule
summary: Run pip-audit against known advisories per PR and on a schedule; it finds known CVEs, not zero-days.
impact: high
applies: [python]
sources: [https://pypi.org/project/pip-audit/, https://docs.astral.sh/uv/concepts/projects/export/]
---

## Rule

Run `pip-audit` in CI on every pull request and on a schedule against the locked dependencies: export the lockfile and pass it with `-r` and `--disable-pip`. Treat a finding as a known vulnerability to fix or consciously accept, and do not read a clean run as proof of safety.

## Why

A pinned, hashed dependency can still carry a published CVE, and new advisories appear for versions you installed months ago, so only a recurring audit notices. A bare `uvx pip-audit` audits uvx's own isolated environment, not the project, so it reports clean whatever the lockfile holds.

## Incorrect

```yaml
# .github/workflows/ci.yml
- run: uv sync --locked
- run: uv run pytest
```

## Correct

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
  schedule:
    - cron: "0 6 * * 1"   # new advisories appear without a new commit
# ...
- run: uv sync --locked
- run: uv export --locked --no-emit-project -o requirements.txt
- run: uvx pip-audit -r requirements.txt --disable-pip   # a bare `uvx pip-audit` checks uvx's own environment
- run: uv run pytest
```

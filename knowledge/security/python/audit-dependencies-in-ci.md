---
title: Audit dependencies in CI on every pull request and on a schedule
summary: Run pip-audit against known advisories per PR and on a schedule; it finds known CVEs, not zero-days.
impact: high
applies: [python]
sources: [https://pypi.org/project/pip-audit/]
---

## Rule

Run `pip-audit` in CI on every pull request and on a schedule against the locked dependencies. Treat a finding as a known vulnerability to fix or consciously accept, and do not read a clean run as proof of safety.

## Why

A pinned, hashed dependency can still carry a published CVE, and new advisories appear for versions you installed months ago, so only a recurring audit notices.

## Incorrect

```yaml
# .github/workflows/ci.yml
- run: uv sync --locked
- run: uv run pytest
```

## Correct

```yaml
# .github/workflows/ci.yml
- run: uv sync --locked
- run: uvx pip-audit
- run: uv run pytest
```

---
title: Publish to PyPI with Trusted Publishing instead of a long-lived token
summary: OIDC credentials last minutes; a token stored in secrets can leak and stays valid.
impact: medium
applies: [python]
sources: [https://docs.pypi.org/trusted-publishers/]
---

## Rule

Publish from CI through PyPI Trusted Publishing (OIDC). Do not store a PyPI API token in repository secrets.

## Why

A long-lived token that leaks from a log or a compromised workflow lets anyone upload a release under your name until someone notices; an OIDC credential is valid for only 15 minutes and comes from the publisher configuration you registered on PyPI.

## Incorrect

```yaml
publish:
  runs-on: ubuntu-latest
  steps:
    - run: twine upload dist/*
      env:
        TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

## Correct

```yaml
publish:
  runs-on: ubuntu-latest
  permissions:
    id-token: write
  steps:
    - uses: pypa/gh-action-pypi-publish@release/v1
```

---
title: Run claude plugin validate and the drift check on every pull request
summary: validate checks each manifest's shape; the drift check catches docs, agents arrays and versions that fell behind.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins-reference]
---

## Rule

In CI run `claude plugin validate --strict` on the marketplace and on each plugin directory (it does not read other plugins from the marketplace root), plus a drift check such as `marketplace-doctor` and a version-bump check against the PR base.

## Why

Each of these breaks silently at install, not at commit: an unregistered plugin, an unlisted agent, a stale README, a change shipped without a bump.

## Incorrect

```text
CI: none — validated by hand before a release
```

## Correct

```text
CI: claude plugin validate --strict . && for p in plugins/*; do claude plugin validate --strict "$p"; done
    node check-marketplace.mjs . && node plan-release.mjs . --check --since origin/main
```

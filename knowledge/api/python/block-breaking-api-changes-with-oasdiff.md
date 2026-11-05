---
title: Compare the spec with the main branch using oasdiff and fail on breaking changes
summary: oasdiff breaking reports removed fields and tightened types between two spec versions.
impact: medium
applies: [python, oasdiff]
sources: [https://github.com/oasdiff/oasdiff, https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md]
---

## Rule

In CI, export the spec from `main` and run `oasdiff breaking openapi-main.json openapi.json --fail-on ERR`. An intended break ships as a new API version.

## Why

A linter sees one spec, so a removed field or a narrowed type passes every check and breaks clients on release.

## Incorrect

```bash
spectral lint openapi.json
```

## Correct

```bash
git show origin/main:openapi.json > openapi-main.json
oasdiff breaking openapi-main.json openapi.json --fail-on ERR
```

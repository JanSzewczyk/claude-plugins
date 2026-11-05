---
title: Lint the OpenAPI document with Spectral in CI and fail on warnings
summary: Spectral checks one spec against the spectral:oas ruleset plus team rules for naming and descriptions.
impact: low
applies: [python, spectral]
sources: [https://github.com/stoplightio/spectral]
---

## Rule

Run `spectral lint openapi.json --fail-severity=warn` in CI, with `.spectral.yaml` extending `spectral:oas` and the team's own rules.

## Why

Nothing else checks that operations have descriptions and ids, so the spec's quality erodes one pull request at a time.

## Incorrect

```yaml
# CI: generate openapi.json and publish it
```

## Correct

```yaml
# .spectral.yaml
extends: ["spectral:oas"]

# CI
spectral lint openapi.json --fail-severity=warn
```

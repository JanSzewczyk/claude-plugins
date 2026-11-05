---
title: Install the plugin from a local marketplace before pushing a release
summary: validate checks files; only an install finds a wrong source, a missing directory or a reserved name.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/publish, https://code.claude.com/docs/en/plugins/create-marketplace]
---

## Rule

Before each release, add the marketplace checkout with `claude plugin marketplace add ./`, install the changed plugin by `<plugin>@<marketplace>`, and confirm with `claude plugin list` and one skill run that it loads.

## Why

`claude plugin validate` passes while the install still fails with `Source path does not exist` or a reserved-name refusal, so users meet the error first.

## Incorrect

```bash
claude plugin validate . && git push
```

## Correct

```bash
claude plugin validate . --strict
claude plugin marketplace add ./ && claude plugin install formatter@my-marketplace
claude plugin list   # Status: ✔ enabled
```

---
title: Run Schemathesis against the OpenAPI document and fix the code, not the test
summary: It generates requests from the spec and finds 5xx errors, schema mismatches and undeclared statuses.
impact: medium
applies: [python, schemathesis]
sources: [https://schemathesis.readthedocs.io/en/stable/reference/cli/]
---

## Rule

Run `schemathesis run openapi.json --url <base-url>` in CI against a test instance, using the exported spec. Fix a mismatch in the code or in `responses`, never by loosening the test.

## Why

Hand-written tests cover the inputs the author imagined; Schemathesis finds the 500 on the input nobody tried and the response the spec does not declare.

## Incorrect

```bash
# only hand-picked happy-path requests
```

## Correct

```bash
schemathesis run openapi.json --url http://localhost:8000
```

---
title: Query by the text users read, not by translation keys
summary: Look up the default locale's real text, so a changed label is a change the test reports.
impact: medium
sources: [https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change]
---

## Rule

Query and assert on text as a user reads it in the default locale, never on the translation key behind it.

## Why

A test that looks for `auth.username` still passes after the label changes from "Username" to "Email",
which is exactly the change a test should report.

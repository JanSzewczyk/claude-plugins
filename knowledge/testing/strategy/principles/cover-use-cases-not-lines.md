---
title: Judge a suite by the use cases it covers, not by a coverage percentage
summary: Use the coverage report to find untested code; set no percentage target for an application, and none for E2E tests.
impact: medium
sources: [https://kentcdodds.com/blog/how-to-know-what-to-test, https://kentcdodds.com/blog/write-tests]
---

## Rule

Use a coverage report only to find code without tests, and judge a suite by which use cases it covers.
Set no percentage target for an application, and do not measure coverage on E2E tests.

## Why

A percentage target gets met with tests of the cheapest lines, so a suite can report 100% while an
unhandled use case ships broken.

## Exceptions

A small open source library used in many places can justify aiming for 100%.

---
title: Add new tests to the project's existing suite, in the file for their topic
summary: A new test goes in the file for its topic; do not write a case twice or open a parallel suite.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/explanation/goodpractices.html]
---

## Rule

Put a new test in the project's existing test directory, in the file that already holds its topic (status cases beside the other status cases, race tests beside the other race tests). Before you write, check which cases an existing test already proves and write only the rest; a case is never written twice. A weak existing test is fixed in place, see `testing/principles/every-test-must-be-able-to-fail`.

## Why

A status code changes in one suite while the copy of that case in a second suite still asserts the old value and stays green, so the same behaviour has to be updated, and can be forgotten, in two places (a second directory once repeated the status table and the race tests).

## Incorrect

```
tests/
  test_api.py          # status cases
  test_concurrency.py  # race tests
tests_extra/
  test_status.py       # the same status cases again
  test_races.py        # the same race tests again
```

## Correct

```
tests/
  test_api.py          # status cases, the missing ones added here
  test_concurrency.py  # race tests, the weak one strengthened here
```

## Exceptions

A suite split by kind or cost (end-to-end, load tests, a nightly fuzz run) is not a parallel suite and may live in its own directory, run from its own named target and a scheduled CI job. A directory that belongs to the normal check is registered as in `tooling/python/register-every-test-directory-in-the-check-gate`.

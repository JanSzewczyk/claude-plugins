---
title: Make every test pass alone and in any order
summary: No test relies on what an earlier one clicked or mocked; reset mocks per test, share setup through helpers.
impact: high
---

## Rule

Write each test so it passes when run alone and in any order. Configure and reset mocks before each
test, and share repeated setup through a small helper function, never through a mutable variable
that tests write to.

## Why

A test that leans on an earlier one passes in the full run and fails when filtered or reordered,
which shows up as a flaky suite whose failures point at the wrong test.

---
title: Spend most testing effort on integration tests
summary: Integration gets the largest share, E2E a few critical happy paths, unit the complex logic, static checks the typos.
impact: high
sources: [https://kentcdodds.com/blog/write-tests, https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications, https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests]
---

## Rule

Give integration tests the largest share of testing effort, keep E2E tests to the happy paths of
critical flows, use unit tests for pure functions and complex logic, and leave typos and wrong types
to static analysis. Choose the layer by the problem: a calculator edge case is a unit test, a form
submit with validation is an integration test, logging in through the whole app is an E2E test.

## Why

A suite of isolated unit tests stays green while the pieces fail to work together, and a suite of E2E
tests is too slow and costly to reach the edge cases. Static analysis does not replace either, because
it cannot see a wrong business rule.

## Exceptions

This holds for one codebase, a frontend or a monolith. It says nothing about a microservice architecture.

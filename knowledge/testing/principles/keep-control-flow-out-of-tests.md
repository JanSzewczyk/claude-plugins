---
title: Keep branches and loops out of a test's body
summary: A branch means some runs check nothing; write straight-line steps and parametrise over inputs.
impact: high
sources: [https://abseil.io/resources/swe-book/html/ch12.html, https://abseil.io/resources/swe-book/html/ch11.html]
---

## Rule

Write each test as straight-line code (arrange, act, assert), with no `if` or loop around the
action or the assertion. Run one behaviour over many inputs with the framework's parametrisation
instead of a loop.

## Why

A branch in a test means some runs check nothing, and a loop over inputs stops at the first failure
without naming the input that broke.

## Exceptions

A helper that waits for a condition, or that starts the competing calls of a race test, may loop
inside itself; the test that calls it stays straight-line.

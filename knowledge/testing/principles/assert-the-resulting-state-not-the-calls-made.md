---
title: Assert the resulting state, not which calls the code made to its collaborators
summary: Check the return value, the error or a dependency's resulting state; verify a call only when it is the behaviour.
impact: high
sources: [https://abseil.io/resources/swe-book/html/ch12.html, https://abseil.io/resources/swe-book/html/ch13.html]
---

## Rule

Assert on what the code produced: its return value, the error it raised, or the state now held by a
real or fake dependency. Verify a call on a mock only when the call itself is the behaviour, such as
sending an e-mail, charging a card or invoking a callback a developer passed in, and then check only
the arguments that behaviour depends on.

## Why

A test that asserts `repo.save` was called once with given arguments fails on every harmless
refactor and still passes when the saved data is wrong, because it checks how the result was
reached instead of the result.

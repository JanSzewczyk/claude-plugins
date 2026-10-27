---
title: Keep the unit under test real, and change the test rather than the code
summary: Never mock the thing being tested or edit it to make a new test pass; report a failure that shows a real bug.
impact: high
---

## Rule

Mock only what the unit under test depends on, never the unit itself. When a new test fails, fix
the test; if the failure shows a real defect in the code, report it instead of editing the code or
weakening the assertion to make the test pass.

## Why

A mocked or quietly patched unit makes the test check itself: it passes while the shipped code is
still broken, and the bug it found disappears from view.

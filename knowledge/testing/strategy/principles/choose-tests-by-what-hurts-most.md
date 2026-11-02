---
title: Choose the next test by what would hurt most if it broke
summary: Start from the worst breakage in untested code, narrow to its units and users, write the manual steps, automate them.
impact: medium
sources: [https://kentcdodds.com/blog/how-to-know-what-to-test]
---

## Rule

Pick the next test by asking what in the untested part of the app would hurt most if it broke. Narrow
that to one or a few units of code, name who uses them, write the instructions you would give a manual
tester, and turn those instructions into the automated test.

## Why

Tests chosen by walking through branches, loops and lifecycles cover code nobody would miss while the
checkout flow stays untested, so effort goes up and confidence does not.

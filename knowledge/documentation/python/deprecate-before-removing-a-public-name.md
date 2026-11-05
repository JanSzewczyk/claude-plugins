---
title: Mark a public name with warnings.deprecated for at least one minor release
summary: Callers get a runtime warning and a type-checker hint first; the removal lands in a later release.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-0702/, https://docs.python.org/3/library/warnings.html#warnings.deprecated]
---

## Rule

Before removing a public function, class or method, decorate it with `@warnings.deprecated("Use X instead")`, keep it for at least one minor release, remove it only in the next major version, and list it under Deprecated in the changelog.

## Why

A name deleted without warning breaks callers who never saw the notice; the decorator emits a `DeprecationWarning` (shown under pytest and with `-W`) and type checkers flag the call.

## Incorrect

```python
# 2.0: removed, callers fail with ImportError
# def get_user(...): ...
```

## Correct

```python
from warnings import deprecated

@deprecated("Use fetch_user() instead; removal planned for 3.0.")
def get_user(user_id: int) -> User: ...
```

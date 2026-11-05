---
title: Never leave a finally block with return, break or continue
summary: The compiler warns (PEP 765): control flow out of finally swallows the exception in flight.
impact: high
applies: [python]
sources: [https://peps.python.org/pep-0765/]
---

## Rule

Do not use `return`, `break` or `continue` to exit a `finally` block. Compute the value before the `try`, or return after it.

## Why

Leaving `finally` that way silently discards an exception raised in the `try`, so a failure looks like success; Python reports it as a `SyntaxWarning`.

## Incorrect

```python
def read(path):
    try:
        return open(path).read()
    finally:
        return ""  # hides every error
```

## Correct

```python
def read(path):
    with open(path) as handle:
        return handle.read()
```

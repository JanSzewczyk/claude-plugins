---
title: Never leave a finally block with return, break or continue
summary: Control flow out of finally swallows the exception in flight (PEP 765).
impact: high
applies: [python]
sources: [https://peps.python.org/pep-0765/]
---

## Rule

Do not use `return`, `break` or `continue` to exit a `finally` block. Keep `finally` for cleanup, and return or compute the value outside it.

## Why

Leaving `finally` that way silently discards an exception raised in the `try`, so a failure looks like success; Python 3.14 and newer report it as a `SyntaxWarning`, older versions accept it silently.

## Incorrect

```python
def read(path):
    handle = open(path)
    try:
        return handle.read()
    finally:
        return ""  # hides every error
```

## Correct

```python
def read(path):
    handle = open(path)
    try:
        return handle.read()
    finally:
        handle.close()
```

---
title: Catch the specific exception, around only the statement that can raise it
summary: No bare except; keep the try block to the one call that can fail so a typo does not become a silent default.
impact: high
applies: [python]
sources: [https://peps.python.org/pep-0008/#programming-recommendations]
---

## Rule

Catch the exact exception you expect, around only the statement that can raise it. Never write a bare `except:`; use `except Exception:` for program errors.

## Why

A bare `except:` also swallows `SystemExit` and `KeyboardInterrupt`, so the process cannot be stopped, and a wide `try` hides which line failed and turns a typo into a silent default.

## Incorrect

```python
def load_port(raw):
    try:
        config = parse(raw)
        return int(config["port"])
    except:
        return 8080
```

## Correct

```python
def load_port(raw):
    config = parse(raw)
    try:
        return int(config["port"])
    except (KeyError, ValueError):
        return 8080
```

## Exceptions

A bare `except:` is acceptable only when the handler logs and re-raises.

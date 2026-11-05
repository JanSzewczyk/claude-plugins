---
title: Catch specific exceptions, keep try blocks short and chain with raise from
summary: No bare except; wrap only the call that can raise; custom errors end in Error and chain with raise X from Y.
impact: high
applies: [python]
sources: [https://peps.python.org/pep-0008/#programming-recommendations]
---

## Rule

Catch the exact exception you expect, around only the statement that can raise it. Never write a bare `except:`; use `except Exception:` for program errors. Custom exceptions inherit from `Exception`, end in `Error`, and are chained with `raise NewError(...) from err`.

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
class ConfigError(Exception):
    """Raised when the configuration is unusable."""

def load_port(raw):
    config = parse(raw)
    try:
        return int(config["port"])
    except (KeyError, ValueError) as err:
        raise ConfigError("invalid port") from err
```

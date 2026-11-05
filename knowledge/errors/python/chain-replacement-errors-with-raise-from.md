---
title: Chain a replacement exception with raise X from err
summary: When one exception stands in for another, raise ... from err keeps the original traceback.
impact: medium
applies: [python]
sources: [https://peps.python.org/pep-0008/#programming-recommendations]
---

## Rule

When you raise a different exception in response to a caught one, write `raise NewError(...) from err` so the cause stays attached.

## Why

Without `from`, the original traceback is shown only as an implicit context, and code that translates a low-level error loses which failure actually happened.

## Incorrect

```python
def load_port(raw):
    try:
        return int(parse(raw)["port"])
    except (KeyError, ValueError):
        raise ConfigError("invalid port")
```

## Correct

```python
def load_port(raw):
    try:
        return int(parse(raw)["port"])
    except (KeyError, ValueError) as err:
        raise ConfigError("invalid port") from err
```

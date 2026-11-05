---
title: Expect an exception with a specific type, match= and one statement in the block
summary: pytest.raises(Exception) passes when a different bug raises; match= and a one-line block pin the cause.
impact: high
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/assert.html#assertions-about-expected-exceptions, https://docs.astral.sh/ruff/rules/pytest-raises-too-broad/, https://docs.astral.sh/ruff/rules/pytest-raises-with-multiple-statements/]
---

## Rule

Use `pytest.raises(SpecificError, match=...)` with exactly one statement inside the block.

## Why

A broad `pytest.raises(Exception)`, or a block that also runs setup, passes when the setup or a typo raises, so the test stays green while the behaviour is broken; `match=` (a regex searched in the message) rules out a different error of the same type.

## Incorrect

```python
with pytest.raises(Exception):
    order = Order(total=-1)
    charge(order)
```

## Correct

```python
order = Order(total=-1)
with pytest.raises(ValueError, match="amount must be positive"):
    charge(order)
```

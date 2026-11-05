---
title: Use plain assert and test one behaviour at a time
summary: A test with one reason to fail has a name that says what broke; several asserts for that behaviour are fine.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/assert.html]
---

## Rule

Write plain `assert` statements, not `self.assertEqual`, and give each test one behaviour to check. Several `assert` lines are fine when they describe the same behaviour.

## Why

A test that checks three behaviours gets a vague name and fails without saying which behaviour broke.

## Incorrect

```python
def test_discount():
    result = apply_discount(order, percent=150)
    assert result.total == Decimal("0.00")
    assert result.applied_percent == 100
    assert send_receipt.called   # a different behaviour
```

## Correct

```python
def test_discount_never_goes_below_zero():
    result = apply_discount(order, percent=150)
    assert result.total == Decimal("0.00")
    assert result.applied_percent == 100
```

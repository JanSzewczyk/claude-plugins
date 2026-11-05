---
title: Control the clock with time-machine, not hand-patched datetime
summary: time-machine moves the clock for the whole process, including names already imported.
impact: medium
applies: [python, pytest, time-machine]
sources: [https://time-machine.readthedocs.io/]
---

## Rule

Freeze or move time with `@time_machine.travel(...)` instead of patching `datetime` yourself.

## Why

A hand-written patch replaces `datetime` in one module only, so code that imported it elsewhere keeps reading the real clock and the test passes or fails by the hour.

## Incorrect

```python
with patch("myapp.billing.datetime"):
    make_invoice()   # reports.py imports datetime itself and still sees real time
```

## Correct

```python
@time_machine.travel("2026-11-05 12:00", tick=False)
def test_invoice_is_due_in_30_days():
    assert make_invoice().due == date(2026, 12, 5)
```

---
title: Pin every counterexample Hypothesis finds as an @example
summary: A failure found by generated inputs becomes a fixed regression case that runs on every build.
impact: medium
applies: [python, pytest, hypothesis]
sources: [https://hypothesis.readthedocs.io/en/latest/reference/api.html#hypothesis.example, https://hypothesis.readthedocs.io/en/latest/tutorial/replaying-failures.html]
---

## Rule

For round-trips, idempotent operations and other invariants write a `@given` test. When Hypothesis finds a failing input, add it as an `@example` on that test.

## Why

Hypothesis' local example database is not committed, so a failure it found on one machine can pass on the next run and return unnoticed, while an `@example` is replayed every time.

## Incorrect

```python
@given(st.dictionaries(st.text(), st.integers()))
def test_roundtrip(data):
    assert decode(encode(data)) == data   # failed on {"": 0}; fixed, not pinned
```

## Correct

```python
@given(st.dictionaries(st.text(), st.integers()))
@example({"": 0})   # found by Hypothesis: empty key was dropped
def test_roundtrip(data):
    assert decode(encode(data)) == data
```

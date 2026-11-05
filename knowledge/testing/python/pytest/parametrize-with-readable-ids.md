---
title: Use @pytest.mark.parametrize with ids= for the same logic over many inputs
summary: One test body, named cases; no test_case_1, test_case_2 copies.
impact: low
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/parametrize.html]
---

## Rule

Cover the same behaviour over several inputs with `@pytest.mark.parametrize`, and give each case a readable `ids=` entry.

## Why

Copy-pasted tests drift apart, and anonymous ids such as `test_x[3-4-7]` do not say which case failed.

## Incorrect

```python
def test_add_1(): assert add(1, 2) == 3
def test_add_2(): assert add(-1, 1) == 0
```

## Correct

```python
@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [(1, 2, 3), (-1, 1, 0)],
    ids=["positives", "cancel-out"],
)
def test_add(a, b, expected):
    assert add(a, b) == expected
```

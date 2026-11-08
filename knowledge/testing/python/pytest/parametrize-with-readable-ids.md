---
title: Give every parametrized pytest case a readable id
summary: Name each case with pytest.param(id=) or ids=, so a failure says which input broke.
impact: low
applies: [python, pytest]
implements: testing/principles/keep-control-flow-out-of-tests
sources: [https://docs.pytest.org/en/stable/example/parametrize.html]
---

## Rule

Give each case of `@pytest.mark.parametrize` a readable id, with `pytest.param(..., id=...)` next to its data or an `ids=` list.

## Why

Anonymous ids such as `test_add[1-2-3]` do not say which case failed or what it was meant to cover.

## Incorrect

```python
@pytest.mark.parametrize(("a", "b", "expected"), [(1, 2, 3), (-1, 1, 0)])
def test_add(a: int, b: int, expected: int) -> None:
    assert add(a, b) == expected
```

## Correct

```python
@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [pytest.param(1, 2, 3, id="positives"), pytest.param(-1, 1, 0, id="cancel-out")],
)
def test_add(a: int, b: int, expected: int) -> None:
    assert add(a, b) == expected
```

---
title: Keep fixtures function-scoped; widen the scope only for resources tests never mutate
summary: A module or session fixture that tests modify makes results depend on test order.
impact: high
applies: [python, pytest]
implements: testing/principles/tests-pass-alone-in-any-order
sources: [https://docs.pytest.org/en/stable/how-to/fixtures.html#fixture-scopes]
---

## Rule

Leave fixtures at the default `function` scope. Use `module` or `session` only for expensive resources that no test mutates, or reset them per test.

## Why

A shared fixture that one test modifies makes the next test pass or fail depending on the order they run in.

## Incorrect

```python
@pytest.fixture(scope="session")
def cart():
    return Cart()   # tests call cart.add(...)
```

## Correct

```python
@pytest.fixture
def cart():
    return Cart()
```

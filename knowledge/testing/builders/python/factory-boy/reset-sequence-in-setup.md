---
title: Reset factory sequences in setup when a test depends on sequence values
summary: Factory.reset_sequence() restarts a Sequence; factory.random.reseed_random() makes Faker values reproducible.
impact: medium
applies: [python, factory-boy]
implements: testing/builders/principles/reset-builder-state-between-tests
sources: [https://factoryboy.readthedocs.io/en/stable/reference.html]
---

## Rule

In tests whose assertions depend on `factory.Sequence` values, call `Factory.reset_sequence()` in the
fixture or `setUp` that runs before each of them. Call `factory.random.reseed_random(seed)` once when a
test depends on Faker or fuzzy output.

## Why

Sequence counters live on the factory class for the whole test session, so `username == "user0"` holds
only for whichever test built a user first.

## Incorrect

```python
def test_first_user_gets_user0():
    assert UserFactory.build().username == "user0"
```

## Correct

```python
@pytest.fixture(autouse=True)
def reset_user_sequence():
    UserFactory.reset_sequence()

def test_first_user_gets_user0():
    assert UserFactory.build().username == "user0"
```

---
title: Call Factory.build() unless the test needs the row in the database
summary: Calling the factory directly runs create() and writes to the database; build() keeps a test in memory.
impact: medium
applies: [python, factory-boy]
sources: [https://factoryboy.readthedocs.io/en/stable/reference.html]
---

## Rule

Use `Factory.build()` and `build_batch()` for objects the code under test only reads. Use
`create()` or `create_batch()` only when the test needs the rows persisted, for example to exercise
a query.

## Why

`UserFactory()` uses the create strategy. With an ORM factory such as `DjangoModelFactory` every
call is a database write, so a suite that never needed the database becomes slow and needs a
database fixture.

## Incorrect

```python
def test_display_name():
    user = UserFactory(name="Ada Lovelace")
    assert user.display_name == "Ada Lovelace"
```

## Correct

```python
def test_display_name():
    user = UserFactory.build(name="Ada Lovelace")
    assert user.display_name == "Ada Lovelace"
```

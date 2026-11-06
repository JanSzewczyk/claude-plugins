---
title: Pass asserted values as keyword arguments and model states as Traits
summary: UserFactory.build(name=...) for one object, build_batch(n, ...) for lists, class Params Traits for named states.
impact: high
applies: [python, factory-boy]
implements: testing/builders/principles/set-asserted-values-explicitly
sources: [https://factoryboy.readthedocs.io/en/stable/reference.html]
---

## Rule

Pass every value the test asserts on as a keyword argument to the factory call. Use
`build_batch(size, **kwargs)` for lists. Define recurring states as `factory.Trait` in the
factory's `class Params` and switch them on with `admin=True`.

## Why

A Faker-generated name asserted in a test passes only by coincidence of the seed, and the reader
cannot see which input the test depends on.

## Incorrect

```python
user = UserFactory.build()
assert render_greeting(user) == f"Hello, {user.name}"
```

## Correct

```python
class UserFactory(factory.Factory):
    class Meta:
        model = User

    name = factory.Faker("name")
    role = "member"

    class Params:
        admin = factory.Trait(role="admin")


user = UserFactory.build(name="Ada Lovelace")
admins = UserFactory.build_batch(3, admin=True)
assert render_greeting(user) == "Hello, Ada Lovelace"
```

## Exceptions

Under `mypy --strict` the example above fails: `factory.Factory` takes no type argument through the `factory` package, and the declarations are untyped calls. Import `Factory` from `factory.base` and subclass `Factory[User]`, import `Faker` from `factory.faker` and `Trait` from `factory.declarations`, and silence the remaining `no-untyped-call` on each declaration with a reason: `# type: ignore[no-untyped-call]  # factory_boy declarations are untyped`.

---
title: Make a service depend on a repository Protocol and test its rules with a fake
summary: A typing.Protocol in the domain, a SQLAlchemy adapter, and a dict-backed fake for rule tests.
impact: medium
applies: [python]
implements: architecture/principles/add-structure-to-one-module-when-it-hurts
sources: [https://www.cosmicpython.com/book/chapter_02_repository.html, https://typing.python.org/en/latest/spec/protocol.html]
---

## Rule

For a module whose rules need a test without the database, declare the repository as a `typing.Protocol` in the domain, implement it in an adapter on SQLAlchemy, and test the service against an in-memory fake.

## Why

A service that takes a SQLAlchemy `Session` needs a database for every rule test, so tests are slow and the rules end up untested.

## Incorrect

```python
def confirm_order(order_id: UUID, session: Session) -> None:
    order = session.get(Order, order_id)
```

## Correct

```python
class OrderRepository(Protocol):
    def get(self, order_id: UUID) -> Order | None: ...
    def add(self, order: Order) -> None: ...


class FakeOrderRepository:
    def __init__(self, orders: list[Order]) -> None:
        self._orders = {o.id: o for o in orders}

    def get(self, order_id: UUID) -> Order | None:
        return self._orders.get(order_id)

    def add(self, order: Order) -> None:
        self._orders[order.id] = order
```

## Exceptions

Add this only to a module that has the pain (see the principle); a CRUD module keeps the session. The fake covers rule tests only: test the SQL adapter against the real engine, and annotate the fake as `OrderRepository` in fixtures so the type checker keeps it in step. At HTTP level the fake enters through `app.dependency_overrides`; service tests build the service with it directly.

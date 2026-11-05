---
title: Put a business rule in a method of the domain object
summary: order.confirm() checks the invariant; the service loads the object, calls it and saves.
impact: medium
applies: [python]
implements: architecture/principles/put-the-rule-in-the-domain
sources: [https://www.cosmicpython.com/book/chapter_01_domain_model.html, https://martinfowler.com/bliki/AnemicDomainModel.html]
---

## Rule

When a module has invariants, put each in a method of the domain object (`order.confirm()`) that raises a domain exception (a plain `Exception` subclass with no HTTP status). The object imports neither FastAPI nor the ORM; the service loads it, calls the method and saves.

## Why

Rules kept in services leave the models as bags of fields, so the same check is rewritten in each use case.

## Incorrect

```python
def confirm_order(order_id: UUID, orders: OrderRepository) -> None:
    order = orders.get(order_id)
    if order is None:
        raise OrderNotFound(order_id)
    if not order.lines:
        raise EmptyOrder()
    order.status = "confirmed"
    orders.add(order)
```

## Correct

```python
class EmptyOrder(Exception): ...


@dataclass
class Order:
    id: UUID
    lines: list[Line]
    status: str = "new"

    def confirm(self) -> None:
        if not self.lines:
            raise EmptyOrder()
        self.status = "confirmed"


def confirm_order(order_id: UUID, orders: OrderRepository) -> None:
    order = orders.get(order_id)
    if order is None:
        raise OrderNotFound(order_id)
    order.confirm()
    orders.add(order)
```

## Exceptions

A module that only stores and returns rows has no invariants; keep a plain model there.

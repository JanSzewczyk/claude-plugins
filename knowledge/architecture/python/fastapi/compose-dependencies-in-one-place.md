---
title: Build adapters in dependency functions and inject them with Depends
summary: A domain's dependencies.py creates its repositories and services; the rest receives them as arguments.
impact: medium
applies: [python, fastapi]
implements: architecture/principles/point-imports-toward-the-domain
sources: [https://fastapi.tiangolo.com/tutorial/dependencies/, https://fastapi.tiangolo.com/tutorial/bigger-applications/]
---

## Rule

Create a domain's concrete repositories and services in functions in that domain's `dependencies.py` and receive them with `Depends`. Tests replace those functions through `app.dependency_overrides`. Service and domain code take their collaborators as arguments and never construct an adapter.

## Why

An adapter built inside a service hides the dependency, so a test has to patch module internals and swapping the database edits business code.

## Incorrect

```python
class OrderService:
    def __init__(self) -> None:
        self.orders = SqlOrderRepository(SessionLocal())
```

## Correct

```python
class OrderService:
    def __init__(self, orders: OrderRepository) -> None:
        self.orders = orders


def get_order_service(session: Session = Depends(get_session)) -> OrderService:
    return OrderService(SqlOrderRepository(session))
```

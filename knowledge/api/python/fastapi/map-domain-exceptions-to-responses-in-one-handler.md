---
title: Map a domain's exceptions to error responses in one registered handler
summary: One exception handler per domain turns its exceptions into Problem Details; routes do not repeat the mapping.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/handling-errors/]
---

## Rule

Give a domain one base exception, map its subclasses to statuses in one table, and register one handler for the base class from a `register(app)` function that `main.py` calls. Routes call the service and do not catch these exceptions.

## Why

When each route catches the exceptions itself, the same mapping is copied into every route and two routes drift apart, one answering 409 and the other 400 for the same error.

## Incorrect

```python
@router.post("/orders/{order_id}/confirm")
def confirm(order_id: UUID, service: OrderService = Depends(get_order_service)):
    try:
        service.confirm(order_id)
    except OrderNotFound:
        return problem(404, "Order not found")
    except EmptyOrder:
        return problem(409, "Order has no lines")
```

## Correct

```python
# orders/exceptions.py
class OrderError(Exception): ...
class OrderNotFound(OrderError): ...
class EmptyOrder(OrderError): ...

STATUS = {OrderNotFound: 404, EmptyOrder: 409}

def register(app: FastAPI) -> None:
    @app.exception_handler(OrderError)
    async def order_problem(request: Request, exc: OrderError) -> JSONResponse:
        status = next(s for t, s in STATUS.items() if isinstance(exc, t))
        return problem(status, str(exc))   # problem(): see the Problem Details note

# orders/router.py: the route only calls the service
def confirm(order_id: UUID, service: OrderService = Depends(get_order_service)):
    service.confirm(order_id)
```

## Exceptions

A route that must answer one exception differently from the rest of its domain may catch it and return its own response. List every mapped status in the route's `responses`.

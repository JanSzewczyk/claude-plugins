---
title: Map a domain's exceptions to error responses in one registered handler
summary: One exception handler per domain turns its exceptions into Problem Details; routes do not repeat the mapping.
impact: medium
applies: [python, fastapi]
sources: [https://fastapi.tiangolo.com/tutorial/handling-errors/]
---

## Rule

Give a domain one base exception, map its subclasses to a status, a type slug and a title in one table, and register one handler for the base class from a `register(app)` function that `main.py` calls. Routes call the service and do not catch these exceptions. The handler sends `str(exc)` as `detail`, so word each message for the client: no identifiers of other tenants, SQL or paths (unhandled errors: see the generic 500 note). The handler logs the refusal at warning level without a traceback (see `logging/python/record-exceptions-with-logger-exception`).

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

ERRORS = {   # exception -> (status, type slug, title): see the problem-type note
    OrderNotFound: (404, "order-not-found", "Order not found"),
    EmptyOrder: (409, "empty-order", "Order has no lines"),
}

def register(app: FastAPI) -> None:
    @app.exception_handler(OrderError)
    async def order_problem(request: Request, exc: OrderError) -> JSONResponse:
        status, slug, title = next(v for t, v in ERRORS.items() if isinstance(exc, t))
        return problem(status, str(exc), type=f"urn:problem:orders:{slug}", title=title)

# orders/router.py: the route only calls the service
def confirm(order_id: UUID, service: OrderService = Depends(get_order_service)):
    service.confirm(order_id)
```

## Exceptions

A route that must answer one exception differently from the rest of its domain may catch it and return its own response. List every mapped status in the route's `responses`.

---
title: Keep a FastAPI route to parsing, one service call and error mapping
summary: The route calls one service function and maps its exceptions to status codes; no rules or queries.
impact: high
applies: [python, fastapi]
implements: architecture/principles/keep-handlers-thin
sources: [https://www.cosmicpython.com/book/chapter_04_service_layer.html]
---

## Rule

Write a route so that it receives validated input, calls one service method and turns the service's exceptions into HTTP responses. A loop, an `if` about a business rule or a second database call in a route belongs in the service.

## Why

A rule that lives in a route is copied into the next route and can only be tested through HTTP.

## Incorrect

```python
@router.post("/orders/{order_id}/confirm", status_code=204)
def confirm(order_id: UUID, session: Session = Depends(get_session)):
    order = session.get(OrderRow, order_id)
    if not order.lines:
        raise HTTPException(status_code=409)
    order.status = "confirmed"
    session.commit()
```

## Correct

```python
@router.post(
    "/orders/{order_id}/confirm",
    status_code=204,
    responses={404: {"model": ProblemDetail}, 409: {"model": ProblemDetail}},
)
def confirm(order_id: UUID, service: OrderService = Depends(get_order_service)):
    try:
        service.confirm(order_id)
    except OrderNotFound:
        raise HTTPException(status_code=404, detail="Order not found")
    except EmptyOrder:
        raise HTTPException(status_code=409, detail="Order has no lines")
```

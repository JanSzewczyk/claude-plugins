---
title: Keep a FastAPI route to parsing, one service call and error mapping
summary: The route calls one service function and maps its exceptions to status codes; no rules or queries.
impact: high
applies: [python, fastapi]
implements: architecture/principles/keep-handlers-thin
sources: [https://www.cosmicpython.com/book/chapter_04_service_layer.html]
---

## Rule

Write a route so that it receives validated input, calls one service method and leaves the service's exceptions to the domain's registered exception handler, which turns them into HTTP responses. A loop, an `if` about a business rule or a second database call in a route belongs in the service.

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
    responses={404: PROBLEM, 409: PROBLEM},   # PROBLEM: see the Problem Details note
)
def confirm(order_id: UUID, service: OrderService = Depends(get_order_service)):
    service.confirm(order_id)   # OrderNotFound and EmptyOrder are mapped by the domain's handler
```

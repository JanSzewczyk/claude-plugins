---
title: Hold another domain's id in a field instead of importing its model
summary: orders stores customer_id; it asks the users service for the customer when it needs one.
impact: medium
applies: [python]
implements: architecture/principles/refer-to-other-modules-by-id
sources: [https://www.cosmicpython.com/book/chapter_07_aggregate.html]
---

## Rule

Give a model that refers to another domain a `UUID` (or the id type) field, such as `customer_id`, not a field typed with the other domain's model class. Call the other domain's service when the data is needed and take back its schema or a small local type, never its database model. Importing another domain's service, constants or exceptions is fine.

## Why

Importing `users.models.User` into `orders` couples the two packages, so a change to the user table edits the order code and the two modules can no longer be split.

## Incorrect

```python
from src.users.models import User

class Order:
    customer: User
```

## Correct

```python
class Order:
    customer_id: UUID
```

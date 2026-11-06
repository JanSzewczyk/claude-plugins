---
title: Copy the values a response needs out of the session before you roll back
summary: After rollback() every loaded instance is expired, so the next attribute read starts a new transaction.
impact: medium
applies: [python, sqlalchemy]
sources: [https://docs.sqlalchemy.org/en/20/orm/session_basics.html#session-expire-on-commit, https://www.sqlite.org/lang_transaction.html, https://docs.sqlalchemy.org/en/20/orm/session_state_management.html#refreshing-expiring]
---

## Rule

When a read-only service call ends with `session.rollback()` to release a lock taken up front (SQLite `BEGIN IMMEDIATE`, see `concurrency/python/guard-a-check-then-write-with-one-conditional-update`), copy the values the caller needs into a plain object (a frozen dataclass) before the rollback and return that. Do not return the ORM instance.

## Why

After `rollback()` every loaded instance is expired, so the router's next attribute read opens a new transaction, and on SQLite with `BEGIN IMMEDIATE` that takes the write lock again until the session closes.

## Incorrect

```python
def get(self, code: str) -> Coupon:
    coupon = self.session.get(Coupon, code)
    self.session.rollback()          # releases the lock...
    return coupon                    # ...and coupon.max_uses reopens it: BEGIN IMMEDIATE, SELECT
```

## Correct

```python
@dataclass(frozen=True)
class CouponState:
    max_uses: int
    used: int

def get(self, code: str) -> CouponState:
    coupon = self.session.get(Coupon, code)   # raise the not-found error here if it is None
    state = CouponState(coupon.max_uses, coupon.used)
    self.session.rollback()
    return state
```

## Exceptions

A session that closes right after the call needs neither, and a setup whose transactions take no lock up front (no `BEGIN IMMEDIATE`, no `SELECT ... FOR UPDATE`) only pays one extra read.

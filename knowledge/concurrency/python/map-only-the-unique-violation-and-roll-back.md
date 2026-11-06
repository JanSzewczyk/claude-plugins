---
title: Map only the UNIQUE violation to the domain error, roll back first and re-raise the rest
summary: Catch IntegrityError, roll back, raise the domain error for the unique constraint only; re-raise the rest.
impact: high
applies: [python, sqlalchemy]
sources: [https://docs.sqlalchemy.org/en/20/orm/session_basics.html, https://www.sqlite.org/rescode.html, https://docs.python.org/3/library/sqlite3.html#sqlite3.Error.sqlite_errorcode]
---

## Rule

When a `UNIQUE` constraint guards a rule ("one seat per user"), catch the `IntegrityError`, call `session.rollback()`, and raise the domain error only when the violation is that constraint (PostgreSQL: `err.orig.diag.constraint_name`; SQLite: `err.orig.sqlite_errorcode` in `(sqlite3.SQLITE_CONSTRAINT_UNIQUE, sqlite3.SQLITE_CONSTRAINT_PRIMARYKEY)`, because a primary key reports its own code). Re-raise every other `IntegrityError`. Prove the rollback with a test that reuses the same session after the error and expects the next call to succeed.

## Why

A `CHECK` or foreign-key failure reported as "already exists" hides a bug as a 409, a duplicate on a composite primary key that is not recognised as one turns into a 500, and a session left without `rollback()` after a failed flush raises `PendingRollbackError` on its next use.

## Incorrect

```python
try:
    session.add(Reservation(event_id=event_id, user_id=user_id))
    session.commit()
except IntegrityError:               # a CHECK failure ends up as "already reserved"
    raise AlreadyReserved(user_id)   # and the session is still in the failed state
```

## Correct

```python
try:                                   # Reservation has the primary key (event_id, user_id)
    session.add(Reservation(event_id=event_id, user_id=user_id))
    session.commit()
except IntegrityError as err:
    session.rollback()
    duplicate = (sqlite3.SQLITE_CONSTRAINT_UNIQUE, sqlite3.SQLITE_CONSTRAINT_PRIMARYKEY)
    if err.orig.sqlite_errorcode not in duplicate:   # PostgreSQL: diag.constraint_name
        raise
    raise AlreadyReserved(user_id) from err
```

## Exceptions

A request-scoped session that is closed right after the error needs no explicit `rollback()`; keep it where a session is reused, as in a service that handles several commands on one session.

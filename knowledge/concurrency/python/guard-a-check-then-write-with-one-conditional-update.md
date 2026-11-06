---
title: Guard a check-then-write rule with one conditional UPDATE
summary: Put the rule in the UPDATE's WHERE clause and raise when no row changed; never read, check, then write.
impact: high
applies: [python, sqlalchemy]
sources: [https://docs.sqlalchemy.org/en/20/core/connections.html#sqlalchemy.engine.CursorResult.rowcount, https://www.sqlite.org/lang_transaction.html, https://docs.sqlalchemy.org/en/20/dialects/sqlite.html#serializable-isolation-savepoints-transactional-ddl]
---

## Rule

When a rule reads before it writes (the last free copy), make the repository run one `UPDATE ... WHERE <rule>` and raise when it changed no row. The domain method keeps the readable rule; the UPDATE is what makes it hold under concurrent requests. Back a counter with a `CHECK` that states the rule (`CHECK (used <= max_uses)`), so a write that bypasses the UPDATE fails loudly.

## Why

Two requests both read "1 copy free", both pass the check and both lend it, and a test that sends one request at a time never shows it.

## Incorrect

```python
book = session.get(Book, book_id)
if book.available_copies < 1:
    raise NoFreeCopy(book_id)
book.available_copies -= 1          # a second request read the same value
```

## Correct

```python
result = cast("CursorResult[Any]", session.execute(   # the cast satisfies strict mypy: Result has no rowcount
    update(Book)
    .where(Book.id == book_id, Book.available_copies > 0)
    .values(available_copies=Book.available_copies - 1)
))
if result.rowcount == 0:
    raise NoFreeCopy(book_id)
```

## Exceptions

A rule that counts rows (a per-member limit) cannot be one UPDATE: take the write lock before the read. On PostgreSQL lock the parent row with `SELECT ... FOR UPDATE`. On SQLite start the transaction with `BEGIN IMMEDIATE` through the SQLAlchemy `connect` and `begin` hooks, on an engine used for writes, because it serialises every transaction on that engine, and a second writer waits for the driver's `timeout` or fails with `SQLITE_BUSY`:

```python
@event.listens_for(engine, "connect")
def _manual_transactions(dbapi_connection, _record):
    dbapi_connection.isolation_level = None

@event.listens_for(engine, "begin")
def _begin_immediate(conn):
    conn.exec_driver_sql("BEGIN IMMEDIATE")
```

A process that never serves concurrent requests needs neither. A `UNIQUE` or `PRIMARY KEY` constraint already guards a plain uniqueness rule (once per customer); catch its error instead, as in `concurrency/python/map-only-the-unique-violation-and-roll-back`.

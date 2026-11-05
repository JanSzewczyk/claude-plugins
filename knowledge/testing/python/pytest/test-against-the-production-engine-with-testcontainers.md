---
title: Run integration tests against the production database engine with testcontainers
summary: A SQLite stand-in accepts SQL and types the real engine rejects; a throwaway container does not.
impact: medium
applies: [python, pytest, testcontainers]
sources: [https://testcontainers-python.readthedocs.io, https://docs.pytest.org/en/stable/how-to/mark.html]
---

## Rule

Start the same relational engine production uses in a session-scoped `testcontainers` fixture, give each test its own connection that is rolled back afterwards, and mark such tests `integration`.

## Why

SQLite accepts statements and types that Postgres rejects, so the suite is green and the first production query fails; the rollback keeps the shared container from leaking data between tests.

## Incorrect

```python
engine = create_engine("sqlite://")   # production runs Postgres
```

## Correct

```python
@pytest.fixture(scope="session")
def engine():
    with PostgresContainer("postgres:17") as pg:
        yield create_engine(pg.get_connection_url())

@pytest.fixture
def conn(engine):
    with engine.connect() as connection, connection.begin() as tx:
        yield connection
        tx.rollback()

@pytest.mark.integration
def test_saves_user(conn): ...
```

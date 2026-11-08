---
title: Run one contract suite against the database adapter and the in-memory fake
summary: One suite and a repo fixture per adapter, so the in-memory fake and the SQL adapter pass the same tests.
impact: medium
applies: [python, pytest]
implements: testing/principles/replace-an-unrunnable-dependency-with-a-contract-tested-fake
sources: [https://docs.pytest.org/en/stable/explanation/goodpractices.html#conventions-for-python-test-discovery, https://abseil.io/resources/swe-book/html/ch13.html]
---

## Rule

Put the behaviour every adapter of a port must have in a class whose name does not start with
`Test`, with a `repo` fixture that raises `NotImplementedError`. Give each adapter a `Test...`
subclass that overrides `repo`: the in-memory fake in the normal run, and the database adapter
against the production engine, marked `integration`.

## Why

Tests written separately for the fake and for the adapter drift apart, so the fake keeps accepting
what the database rejects (a duplicate key, a missing row) and the service tests built on it pass.

## Incorrect

```python
def test_fake_returns_none_for_unknown_id() -> None:
    assert InMemoryBookRepository().get(UUID(int=7)) is None
# the SQL adapter has its own, different tests
```

## Correct

```python
class BookRepositoryContract:
    @pytest.fixture
    def repo(self) -> BookRepository:
        raise NotImplementedError

    def test_unknown_id_returns_none(self, repo: BookRepository) -> None:
        assert repo.get(UUID(int=7)) is None

class TestInMemoryBookRepository(BookRepositoryContract):
    @pytest.fixture
    def repo(self) -> BookRepository:
        return InMemoryBookRepository()

@pytest.mark.integration
class TestSqlBookRepository(BookRepositoryContract):
    @pytest.fixture
    def repo(self, conn: Connection) -> BookRepository:
        return SqlBookRepository(conn)
```

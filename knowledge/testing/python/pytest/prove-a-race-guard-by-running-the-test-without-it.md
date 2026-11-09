---
title: Prove a race-guard test by removing the guard once and watching it fail
summary: A parallel test that also passes without the guard proves nothing; disable the guard once to see it go red.
impact: high
applies: [python, pytest]
implements: testing/principles/every-test-must-be-able-to-fail
sources: [https://docs.python.org/3/library/threading.html#barrier-objects, https://docs.python.org/3/library/concurrent.futures.html#threadpoolexecutor]
---

## Rule

After writing a test for a race guard, remove the guard once and confirm the test fails. One mutant per guard is the proof; a second is for the constraint case under Exceptions. Write the test with the competing calls released together and assert on the final state, as in the example, not on timing.

## Why

A race test that also passes without the guard proves nothing: on SQLite a last-copy test stayed green against a mutant that kept `BEGIN IMMEDIATE` and wrote an absolute value, so it guarded nothing.

## Incorrect

```python
def test_last_copy():
    assert client.post("/loans", json=body).status_code == 201
    assert client.post("/loans", json=body).status_code == 409   # sequential: never races
```

## Correct

```python
def test_only_one_of_eight_gets_the_last_copy(client, book_with_one_copy):
    barrier = threading.Barrier(8, timeout=5)      # a timeout fails a stuck run fast

    def lend(_: int) -> int:
        barrier.wait()
        return client.post("/loans", json={"book_id": book_with_one_copy.id}).status_code

    with ThreadPoolExecutor(8) as pool:            # pool size >= Barrier parties
        statuses = list(pool.map(lend, range(8)))

    assert sorted(statuses) == [201] + [409] * 7   # then remove the guard: this must fail
```

## Exceptions

A guard that a database constraint already enforces and maps to its own error (`UNIQUE` to 409) needs one sequential test of the error mapping.

Pick a mutant the backend lets fail. A `CHECK` that backs the guard makes removing the `WHERE` clause go red on an error (a 500), not on interleaving. On SQLite, `BEGIN IMMEDIATE` serialises every writer, so a read-check-write mutant that keeps it still passes; the mutant that shows red is a plain `BEGIN`, with `database is locked` 500s. Do not claim the conditional `UPDATE` itself is proven there.

Confirm the mutant was the code that ran: run it from a copy and print the package's `__file__` first, because an editable install imports the original and the test stays green.

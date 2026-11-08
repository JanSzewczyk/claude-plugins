---
title: Test each module through the interface its callers use, never through private helpers
summary: Routes through the test client, services and domain objects through public methods; a _helper is tested via its caller.
impact: high
applies: [python, pytest]
implements: testing/strategy/principles/test-only-what-the-two-users-touch
sources: [https://abseil.io/resources/swe-book/html/ch12.html, https://testdesiderata.com/]
---

## Rule

Test a route through the HTTP test client, a service through its public methods with fakes for its
ports, a domain object through its public methods, and an adapter through its port's contract suite.
Never import a name that starts with `_` into a test or assert on an object's private attributes;
cover that code through the public call that uses it.

## Why

A test of `_compute_fine` or of `loan._state` breaks when the code is reorganised without a change
in behaviour, and still passes while the public call that uses it is broken.

## Incorrect

```python
from myapp.loans.service import _compute_fine

def test_compute_fine() -> None:
    assert _compute_fine(days_late=3) == Decimal("1.50")
```

## Correct

```python
def test_returning_a_book_three_days_late_charges_a_fine(service: LoanService) -> None:
    loan = service.borrow(BOOK_ID, MEMBER_ID, today=date(2026, 1, 1))

    returned = service.return_book(loan.id, today=loan.due + timedelta(days=3))

    assert returned.fine == Decimal("1.50")
```

## Exceptions

A helper complex enough to need its own edge cases (a parser, a pricing formula) becomes a public
function of its own module and gets its own tests.

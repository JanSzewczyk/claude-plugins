---
title: Mirror the package in tests/ by domain module, never by test kind
summary: tests/orders/ holds every kind of orders test; a marker, not a unit/ or integration/ folder, says the kind.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/mark.html, https://github.com/zhanymkanov/fastapi-best-practices, https://github.com/Netflix/dispatch/tree/master/tests]
---

## Rule

Give each domain module one directory under `tests/` with the module's name, and put all of its
tests there in topic files (`test_domain.py`, `test_service.py`, `test_api.py`). Mark a test's kind
with a registered marker such as `integration`, never with a `unit/`, `integration/` or `e2e/`
folder.

## Why

Folders by kind spread one module's tests over three trees, so moving or deleting the module leaves
orphaned tests behind and a reader cannot see in one place what the module's tests cover.

## Incorrect

```text
tests/
├── unit/orders/test_service.py
├── integration/orders/test_repository.py
└── e2e/test_orders_api.py
```

## Correct

```text
tests/
└── orders/
    ├── test_service.py
    ├── test_repository.py   # SQL subclass marked integration
    └── test_api.py
```

## Exceptions

A suite that needs a run of its own (a deployed environment, a schedule) gets its own top-level
directory, as `testing/python/guides/test-suite-layout` describes.

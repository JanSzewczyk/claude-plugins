---
title: Organize a FastAPI project as one package per domain
summary: src/<domain>/ holds router.py, schemas.py, models.py and service.py; main.py only includes routers.
impact: high
applies: [python, fastapi]
implements: architecture/principles/split-by-domain-before-by-layer
sources: [https://fastapi.tiangolo.com/tutorial/bigger-applications/, https://github.com/zhanymkanov/fastapi-best-practices]
---

## Rule

Create one package per domain under `src/`, each with `router.py`, `schemas.py` (Pydantic), `models.py` (database) and `service.py`; add `dependencies.py` and `exceptions.py` when needed. A trivial domain may start with fewer files. `main.py` creates the app and includes the routers.

## Why

With top-level `routers/`, `schemas/` and `models/`, adding a field to an order edits three folders, and nothing marks which files belong together.

## Incorrect

```text
src/
├── routers/    orders.py  users.py
├── schemas/    orders.py  users.py
├── models/     orders.py  users.py
└── main.py
```

## Correct

```text
src/
├── orders/     router.py  schemas.py  models.py  service.py
├── users/      router.py  schemas.py  models.py  service.py
└── main.py
```

## Exceptions

The official FastAPI tutorial keeps a flat `routers/` package for a small app; that is a starting point, not the target for an API that grows.

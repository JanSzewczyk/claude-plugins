---
title: Structure a Python API as domain modules and add layers only where they pay
summary: Modular monolith by default; hexagonal in one module on pain; aggregates, events and CQRS only on a real problem.
impact: high
applies: [python, fastapi]
decides: [architecture/principles/split-by-domain-before-by-layer, architecture/principles/point-imports-toward-the-domain, architecture/principles/keep-handlers-thin, architecture/principles/put-the-rule-in-the-domain, architecture/principles/add-structure-to-one-module-when-it-hurts, architecture/principles/refer-to-other-modules-by-id, architecture/python/fastapi/organize-packages-by-domain, architecture/python/fastapi/keep-routers-thin-and-call-a-service, architecture/python/fastapi/compose-dependencies-in-one-place, architecture/python/put-business-rules-in-domain-objects, architecture/python/define-a-port-as-a-protocol-and-fake-it-in-tests, architecture/python/hold-another-domains-id-not-its-model]
sources: [https://fastapi.tiangolo.com/tutorial/bigger-applications/, https://github.com/zhanymkanov/fastapi-best-practices, https://www.cosmicpython.com/book/preface.html, https://martinfowler.com/bliki/PresentationDomainDataLayering.html, https://martinfowler.com/bliki/MonolithFirst.html, https://alistair.cockburn.us/hexagonal-architecture/]
---

## Decision

Build the API as a modular monolith (layout B): one package per domain, each with a router, schemas, models and a thin service, split by domain at the top and by layer inside. Add a port, a fake repository and a richer domain model to a single module only when a concrete pain shows (level 3). Take the cheap strategic part of DDD from day one, meaning module boundaries and the business vocabulary in names. Take aggregates, domain events and CQRS (level 4) only for a real problem, never in advance. Choose by how complex the business rules are, not by the framework.

## Options

| Level | Idea | Fits when | Cost |
| --- | --- | --- | --- |
| 1. Flat, split by file type | `routers/`, `schemas/`, `models/` side by side | a few endpoints, a prototype, a small microservice | one feature lives in three folders; it tangles quickly |
| 2. Domain modules, layers inside | each module has its own router, service, schemas and models | a typical API with a database that grows into a monolith | logic still knows the ORM, so rule tests often need a database |
| 3. Hexagonal (ports and adapters) | the domain imports no framework or ORM; repository and service sit at the edges | business rules are complex and should be tested without a database | more files and abstractions to maintain |
| 4. Full DDD | aggregates, value objects, domain events, bounded contexts | a complex, changing domain with access to business experts | highest cost; requires knowing the domain |

Levels 3 and 4 pay only when the business logic is really complex. A layer added to a CRUD module is maintenance cost without a return.

Which DDD parts are cheap:

| Part | Cost | Take it when |
| --- | --- | --- |
| Shared vocabulary and bounded contexts | low: package split and conversation | almost always, once the API has several areas |
| Value objects | low: a `dataclass(frozen=True)` | the same validation repeats in many places |
| Entities with rules | medium | there are real invariants to guard |
| Aggregates | medium to high | rules span several objects and must change in one transaction |
| Repository and Unit of Work | medium | rules must be tested without a database, or the domain is complex |
| Domain events, message bus, CQRS | high | one action must trigger effects elsewhere; not in advance |

## Layouts

### Layout A: small API (as in the FastAPI tutorial)

```text
my-api/
├── app/
│   ├── main.py            # creates FastAPI(), includes routers
│   ├── dependencies.py
│   ├── routers/           # users.py, items.py
│   └── internal/
├── tests/
└── pyproject.toml
```

### Layout B: domain modules (the default)

```text
src/
├── auth/
│   ├── router.py          # endpoints
│   ├── schemas.py         # Pydantic
│   ├── models.py          # database
│   ├── service.py         # business logic of the module
│   ├── dependencies.py    # request checks that need the database
│   ├── constants.py
│   └── exceptions.py
├── posts/                 # same set of files
├── config.py              # global settings
├── database.py
└── main.py
tests/                      # mirrors src/
alembic/
```

Import another domain's module under an alias to avoid name collisions: `from src.auth import constants as auth_constants`.

### Layout C: modules with hexagonal inside (one module at a time)

```text
src/myapp/
├── orders/                # module = context boundary
│   ├── domain/            # model.py, events.py (optional), ports.py (Protocol)
│   ├── service_layer/     # services.py, unit_of_work.py
│   ├── adapters/          # orm.py, repository.py (SQLAlchemy)
│   └── entrypoints/       # router.py, schemas.py
├── billing/               # another module, same shape
├── shared/                # only what is truly shared: configuration, db session
└── main.py                # composition root: wires adapters to ports
tests/
├── unit/                  # domain and services on fake repositories
├── integration/           # repositories on a real database
└── e2e/                   # through HTTP
```

C is a synthesis of Fowler's advice (domain modules on top, layers inside) and the Cosmic Python names `entrypoints` and `service_layer`; it is not a standard. `main.py` is the only place where a concrete adapter meets a port.

## Evolution

Start at B. Move one module at a time, never the whole application, when you see these signals:

- The same business rule is copied into several endpoints: extract it to a service, and if it matters, to a domain object.
- A test of a simple rule needs a database: add a port and a fake repository in that module (level 3).
- The business expert uses terms that do not exist in the code: introduce a shared vocabulary and separate contexts.
- One action must trigger effects in another module: only now consider domain events.

Signs of over-engineering: endpoints are mostly create, read, update and delete of table rows; the domain model has the same fields as the ORM model and no methods; the team does not know the patterns and the deadline is close; it is a prototype.

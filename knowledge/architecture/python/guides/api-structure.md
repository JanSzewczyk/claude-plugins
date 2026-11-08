---
title: Structure a Python API as domain modules, with hexagonal layers only where they pay
summary: Domain modules by default; hexagonal layers inside one module when its rules need testing without a database.
impact: high
applies: [python, fastapi]
decides: [architecture/principles/split-by-domain-before-by-layer, architecture/principles/point-imports-toward-the-domain, architecture/principles/keep-handlers-thin, architecture/principles/put-the-rule-in-the-domain, architecture/principles/add-structure-to-one-module-when-it-hurts, architecture/principles/refer-to-other-modules-by-id, architecture/python/fastapi/organize-packages-by-domain, architecture/python/fastapi/keep-routers-thin-and-call-a-service, architecture/python/fastapi/compose-dependencies-in-one-place, architecture/python/put-business-rules-in-domain-objects, architecture/python/define-a-port-as-a-protocol-and-fake-it-in-tests, architecture/python/hold-another-domains-id-not-its-model]
sources: [https://github.com/zhanymkanov/fastapi-best-practices, https://www.cosmicpython.com/book/preface.html, https://martinfowler.com/bliki/PresentationDomainDataLayering.html, https://alistair.cockburn.us/hexagonal-architecture/]
---

## Decision

Build the API as domain modules: one package per business area, each with a router, schemas, models and a thin service. When one module's rules grow complex enough that testing them needs a database, give that module hexagonal layers: a domain model, ports and adapters. Do it per module, never for the whole application.

## Options

| Layout | Fits when | Cost |
| --- | --- | --- |
| Domain modules | a typical API with a database | logic still knows the ORM, so rule tests often need a database |
| Hexagonal modules | a module has complex rules to test without a database | more files and abstractions to maintain |

## Layouts

### Domain modules (the default)

```text
src/
├── auth/
│   ├── router.py          # endpoints
│   ├── schemas.py         # Pydantic
│   ├── models.py          # database
│   ├── service.py         # business logic of the module
│   ├── dependencies.py    # request checks that need the database
│   └── exceptions.py
├── posts/                 # same set of files
├── config.py
├── database.py
└── main.py                # creates the app, includes the routers
tests/                      # mirrors src/
```

### Hexagonal modules (one module at a time)

```text
src/myapp/
├── orders/
│   ├── domain/            # model.py, ports.py (Protocol)
│   ├── service_layer/     # services.py
│   ├── adapters/          # orm.py, repository.py (SQLAlchemy)
│   └── entrypoints/       # router.py, schemas.py
├── billing/               # another module, same shape or plain
└── main.py                # wires adapters to ports
tests/
└── orders/                # mirrors the module; kind is a marker, not a folder
    ├── test_domain.py     # rules on plain objects
    ├── test_service.py    # services on fake repositories
    └── test_repository.py # one contract suite; the SQL run marked integration
```

## Evolution

Start with domain modules. Move a module to hexagonal when:

- the same business rule is copied into several endpoints,
- a test of a simple rule needs a database,
- the business experts use terms that do not exist in the code.

Stay put when the endpoints are mostly create, read, update and delete of table rows.

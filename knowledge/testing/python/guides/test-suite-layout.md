---
title: Lay out Python tests by domain, with the kind as a marker
summary: tests/ mirrors the package, markers name the kind, a second directory only for a suite with its own run.
impact: high
applies: [python, pytest]
decides: [testing/python/pytest/mirror-the-package-in-tests-by-domain, testing/python/pytest/add-tests-to-the-existing-suite-by-topic, tooling/python/register-every-test-directory-in-the-check-gate, testing/python/pytest/register-markers-and-reject-unknown-ones, testing/python/pytest/test-against-the-production-engine-with-testcontainers, testing/python/pytest/run-one-contract-suite-against-the-adapter-and-the-fake, testing/python/pytest/test-each-module-through-its-public-interface]
sources: [https://github.com/cosmicpython/code/tree/chapter_06_uow/tests, https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend/tests, https://abseil.io/resources/swe-book/html/ch11.html]
---

## Decision

Mirror the package in `tests/`: one directory per domain module, one file per topic (`test_api.py`,
`test_service.py`, `test_domain.py`, `test_concurrency.py`). Say what kind a test is with a
registered marker (`integration` for a real database, `concurrency` for race tests), not with a
folder, so a module's tests stay together and are moved or deleted with it. Open a second top-level
directory only for a suite that needs a run of its own: infrastructure the normal run cannot start
(a deployed environment, a cloud account) or a schedule, with its own make target and CI job.

## Options

| Layout | Fits when | Cost |
| --- | --- | --- |
| By domain, kind as a marker (default) | one service whose tests run in one process, with fakes or a database container | needs registered markers; `-m` picks the kinds |
| By kind: `tests/unit`, `tests/integration`, `tests/e2e` | the e2e suite calls a running server and a real database and runs on its own | one module's tests spread over three trees; moving or removing it touches all of them |
| By code layer: `tests/api`, `tests/crud` | a small CRUD app with one file per layer | stops scaling once there are domains; each layer folder mixes all of them |

## Layouts

```text
src/myapp/
├── orders/                  # hexagonal: domain/, service_layer/, adapters/, entrypoints/
├── billing/                 # default shape: router, schemas, service
└── main.py
tests/
├── conftest.py              # settings, app, client
├── orders/
│   ├── conftest.py          # fakes and dependency overrides for this module
│   ├── test_domain.py       # rules on plain objects, no I/O
│   ├── test_service.py      # services on fakes
│   ├── test_api.py          # routes through the test client
│   ├── test_concurrency.py  # marked concurrency
│   └── test_repository.py   # contract suite; the SQL subclass marked integration
└── billing/
    └── test_api.py
tests_e2e/                   # only for a suite against a deployed service, own target and CI job
```

## Evolution

- Start with one directory per module and only the topic files it needs.
- When tests need a database container, mark them `integration` and run `-m "not integration"` in
  the fast loop; do not move them.
- When a suite needs a deployed service or a schedule (a smoke test against staging, a load test, a
  nightly fuzz run), give it its own top-level directory, make target and CI job.
- A second directory that runs in the normal check is registered in the check gate like `tests/`;
  only a suite deliberately kept out of it (load, nightly) skips that.
- When a module is removed, its test directory goes with it and nothing else breaks.

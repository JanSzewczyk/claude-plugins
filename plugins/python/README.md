# python

Python development — the language layer for Python projects. It carries two agents (a developer that writes Python with its tests, and an architect that decides how an API is structured), a skill that guides the architecture decision, and generated background knowledge: team conventions for Python code, pytest tests and FastAPI web APIs, and rules for `factory_boy` test data factories.

## Contents

### Agents

| Agent                    | Description                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **python-developer**     | Writes and fixes Python code and its pytest tests under the team rules (`python-rules`, `fastapi-rules`, `pytest-rules`, `builder-rules-py`), then runs Ruff, the type checker and the tests |
| **python-api-architect** | Read-only: places a Python API on the ladder from flat to domain modules, hexagonal and DDD, recommends the smallest step and returns a layout plus a hand-off for the developer |

### Skills

| Skill                | Invoke with   | Description                                                                                                                  |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **api-architecture** | `/api-architecture` | Choose and lay out a Python API (FastAPI): flat, domain modules, hexagonal or DDD, and where each piece of code goes; carries the architecture guide and its rules |
| **builder-rules-py** | — (preloaded) | Generated background knowledge: test data factory rules for Python and `factory_boy`, for Python testing agents to preload |
| **python-rules**     | — (preloaded) | Generated background knowledge: Ruff and uv setup, docstrings and library documentation, typing syntax, exceptions, logging, asyncio, supply-chain and t-string security |
| **pytest-rules**     | — (preloaded) | Generated background knowledge: strict markers, assertions, fixtures, mocking, time, testcontainers, async, Hypothesis, coverage, flaky tests |
| **fastapi-rules**    | — (preloaded) | Generated background knowledge: OpenAPI from code, response models, error format, operation ids, docs exposure, Spectral, oasdiff, Schemathesis |

`builder-rules-py`, `python-rules`, `pytest-rules` and `fastapi-rules` are generated from `knowledge/` at the repo root, and so are the rules and the guide inside `api-architecture`. Edit the notes there and run
the `knowledge-dev` build; never edit the generated files.

## Installation

```bash
/plugin install python@szum-tech
```

There is no skill yet that writes `factory_boy` factories; `/builder-factory` (in **typescript**)
covers TypeScript only. A Python counterpart belongs in this plugin.

## Troubleshooting

| Problem                                 | Solution                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A `*-rules` skill never shows up as `/` | It is background knowledge (`user-invocable: false`) — agents preload it |

## Related Plugins

- [**testing**](../testing/) — technology-agnostic testing core (Playwright)
- [**typescript**](../typescript/) — the equivalent language layer for TypeScript and JavaScript

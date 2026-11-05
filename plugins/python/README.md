# python

Python development — the language layer for Python projects. It carries generated background knowledge: team conventions for Python code, pytest tests and FastAPI web APIs, and rules for `factory_boy` test data factories. Python-specific skills and agents belong here as they are added.

## Contents

### Skills

| Skill                | Invoke with   | Description                                                                                                                  |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **builder-rules-py** | — (preloaded) | Generated background knowledge: test data factory rules for Python and `factory_boy`, for Python testing agents to preload |
| **python-rules**     | — (preloaded) | Generated background knowledge: Ruff and uv setup, docstrings and library documentation, typing syntax, exceptions, logging, asyncio, supply-chain and t-string security |
| **pytest-rules**     | — (preloaded) | Generated background knowledge: strict markers, assertions, fixtures, mocking, time, testcontainers, async, Hypothesis, coverage, flaky tests |
| **fastapi-rules**    | — (preloaded) | Generated background knowledge: OpenAPI from code, response models, error format, operation ids, docs exposure, Spectral, oasdiff, Schemathesis |

`builder-rules-py`, `python-rules`, `pytest-rules` and `fastapi-rules` are generated from `knowledge/` at the repo root. Edit the notes there and run
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

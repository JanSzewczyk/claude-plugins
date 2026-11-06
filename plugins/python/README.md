# python

Python development — the language layer for Python projects. It carries four agents (a developer that writes Python with its tests, an architect that decides how an API is structured, a tester that tests an API from its contract, and a reviewer that checks the result against the rules), a skill that guides the architecture decision, and generated background knowledge: team conventions for Python code, pytest tests and FastAPI web APIs, and rules for `factory_boy` test data factories.

## Contents

### Agents

| Agent                    | Description                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **python-developer**     | Writes and fixes Python code and its pytest tests under the team rules (`python-rules`, `python-project-rules`, `fastapi-rules`, `pytest-rules`, `builder-rules`), then runs Ruff, the type checker and the tests |
| **python-api-architect** | Read-only: places a Python API as domain modules or hexagonal modules, recommends the smallest step and returns a layout plus a hand-off for the developer |
| **python-tester**        | Writes black-box tests from the API contract: documented statuses, Schemathesis with no check excluded, parallel race tests proved by removing the guard, flakiness and branch coverage; reports defects as failing tests and fixes none |
| **python-reviewer**      | Read-only: runs the project's checks, reviews the code against the team rules, reproduces each finding and returns a verdict with a numbered findings table and a hand-off per role |

### Team flow

`/python-api-team` runs this sequence. Subagents cannot call each other, so the main session runs it
and passes each agent's hand-off to the next:

1. `python-api-architect` — layout and a checklist (cross-cutting pieces, error statuses, guards), shown as a plan for you to approve, edit or reject before anything is built.
2. `python-developer` — implements it with its own tests and ends with a hand-off.
3. `python-tester` — lists the cases from the contract first, then adds only the missing ones to the project's own tests and reports defects as failing tests.
4. `python-developer` — fixes the defects.
5. `python-reviewer` — runs the checks, reviews against the rules and returns a verdict.
6. `python-developer` — fixes the findings. At most two rounds of steps 5–6; open findings are
   reported, not looped on.

Each agent stays in its lane by instruction: the reviewer has no write tools, the tester writes
only in the project's test directory (plus one proved, temporary change to `src/` to check a guard), and neither fixes
what it finds. Skip steps 1 and 3 for a small change inside an existing module. Each agent ends with a Proposals
section (a rule that seems wrong or missing, with evidence); the flow collects them for you to
decide, and nothing is applied automatically.

### Skills

| Skill                | Invoke with   | Description                                                                                                                  |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **api-architecture-rules** | `/api-architecture-rules` | Choose and lay out a Python API (FastAPI): domain modules or hexagonal modules, and where each piece of code goes; carries the architecture guide and its rules |
| **python-api-team**  | `/python-api-team`  | Runs the four agents as one flow (full, short or review) from the main session: hand-offs passed verbatim, stops for decisions, one fix round after review, and a table of the rules the agents propose to change |
| **builder-rules** | — (preloaded) | Generated background knowledge: test data factory rules for Python and `factory_boy`, for Python testing agents to preload |
| **python-rules**     | — (preloaded) | Generated background knowledge: docstrings and library documentation, typing syntax and mypy strict, exceptions, logging, asyncio, race-safe writes, t-string and secret-handling security |
| **python-project-rules** | — (preloaded) | Generated background knowledge: project setup and tooling, uv and the lockfile, Ruff, CI workflow, Makefile, dependency audit, trusted publishing |
| **pytest-rules**     | — (preloaded) | Generated background knowledge: strict markers, assertions, fixtures, mocking, time, testcontainers, async, Hypothesis, coverage, flaky tests |
| **fastapi-rules**    | — (preloaded) | Generated background knowledge: OpenAPI from code, response models, error format, operation ids, docs exposure, Spectral, oasdiff, Schemathesis |

`builder-rules`, `python-rules`, `python-project-rules`, `pytest-rules` and `fastapi-rules` are generated from `knowledge/` at the repo root, and so are the rules and the guide inside `api-architecture-rules`. Edit the notes there and run
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

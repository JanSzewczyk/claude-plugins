---
title: Use only the latest stable Python release, for applications and libraries alike
summary: One interpreter version, the newest stable (3.15 as of November 2026); no compatibility with older releases.
impact: high
applies: [python]
sources: [https://devguide.python.org/versions/]
---

## Rule

Target only the latest stable Python release, 3.15 as of November 2026, and move to each new one after its first patch releases once the key dependencies publish wheels for it. Pin it in `.python-version` and set `requires-python` to that version. Do not write code, CI matrices or conditionals for older interpreters, so every other Python rule here applies without version caveats.

## Why

Supporting several releases forces `TypeVar` boilerplate, quoted annotations, `typing_extensions` shims and CI matrices for syntax that the newest release makes unnecessary, and each older release is closer to losing security fixes.

## Incorrect

```toml
[project]
requires-python = ">=3.9"

[tool.ruff]
target-version = "py39"
```

## Correct

```toml
[project]
requires-python = ">=3.15"

[tool.ruff]
target-version = "py315"
```

## Exceptions

Upgrade only after the wheels of the dependencies you rely on exist for the new release; until then stay on the previous one and treat it as a temporary state, not a second supported version.

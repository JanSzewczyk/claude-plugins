---
title: Use only the latest stable Python release, for applications and libraries alike
summary: One interpreter version, the newest stable; no compatibility code or CI matrix for older releases.
impact: high
applies: [python]
sources: [https://devguide.python.org/versions/]
---

## Rule

Target only the latest stable Python release. Pin it in `.python-version`, set `requires-python` to `>=` that release, and write no code, CI matrix or conditional for older interpreters, so every other Python rule here applies without version caveats.

## Why

Supporting several releases forces `TypeVar` boilerplate, quoted annotations, `typing_extensions` shims and CI matrices for syntax that the newest release makes unnecessary, and each older release is closer to losing security fixes.

## Incorrect

```toml
# .python-version: 3.9

[project]
requires-python = ">=3.9"
```

## Correct

```toml
# .python-version: 3.15 (the latest stable release at the time of writing)

[project]
requires-python = ">=3.15"
```

## Exceptions

Move to a new release only after the wheels of the dependencies you rely on exist for it; until then stay on the previous one and treat that as a temporary state, not a second supported version.

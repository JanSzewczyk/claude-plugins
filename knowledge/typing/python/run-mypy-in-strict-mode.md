---
title: Run mypy in strict mode
summary: strict = true makes an unannotated function an error, so the annotation rules are enforced.
impact: medium
applies: [python, mypy]
sources: [https://mypy.readthedocs.io/en/stable/command_line.html#cmdoption-mypy-strict, https://mypy.readthedocs.io/en/stable/config_file.html]
---

## Rule

Set `strict = true` under `[tool.mypy]` in `pyproject.toml`, with `files` naming the source and test directories, so a bare `uv run mypy` checks the project.

## Why

Without strict mode mypy skips every function that has no annotations, so the code passes the check while its types are never looked at.

## Incorrect

```toml
[tool.mypy]
files = ["src", "tests"]
```

## Correct

```toml
[tool.mypy]
strict = true
files = ["src", "tests"]
```

## Exceptions

A project that has chosen another type checker (pyright, ty) keeps it in its strictest mode instead. Fix a reported error in the code; a `# type: ignore[code]` with a reason is only for a gap in a third-party package.

---
title: Declare an ASGI server in the project's runtime dependencies
summary: Put uvicorn[standard] (or fastapi[standard]) in [project].dependencies, never only in a dev group or the shell.
impact: high
applies: [python, fastapi, uv]
sources: [https://fastapi.tiangolo.com/deployment/manually/, https://docs.astral.sh/uv/concepts/projects/dependencies/]
---

## Rule

List the server that runs the app in `[project].dependencies`: `uvicorn[standard]`, or `fastapi[standard]` when you start it with `fastapi run`. Do not leave it to a dev group or to a tool installed outside the project.

## Why

A service whose tests pass through `TestClient` never imports the server, so a missing server shows up only when someone runs the start command.

## Incorrect

```toml
[project]
dependencies = ["fastapi"]        # nothing here can serve the app
```

## Correct

```toml
[project]
dependencies = ["fastapi", "uvicorn[standard]"]
```

## Exceptions

`fastapi[standard]` already pulls in `uvicorn[standard]`, so it satisfies the rule on its own.

---
title: Build a Python service's configuration as one typed Settings class fed by the environment
summary: Environment variables read once into a typed, validated Settings object with safe defaults and masked secrets.
impact: high
applies: [python, fastapi, pydantic-settings]
decides: [configuration/python/pydantic-settings/read-configuration-through-one-settings-class, configuration/python/pydantic-settings/hold-secrets-as-secretstr, configuration/python/pydantic-settings/default-exposing-settings-to-off, configuration/python/pydantic-settings/type-restricted-values-as-literal, configuration/python/pydantic-settings/commit-an-env-example-and-ignore-the-real-env, configuration/python/fastapi/build-settings-once-at-startup-and-inject-them, testing/python/pytest/build-test-settings-without-the-env-file]
sources: [https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/, https://fastapi.tiangolo.com/advanced/settings/, https://12factor.net/config]
---

## Decision

Configure the service from environment variables, read once into a single `BaseSettings` class, and no other module reads `os.environ` or `.env`. Fields are typed, closed sets are `Literal` or an enum, secrets are `SecretStr`, and a setting that exposes something defaults to off or empty (one with no safe value has no default, so a missing value stops startup). The entry point builds `Settings()` once, so bad configuration stops startup; the app receives it as an argument and exposes it through one dependency. FastAPI's cached `get_settings()` is acceptable only if the entry point also calls it once at startup. `.env.example` documents the variables, the real `.env` is git-ignored, and tests build their own `Settings(_env_file=None, ...)`.

## Options

| Source | Fits when | Cost |
| --- | --- | --- |
| Environment variables, `.env` locally (the default) | most services, containers, twelve-factor deployments | flat key/value only; nested data needs JSON or a delimiter |
| A config file (TOML, YAML) next to the code | many structured, non-secret settings | a second place to read, validate and keep out of the image |
| A secrets manager read at startup | secrets rotate or must not sit in the environment | a network call at startup and a failure mode to handle |

Combine them: non-secret defaults live in code, deployment values in the environment, and a secrets manager only for secrets that need it. All of them end in the same `Settings` object, so the rest of the code does not change.

## Layouts

```text
src/<package>/
├── config.py        # Settings, get_settings dependency
├── main.py          # create_app(settings): builds Settings() once
└── ...
.env.example         # committed: every variable, safe sample values
.env                 # git-ignored: this machine's values and secrets
tests/conftest.py    # make_settings(): Settings(_env_file=None, ...)
```

## Evolution

Move a secret to a secrets manager when it must rotate without a redeploy or an audit requires it; load it in the entry point and pass it into `Settings`, so the class stays the single source. Split `Settings` into nested models (`env_nested_delimiter`) when one group of fields, such as a database, grows past a handful, not before. Keep the single entry point either way: a second place that reads the environment is the signal that the rule is being broken.

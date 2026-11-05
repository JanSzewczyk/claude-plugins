---
title: Install from a lockfile that records hashes
summary: uv.lock and pylock.toml pin every package with hashes; install from them, never from loose requirements.
impact: high
applies: [python]
sources: [https://packaging.python.org/en/latest/specifications/pylock-toml/, https://docs.astral.sh/uv/concepts/projects/layout/#the-lockfile]
---

## Rule

Install from a lockfile that records a hash for every package: `uv.lock` with uv, or `pylock.toml` (PEP 751) with tools that read it. Outside uv, install with `pip install --require-hashes`. Commit the lockfile.

## Why

An unlocked install resolves to whatever was published a minute ago, so a hijacked or tampered release reaches production unreviewed; a hashed lockfile makes the same bytes install everywhere.

## Incorrect

```bash
pip install -r requirements.txt
```

## Correct

```bash
pip install --require-hashes -r requirements.lock
```

## Exceptions

With uv, the stale-lockfile check in CI belongs to the uv workflow note and is not repeated here.

---
title: Run griffe check against the latest tag in CI
summary: griffe compares the public API with the last tag, so a removed parameter cannot ship in a minor release.
impact: medium
applies: [python, griffe]
sources: [https://mkdocstrings.github.io/griffe/guide/users/checking/]
---

## Rule

In a library, run `griffe check <package> -s src` against the latest tag in CI. A break it reports is either fixed or released as a new major version.

## Why

A renamed or removed public parameter ships unnoticed in a minor release and breaks every caller who pinned the major.

## Incorrect

```bash
pytest && uv build
```

## Correct

```bash
# needs full history and tags (fetch-depth: 0)
griffe check mypkg -s src
pytest && uv build
```

## Exceptions

An application nobody imports has no public API to protect.

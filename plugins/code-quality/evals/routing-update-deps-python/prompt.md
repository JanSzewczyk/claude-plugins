---
name: routing-update-deps-python
description: update-deps should also pick up a request about a Python project's dependencies.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our pyproject.toml hasn't been touched in a year and half the packages are behind. Get them current, and don't leave the test suite broken.

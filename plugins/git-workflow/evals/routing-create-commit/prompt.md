---
name: routing-create-commit
description: A natural request that create-commit should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

The invoice filter work is done — save it to git with a proper message.

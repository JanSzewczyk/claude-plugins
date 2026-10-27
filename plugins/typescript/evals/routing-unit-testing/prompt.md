---
name: routing-unit-testing
description: A natural request that unit-testing should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Write unit tests for this date formatting utility.

---
name: routing-coverage-gaps
description: A natural request that coverage-gaps should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

What's untested in here, and which gaps actually matter?

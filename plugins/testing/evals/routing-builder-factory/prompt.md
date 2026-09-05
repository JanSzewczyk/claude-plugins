---
name: routing-builder-factory
description: A natural request that builder-factory should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I need test data builders for the Order and LineItem types.

---
name: routing-error-handling
description: A natural request that error-handling should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our server actions throw raw database errors straight at the user. Clean this up properly.

---
name: routing-t3-env-validation
description: A natural request that t3-env-validation should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I need to add two new environment variables and I want the build to fail if they're missing.

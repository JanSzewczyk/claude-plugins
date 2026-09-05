---
name: routing-devlogs
description: A natural request that devlogs should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Take a look at tmp/app.log and tell me what's actually going wrong in there.

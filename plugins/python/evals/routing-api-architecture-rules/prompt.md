---
name: routing-api-architecture-rules
description: A natural request that api-architecture-rules should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

My FastAPI app has routers/, models/ and schemas/ folders that keep growing and I can no longer tell where new code should go. How should I restructure the project?

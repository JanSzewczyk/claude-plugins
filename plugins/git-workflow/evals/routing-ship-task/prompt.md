---
name: routing-ship-task
description: A natural request that ship-task should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our CI workflow still runs on Node 20. Move it to Node 22 on a separate branch and put up a PR when it's done.

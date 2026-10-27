---
name: routing-dead-code
description: A natural request that dead-code should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This repo has been going for two years and it shows. What's in here that nothing calls any more?

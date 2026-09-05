---
name: routing-server-actions
description: A natural request that server-actions should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Add an action that updates the user's profile — validated, and it has to check the session first.

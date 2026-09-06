---
name: routing-create-branch
description: A natural request that create-branch should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm about to add filtering to the invoice list — put me on a branch for it first.

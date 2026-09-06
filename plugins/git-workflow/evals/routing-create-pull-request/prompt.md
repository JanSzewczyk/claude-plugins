---
name: routing-create-pull-request
description: A natural request that create-pull-request should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This branch is ready for review — put it up on GitHub for the team to look at.

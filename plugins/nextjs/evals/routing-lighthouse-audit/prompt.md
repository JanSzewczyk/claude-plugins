---
name: routing-lighthouse-audit
description: A natural request that lighthouse-audit should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Audit the homepage and tell me, in order, what's worth fixing.

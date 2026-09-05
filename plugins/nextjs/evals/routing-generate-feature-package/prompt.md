---
name: routing-generate-feature-package
description: A natural request that generate-feature-package should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Scaffold a new billing feature package for me.

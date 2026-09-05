---
name: routing-accessibility-audit
description: A natural request that accessibility-audit should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Go over the checkout page for accessibility problems.

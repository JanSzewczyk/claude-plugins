---
name: routing-plugin-release
description: A natural request that plugin-release should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I've finished editing the skills. What needs a version bump before I tag this?

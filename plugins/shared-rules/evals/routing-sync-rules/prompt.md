---
name: routing-sync-rules
description: A natural request that sync-rules should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Pull the latest shared .claude/rules files into this project.

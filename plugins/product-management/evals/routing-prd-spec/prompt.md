---
name: routing-prd-spec
description: A natural request that prd-spec should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Write up a PRD for the notifications feature we discussed.

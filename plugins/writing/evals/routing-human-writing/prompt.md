---
name: routing-human-writing
description: A natural request that human-writing should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Can you write a short Slack message to my team saying the release moves from Tuesday to Thursday because the payment provider's sandbox is down? Keep it casual.

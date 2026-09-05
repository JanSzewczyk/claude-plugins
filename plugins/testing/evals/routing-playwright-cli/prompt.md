---
name: routing-playwright-cli
description: A natural request that playwright-cli should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Write an end-to-end test for the checkout flow.

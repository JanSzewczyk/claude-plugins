---
name: routing-storybook-testing
description: A natural request that storybook-testing should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Write stories for this Button component, with interaction tests for the disabled and loading states.

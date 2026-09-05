---
name: routing-design-system-component
description: A natural request that design-system-component should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We need a Badge component in the design system — variants for info, warning and danger.

---
name: routing-knowledge-author
description: A natural request that knowledge-author should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Add a rule to the knowledge base that story tests must await every userEvent call, then rebuild the skills that use it.

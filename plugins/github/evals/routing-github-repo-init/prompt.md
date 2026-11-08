---
name: routing-github-repo-init
description: A natural request that github-repo-init should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I'm starting a small FastAPI service for tracking invoices. Can you set up a fresh repository for it on GitHub, with decent settings from the start?

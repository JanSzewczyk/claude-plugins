---
name: routing-update-deps
description: A natural request that update-deps should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Everything in package.json is months out of date. Bring it up to date without breaking the build.

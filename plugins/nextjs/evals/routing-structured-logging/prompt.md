---
name: routing-structured-logging
description: A natural request that structured-logging should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

There's no logging in this app at all. Set something up that's actually usable in production.

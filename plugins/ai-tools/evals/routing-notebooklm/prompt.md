---
name: routing-notebooklm
description: A natural request that notebooklm should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I have three research PDFs I keep meaning to read. Can you turn them into an audio overview I can listen to on the commute?

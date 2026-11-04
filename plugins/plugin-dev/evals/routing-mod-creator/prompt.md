---
name: routing-mod-creator
description: A natural request to build a Claude Code mod that mod-creator should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Make me a mod that shows how many tool calls this session has made in a band above the prompt. Put it in ~/mods/tool-counter.

---
name: routing-plugin-creator
description: A request to package skills and a hook into something other repos can install, which plugin-creator should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I have a review skill and a lint-after-edit hook in my .claude folder that the rest of the team wants too. Can you turn them into something they can install and keep updated?

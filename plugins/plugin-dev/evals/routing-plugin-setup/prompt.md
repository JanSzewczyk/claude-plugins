---
name: routing-plugin-setup
description: A request to make version bumps and doc updates happen by default in a plugin repo, which plugin-setup should pick up.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We keep forgetting to bump plugin versions and update the READMEs in this plugin repo. Can you set it up so Claude does that after every change, and CI catches it when it doesn't?

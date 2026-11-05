---
name: routing-plugin-creator-audit
description: A request to check one plugin before publishing it, which plugin-creator's audit mode should pick up.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Before I publish ./terraform-tools, can you check whether it is actually ready — the manifest, the hooks, the MCP config, all of it?

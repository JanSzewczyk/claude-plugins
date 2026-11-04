---
name: routing-mod-creator-audit
description: A request to audit an existing mod before installing it, which mod-creator's audit mode should pick up.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

A colleague sent me a mod in ./shared-guard with a register.ts that hooks tool.call. Can you audit it and tell me whether it's safe to install?

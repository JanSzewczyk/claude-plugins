---
name: routing-skill-audit
description: A natural request that skill-audit should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This SKILL.md I wrote has grown into a monster and I'm fairly sure half the files in its references folder aren't even linked any more. Go through plugins/testing/skills/unit-testing and tell me what to cut.

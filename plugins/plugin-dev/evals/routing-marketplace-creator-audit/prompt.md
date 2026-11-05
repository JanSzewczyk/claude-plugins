---
name: routing-marketplace-creator-audit
description: A drift-audit request that marketplace-creator's audit mode should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Something's off in this marketplace repo — I think the READMEs and the manifests have drifted apart. Can you check?

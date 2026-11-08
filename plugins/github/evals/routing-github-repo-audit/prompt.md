---
name: routing-github-repo-audit
description: A natural request that github-repo-audit should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our release job keeps failing to push the version commit, and I'm not even sure main is protected the way it should be. Can you go through how this repository is set up on GitHub and tell me what's off?

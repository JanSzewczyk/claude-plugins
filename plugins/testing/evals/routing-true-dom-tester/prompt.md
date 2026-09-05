---
name: routing-true-dom-tester
description: A natural request that true-dom-tester should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

I want a real-browser test for the modal, driven off the accessibility tree rather than screenshots.

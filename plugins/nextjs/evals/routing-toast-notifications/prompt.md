---
name: routing-toast-notifications
description: A natural request that toast-notifications should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

After the form saves I want a success message to show up on the next page.

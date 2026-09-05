---
name: routing-youtube-scraper
description: A natural request that youtube-scraper should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Find me some worthwhile YouTube videos about React Server Components — links and a line on each.

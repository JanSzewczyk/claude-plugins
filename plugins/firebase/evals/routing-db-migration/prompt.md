---
name: routing-db-migration
description: A natural request that db-migration should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

We're adding a `status` field to every document in the users collection. I need a migration for the existing data.

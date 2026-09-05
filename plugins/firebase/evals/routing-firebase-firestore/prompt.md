---
name: routing-firebase-firestore
description: A natural request that firebase-firestore should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Design the Firestore data model for a multi-tenant invoicing app and write the query layer.

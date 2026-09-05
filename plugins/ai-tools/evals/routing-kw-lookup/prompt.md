---
name: routing-kw-lookup
description: A natural request that kw-lookup should pick up, phrased the way a user would actually ask.
tags: [routing]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Mam numer księgi wieczystej WA1M/00123456/7 — potrzebuję adresu nieruchomości i tego, kto jest wpisany jako właściciel.

---
name: routing-setup-app-infrastructure
description: A request to put validated env vars and a structured logger into a fresh Next.js app, phrased the way a user would ask, that setup-app-infrastructure should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

This is a fresh Next.js App Router app with nothing set up yet. Add validated environment variables with T3 Env and a structured logger (LogLayer on Pino, a request id from proxy.ts) so I can start writing features on top of them.

---
name: routing-react-19-compiler
description: A natural request that react-19-compiler should pick up, phrased the way a user would actually ask.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Is all this useMemo still necessary now that we're on React 19?

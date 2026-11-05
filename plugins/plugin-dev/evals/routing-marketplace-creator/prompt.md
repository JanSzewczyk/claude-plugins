---
name: routing-marketplace-creator
description: A request to set up a catalog so a team can install its plugins by name, which marketplace-creator's create mode should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Our team keeps three plugins in this repo and everyone copies the folders around by hand. I'd like people to install them by name from our GitLab instead. Can you set that up?

#!/usr/bin/env bash
# Builds a deliberately broken mini-marketplace in the sandbox workspace, with four defects
# the skill is supposed to find. Each one is a real failure mode of this repo, shrunk:
#
#   D1  plugins/beta/ exists but is not registered in marketplace.json  (plugin invisible)
#   D2  plugins/alpha/agents/orphan.md is not listed in plugin.json     (agent never loads)
#   D3  the root README claims alpha has 3 skills; it has 2             (doc drift)
#   D4  the "second" skill carries a `version` key in SKILL.md          (frontmatter contract)
#
# Nothing here depends on the network, a package manager, or the host repo.
set -euo pipefail

mkdir -p demo-marketplace/.claude-plugin
mkdir -p demo-marketplace/plugins/alpha/agents
mkdir -p demo-marketplace/plugins/alpha/skills/first
mkdir -p demo-marketplace/plugins/alpha/skills/second
mkdir -p demo-marketplace/plugins/beta/skills/third

cd demo-marketplace

cat > .claude-plugin/marketplace.json <<'JSON'
{
  "name": "demo",
  "description": "Fixture marketplace",
  "owner": { "name": "Fixture" },
  "plugins": [
    { "name": "alpha", "description": "First plugin", "source": "./plugins/alpha" }
  ]
}
JSON

cat > plugins/alpha/plugin.json <<'JSON'
{
  "name": "alpha",
  "description": "First plugin",
  "version": "1.0.0",
  "author": { "name": "Fixture" },
  "agents": ["./agents/main.md"],
  "skills": "./skills/"
}
JSON

cat > plugins/beta/plugin.json <<'JSON'
{
  "name": "beta",
  "description": "Second plugin",
  "version": "1.0.0",
  "author": { "name": "Fixture" },
  "agents": [],
  "skills": "./skills/"
}
JSON

write_agent() {
  cat > "plugins/alpha/agents/$1.md" <<AGENT
---
name: $1
version: 1.0.0
lastUpdated: 2026-01-01
author: Fixture
related-agents: []
description: $2
tools: Read, Grep
model: sonnet
color: blue
permissionMode: default
skills: []
---

# $1
AGENT
}

write_agent main "The registered agent."
write_agent orphan "The agent nobody registered."

cat > plugins/alpha/skills/first/SKILL.md <<'SKILL'
---
name: first
description: The first fixture skill. Use when the user asks for the first thing.
---

# First
SKILL

cat > plugins/alpha/skills/second/SKILL.md <<'SKILL'
---
name: second
version: 2.0.0
description: The second fixture skill. Use when the user asks for the second thing.
---

# Second
SKILL

cat > plugins/beta/skills/third/SKILL.md <<'SKILL'
---
name: third
description: The third fixture skill. Use when the user asks for the third thing.
---

# Third
SKILL

cat > CLAUDE.md <<'MD'
# CLAUDE.md

## Plugins

| Plugin    | Description   | Agents | Skills         |
| --------- | ------------- | ------ | -------------- |
| **alpha** | First plugin  | main, orphan | first, second |
| **beta**  | Second plugin | —      | third          |
MD

cat > README.md <<'MD'
# Demo marketplace

| Plugin | Description | Agents | Skills | Guide |
| --- | --- | --- | --- | --- |
| [**alpha**](./plugins/alpha/) | First plugin | 2 | 3 | — |
| [**beta**](./plugins/beta/) | Second plugin | — | 1 | — |
MD

cat > plugins/alpha/README.md <<'MD'
# alpha

| Agent | Description |
| --- | --- |
| **main** | The registered agent. |
| **orphan** | The agent nobody registered. |

| Skill | Invoke with | Description |
| --- | --- | --- |
| **first** | `/first` | The first fixture skill. |
| **second** | `/second` | The second fixture skill. |
MD

cat > plugins/beta/README.md <<'MD'
# beta

| Skill | Invoke with | Description |
| --- | --- | --- |
| **third** | `/third` | The third fixture skill. |
MD

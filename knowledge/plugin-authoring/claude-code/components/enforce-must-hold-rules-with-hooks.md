---
title: Enforce a rule that must hold every time with a hook, not a skill
summary: A skill loads only when Claude matches its description; a hook runs on every matching event.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

When the plugin must guarantee something on every tool call, such as never editing a protected file, implement it as a hook in `hooks/hooks.json` (or a mod). Use skills for guidance Claude applies when the task matches.

## Why

A rule written into a skill holds only in sessions where that skill happened to load, so the protected file still gets edited in the others.

## Incorrect

```markdown
<!-- skills/safety/SKILL.md -->
Never edit files under migrations/.
```

## Correct

```json
{ "PreToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/scripts/deny-migrations.sh\"" }] }] }
```

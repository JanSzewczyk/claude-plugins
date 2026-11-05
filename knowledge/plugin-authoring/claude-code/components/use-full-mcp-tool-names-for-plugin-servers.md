---
title: Name a plugin's MCP tools in full in hook matchers and permission rules
summary: Plugin MCP tools are mcp__plugin_<plugin>_<server>__<tool>; a shorter form never matches.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

In hook matchers, permission rules and `allowed-tools`, write a plugin MCP tool as `mcp__plugin_<plugin>_<server>__<tool>`, or end the prefix with `*` to cover the server.

## Why

A matcher on the server name or on `mcp__<server>__<tool>` never fires, so a guard on the tool silently does nothing.

## Incorrect

```json
{ "matcher": "mcp__db__query" }
```

## Correct

```json
{ "matcher": "mcp__plugin_my-plugin_db__query" }
```

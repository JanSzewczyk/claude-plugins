---
title: Ask for plugin settings through userConfig and mark secrets sensitive
summary: Claude Code prompts for each value and keeps sensitive ones in the credential store, not in settings.json.
impact: high
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/components]
---

## Rule

Declare every value the plugin needs from the user under `userConfig` in `plugin.json`, with `type`, `title` and `description`, and set `"sensitive": true` on tokens and passwords. Read them as `${user_config.KEY}` in MCP/LSP config and exec-form hook `args`, or as `CLAUDE_PLUGIN_OPTION_<KEY>` in hook processes.

## Why

Instructions to edit `settings.json` by hand get skipped or leak a token into a committed file; a `userConfig` option opens a dialog at install and stores secrets in the platform's credential store.

## Incorrect

```markdown
Add `"MY_API_TOKEN": "..."` to the `env` block of your settings.json.
```

## Correct

```json
"userConfig": {
  "api_token": { "type": "string", "title": "API token", "description": "Token for the team API", "sensitive": true }
}
```

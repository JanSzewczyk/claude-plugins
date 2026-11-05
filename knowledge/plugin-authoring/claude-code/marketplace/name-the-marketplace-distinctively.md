---
title: Give the marketplace a distinctive, unreserved name before the first push
summary: Users cannot register two marketplaces with one name, and official-looking names are refused.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/create-marketplace]
---

## Rule

Pick a `name` for `marketplace.json` that includes your organisation or project, uses letters, digits, `.`, `_` and `-`, and avoids reserved and official-looking names. Use separately named marketplaces for separate audiences or release channels.

## Why

A generic name collides with another author's marketplace on the user's machine, and a reserved one fails `validate` or is refused at `marketplace add`; renaming later breaks every `<plugin>@<marketplace>` install line.

## Incorrect

```json
{ "name": "plugins", "owner": { "name": "Your Org" } }
```

## Correct

```json
{ "name": "your-org-tools", "owner": { "name": "Your Org" } }
```

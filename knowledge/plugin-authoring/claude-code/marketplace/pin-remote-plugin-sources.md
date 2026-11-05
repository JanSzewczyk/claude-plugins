---
title: Pin archive sources with sha256, and git sources with sha when installs must reproduce
summary: ref follows a branch or tag and an unpinned archive can change under the same URL.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/create-marketplace, https://code.claude.com/docs/en/plugins/host-marketplace]
---

## Rule

Give every `archive` source a `sha256`. Give `github`, `url` and `git-subdir` sources a full 40-character `sha` when every user must get the same commit; otherwise pin a `ref` to a tag.

## Why

Without a pin, a re-uploaded zip or a moved branch ships different code under the same entry, and nobody can tell which copy a user installed.

## Incorrect

```json
{ "source": { "source": "archive", "url": "https://artifacts.example.com/formatter.zip" } }
```

## Correct

```json
{ "source": { "source": "archive", "url": "https://artifacts.example.com/formatter-2.0.0.zip", "sha256": "9f2c…" } }
```

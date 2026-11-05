---
title: Host a marketplace whose entries use relative paths in git, not as a bare URL
summary: A marketplace.json URL downloads only that file, so every relative-path plugin fails to install.
impact: medium
applies: [claude-code]
sources: [https://code.claude.com/docs/en/plugins/host-marketplace]
---

## Rule

When any entry has a relative `source` such as `./plugins/formatter`, publish the marketplace as a git repository (or a shared directory). Serve a bare `marketplace.json` URL only when every entry is self-fetchable (`github`, `git-subdir`, `url`, `archive`, `npm`).

## Why

Users of a URL-hosted catalog get `its marketplace entry path does not stay inside the marketplace directory` for every relative entry.

## Incorrect

```bash
/plugin marketplace add https://plugins.example.com/marketplace.json   # entries: "./plugins/…"
```

## Correct

```bash
/plugin marketplace add your-org/your-marketplace
```

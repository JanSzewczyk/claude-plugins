---
title: Add a CHANGELOG.md section for every version you bump, in a heading tools can parse
summary: One `## [<version> <plugin>] — <date>` section per bumped plugin, grouped Added, Changed, Fixed or Removed.
impact: high
applies: [claude-code]
sources: [https://keepachangelog.com/en/1.1.0/]
---

## Rule

When a plugin's version is bumped, add one section for that version to the repository's `CHANGELOG.md` in the same change. Head it `## [<version> <plugin>] — <YYYY-MM-DD>`, newest first, and group the points under `### Added`, `### Changed`, `### Fixed` or `### Removed`. A repository with one plugin, or a designated main plugin, drops the name: `## [<version>] — <date>`. Write facts a user needs (what a skill now does, what was renamed or removed), not commit subjects.

## Why

A plugin manifest holds only the current version, so users and maintainers cannot tell what a bump changed. Release notes and the docs changelog are cut from these headings: a heading in another shape yields an empty Release or a missing page, and nothing reports it.

## Incorrect

```markdown
## 2.1.0

- misc fixes
```

## Correct

```markdown
## [2.1.0 python] — 2026-11-16

### Added

- `run-python-task` skill: runs one approved task through developer, tester and reviewer.

### Changed

- `python-reviewer` returns a findings table instead of free text.
```

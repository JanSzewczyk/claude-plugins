# Changelog step

Read when a bump is applied (workflow step 6). The rule behind it is in
[rules.md](./rules.md#add-a-changelogmd-section-for-every-version-you-bump-in-a-heading-tools-can-parse).

## Heading

`## [<version> <plugin>] — <YYYY-MM-DD>`, newest first, below the intro. Points go under `### Added`,
`### Changed`, `### Fixed` or `### Removed`.

| Repository | Heading |
| --- | --- |
| One plugin | `## [2.1.0] — 2026-11-16` |
| Marketplace | `## [2.1.0 python] — 2026-11-16` |
| Marketplace with a main plugin (its CI release tags `v<version>` and cuts Release notes from `## [<version>]`) | main plugin: `## [2.1.0]`, the others: `## [0.9.3 sdd-board]` |

The main plugin is the one the managed `plugin-dev` block in `CLAUDE.md` names under `Changelog main
plugin:`. No such line means no main plugin. Do not guess one.

The separator is an em dash with a space on each side. CI and the release script match this shape; a
hyphen or a missing date is read as no section.

## Existing CHANGELOG.md

1. List what is there: `node "${CLAUDE_SKILL_DIR}/scripts/changelog.mjs" . sections`.
2. For each bumped plugin draft its section, with `--main <plugin>` when `CLAUDE.md` names one:
   `node "${CLAUDE_SKILL_DIR}/scripts/changelog.mjs" . draft <plugin> --date <today>`.
   The draft takes the commits that touched the plugin since the commit that set its previous
   version, sorted into the four groups by Conventional Commit prefix (`feat:`, `fix:`) or the
   squash style (`Feature:`, `Fix:`); bump and merge commits are dropped.
3. Rewrite the points: what a user can now do, what was renamed or removed, what to change.
   Commit subjects such as "Update README" are not changelog points; drop them. Put a breaking
   change first in `Changed` or `Removed` and say what to do instead.
4. Show the section, wait for a yes, insert it above the newest section. Keep the file's
   wording and any `## [Unreleased]` block: move its points into the new section.

## No CHANGELOG.md

Ask once with AskUserQuestion; creating the file is the user's decision, and so is its depth:

- **Start empty**: the intro below and the sections for this release only.
- **Backfill**: one section per version the manifests ever had, from git history:
  `node "${CLAUDE_SKILL_DIR}/scripts/changelog.mjs" . backfill [--plugin <name>] [--limit <n>]`.
  Versions are cut at the commits that changed `version` in the manifest, so missing tags do not
  matter. In a marketplace with many plugins offer `--limit` (the newest 3 versions per plugin is a
  sensible default) and say the older ones are left out.
- **No changelog**: do nothing; release notes stay in the tag annotation.

A backfilled draft is generated from commit subjects, so read it before showing it: merge noise,
duplicates and vague subjects need rewriting or dropping. Say plainly that the entries are
reconstructed. Write the file only after the user has seen it.

Intro for a new file:

```markdown
# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
```

## CI

`plan-release.mjs --check --changelog` fails a pull request that bumps a plugin and leaves out its
section (the `changelog: "true"` input of the `version-bump-check` action). It is skipped when the
repository has no `CHANGELOG.md`.

## A release workflow

When the repository has a workflow that tags and creates GitHub Releases on merge, it reads notes
from `## [<version>]` (or `## [<version> <plugin>]`) in `CHANGELOG.md`. A missing section there gives
an empty Release, so the section is part of the bump pull request, never a follow-up. This skill
only tells the user when it finds such a workflow; it does not create one.

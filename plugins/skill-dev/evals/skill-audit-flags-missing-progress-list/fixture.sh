#!/usr/bin/env bash
# Builds a well-authored skill whose one defect is that a long, side-effecting flow shows no progress.
# Nothing here depends on the network, a package manager, or the host repo.
set -euo pipefail

mkdir -p publish-notes

cat > publish-notes/SKILL.md <<'MD'
---
name: publish-notes
description: Publishes release notes for a tagged version — collects merged pull requests, drafts the notes, updates CHANGELOG.md, tags the release and pushes it. Use when the user asks to publish, cut or write release notes for a version.
argument-hint: "<version>"
---

# Publish Notes

Release notes are written from what actually merged, so a reader can trust them.

## Steps

1. Collect the pull requests merged since the previous tag with `gh pr list --state merged`.
2. Draft the notes, grouped by feature, fix and breaking change.
3. Show the draft and wait for the user's approval.
4. Add the approved notes to `CHANGELOG.md` and commit it.
5. Create the tag for the version and push it with the commit.
MD

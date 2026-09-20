#!/usr/bin/env bash
# Builds a deliberately badly-authored skill in the sandbox workspace, with six defects the
# audit is supposed to find. Each one is a real failure mode, shrunk:
#
#   D1  the description is first-person and never says when to use the skill
#   D2  references/helper.md is linked from nowhere                      (orphan)
#   D3  SKILL.md links references/missing.md, which does not exist       (dead link)
#   D4  references/deep.md is reachable only through references/background.md (two hops)
#   D5  a Polish paragraph sits in an otherwise English body             (language intrusion)
#   D6  a Windows path appears in prose                                  (breaks on Unix)
#
# Nothing here depends on the network, a package manager, or the host repo.
set -euo pipefail

mkdir -p demo-skill/references

cd demo-skill

cat > SKILL.md <<'MD'
---
name: demo-skill
description: I can help you process the reports and tidy them up.
---

# Demo Skill

This skill processes reports. Reports are documents that contain data, and processing them
means reading the data out of them and putting it somewhere else.

For the detailed steps see [references/missing.md](./references/missing.md), and for the
background see [references/background.md](./references/background.md).

Aby uruchomic przetwarzanie, nalezy najpierw sprawdzic czy plik jest dostepny oraz czy ma
wlasciwy format, poniewaz inaczej caly proces sie nie powiedzie.

Run the helper at scripts\run.mjs when the report is large.
MD

cat > references/background.md <<'MD'
# Background

Some background about reports.

Deeper detail lives in [deep.md](./deep.md).
MD

cat > references/deep.md <<'MD'
# Deep detail

The detail that is two hops away from SKILL.md.
MD

cat > references/helper.md <<'MD'
# Helper notes

Notes nothing links to.
MD

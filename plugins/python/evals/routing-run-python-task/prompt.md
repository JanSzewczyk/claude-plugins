---
name: routing-run-python-task
description: A task handed over by an orchestrator, phrased the way an implementation brief reads, that run-python-task should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Implement task T1 of this feature in apps/api: add GET /v1/extractions with status and template filters and offset paging. The plan is already approved and the branch is created, so do not plan or ask me anything. Acceptance criteria AC1-AC4 and the project's check commands are below. Build it, have it tested and reviewed, commit on the current branch, and report the files changed, the test result and any criterion not met.

AC1: given extractions in several statuses, when status is passed, only those are returned.
AC2: given limit and offset, the page is that slice and the total is returned.
AC3: given an unknown status, the response is a Problem Details 422.
AC4: given no filters, all extractions are returned newest first.
Checks: make check.

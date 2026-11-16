---
name: routing-run-nextjs-task
description: A task handed over by an orchestrator, phrased the way an implementation brief reads, that run-nextjs-task should pick up.
tags: [routing, smoke]
plugins: ["../.."]
runs: 3
max_turns: 6
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Implement task T3 of this feature in apps/studio, our Next.js App Router app: add the extractions list page with status filters and paging, reading data through the server-side API client. The plan is already approved and the branch is created, so do not plan or ask me anything. Acceptance criteria AC1-AC4 and the project's check commands are below. Build it, have it tested and reviewed, commit on the current branch with the trailer `Task: LEPF-T3`, and report the files changed, the test result and any criterion not met.

AC1: given extractions in several statuses, when a status filter is chosen, only those rows are shown.
AC2: given more rows than one page, the pager shows the next page and the total.
AC3: given the API fails, the page shows the error state and logs the error once.
AC4: given no extractions, the page shows the empty state.
Checks: npm run type-check -w @form-lens/studio, npm run biome:check -w @form-lens/studio, npm run test:unit -w @form-lens/studio.

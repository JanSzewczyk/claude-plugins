---
name: run-nextjs-task
description: "Run one already-planned task in a Next.js (App Router, React, TypeScript) project through developer, tester and reviewer, with no planning and no questions, and report back to whoever handed it over. Use when a task orchestrator such as the SDD implement flow hands over a task brief or a task id, when `skill:nextjs:run-nextjs-task` is configured as the implementation flow, or the user says 'run this task', 'implement task T2 with tests and review', 'wykonaj to zadanie z briefu' for a Next.js app. The plan, the branch and the pull request belong to the caller; this skill builds, tests, reviews and follows the brief's git instructions. NOT for Python (run-python-task), a single step (call the agent) or a loose request that still needs planning."
allowed-tools: Agent(nextjs:nextjs-developer, nextjs:nextjs-tester, nextjs:code-reviewer), Read, Glob, Grep, Bash(npm ci:*), Bash(npm run:*), Bash(npm exec:*), Bash(npx:*), Bash(pnpm:*), Bash(yarn:*), Bash(node:*), Bash(lsof:*), Bash(git:*), Bash(gh pr:*), Skill, TodoWrite
argument-hint: "[task brief | task id]"
---

# Run a Next.js task

Execute one task whose plan is already approved: developer, tester, reviewer, one fix round. The
caller (an orchestrator, or the user) owns the plan, the branch and the pull request; you own the
quality of the change. You run without a user to ask: never enter plan mode, never ask a question.

**Your first tool call creates the task list** (`mcp__ccd_turn__update_plan`, otherwise `TaskCreate`
and `TaskUpdate`, or `TodoWrite`; with none, print the list and reprint it after each step), before
any agent call:

```
0 input   → brief or task id read, environment ready
1 build   → developer: code, tests, commit
2 test    → tester: one pass, defects as red tests
3 fix     → developer: the defects                  (when any are red)
4 review  → reviewer: verdict and findings table
5 fix     → developer fixes, reviewer re-reviews the changes (once, when 🔴 or 🟡 exist)
6 publish → push and pull request, only as the brief says
7 report  → what changed, tests, unmet criteria, link
```

One item in progress at a time; a step that does not apply stays on the list as `skipped`. The
agent prompts, hand-offs and gates are in [agent-prompts.md](../../references/agent-prompts.md) and
[step-gates.md](../../references/step-gates.md); the budgets in
[budgets.md](../../references/budgets.md).

## 0. Input and environment

- **A brief** (the normal case): free text with the task, its acceptance criteria, the plan
  sections that apply, the project's test, coverage, type-check and lint commands, the rules to
  follow, the definition of done and the git instructions. Use it as given.
- **A task id only**: find the task in the project's `specs/*/tasks.md`, then read the criteria it
  lists in that feature's `spec.md`, the plan sections it names (and the plan's testing section) in
  `plan.md`, and the commands and rules in the constitution. Assemble a brief with the same content.
  A file, a task or a section you cannot find: stop and say which. Do not guess a layout that is
  not there.

Check that HEAD is on a branch (not detached) and that the tree is clean; otherwise stop and say
why. Work on the branch you are on. Note the git instructions in the brief (commit message form,
trailers, whether to push, whether to open a pull request and into what) and the generated paths it
names (plus `generated:` in `specs/capabilities.yml` when there is one): nobody edits those.

**Environment.** A task often runs in a fresh worktree, which has no installed packages and no
local env file. Prepare it once, before step 1:

1. `git rev-parse --show-toplevel`, then the lockfile there decides the install:
   `package-lock.json` → `npm ci`, `pnpm-lock.yaml` → `pnpm install --frozen-lockfile`,
   `yarn.lock` → `yarn install --immutable`. Install only when `<toplevel>/node_modules` is missing.
   Do not test whether a package resolves: a worktree inside the main checkout resolves the main
   checkout's `node_modules` and would run against the wrong code.
2. `node -v` must satisfy `engines.node` of the root `package.json`; otherwise stop and say so.
3. When the project's env files skip validation on `SKIP_ENV_VALIDATION`, set
   `SKIP_ENV_VALIDATION=1` for every command and say so in the prompts. Copy `.env.example` to the
   local env file only when `git check-ignore` confirms that file is ignored. Never write a secret.
4. Install Playwright browsers only when a step will run browser tests.
5. `git status --porcelain` is empty again; anything the setup left behind is a stop.

## 1–5. Build, test, review

Run the agents one at a time, as `nextjs:nextjs-developer`, `nextjs:nextjs-tester` and
`nextjs:code-reviewer`.

1. **Build.** The brief, the environment note from step 0, and "return the files by kind, each
   `'use client'` with its reason, each acceptance criterion with its test file and layer, which
   checks you ran with their summary lines", plus the brief's commit instructions: only the task's
   files, committed with `git` (never a commit skill: it may stop to ask), the hash back. Gate:
   step-gates.md, Build.
2. **Test.** One pass: the tester lists the cases from the criteria, adds only what the developer's
   tests miss, runs each touched layer once with a non-watching command, reports defects as red
   tests and names the command that turns each layer green. No E2E unless step-gates.md allows it.
   Gate: Test.
3. **Fix.** The defects, in order. Run the tester's green commands yourself. A defect that is a
   stricter reading of an ambiguous criterion is the developer's call: fixed or disputed, and the
   report lists it as a decision taken.
4. **Review.** The developer's latest hand-off, the tester's files and green commands, first pass.
   Gate: Review.
5. **Fix once.** Only 🔴 and 🟡 findings, then the reviewer sees what changed, second pass. 🔵
   findings go to the report. After this second review stop: open findings are reported, not looped
   on.

Disagreements you cannot settle (the criteria and a team rule differ, two agents give opposite
findings, a step wants a new dependency, a Node or framework version change, or a CI edit): do not
ask. Take the option that follows the team rule and the stricter reading, state it as a decision
taken in the report, and where no safe option exists leave the criterion unmet and stop the chain.

Never edit anything under `specs/`: a change the spec needs goes into the report.

## 6. Publish

Do exactly what the brief says about git and nothing else. After each commit check that it carries
what the brief required (a trailer, a subject form); when it does not, amend. Push and open a pull
request only when the brief says so, with `gh pr create` and the base and title the brief names —
not a pull-request skill, which stops for approval. Never merge. Without git instructions in the
brief: a Conventional Commits commit, no push, no pull request, and the report says so.

## 7. Report

Short, in this order: files changed; test result per layer (command and outcome); criteria not met,
or "none"; the pull request link if one was opened; open findings; decisions taken; what was not
checked (E2E, a skipped build); Proposals, collected as in
[proposals.md](../../references/proposals.md). The caller verifies the branch itself, so the report
states what you did, not that it is correct.

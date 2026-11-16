---
name: run-python-task
description: "Run one already-planned task in a Python (FastAPI) project through developer, tester and reviewer, with no planning and no questions, and report back to whoever handed it over. Use when a task orchestrator such as the SDD implement flow hands over a task brief or a task id, when `skill:python:run-python-task` is configured as the implementation flow, or the user says 'run this task', 'implement task T2 with tests and review', 'wykonaj to zadanie z briefu'. The plan, the branch and the pull request belong to the caller; this skill builds, tests, reviews and follows the brief's git instructions. NOT for building from a loose request with planning and decisions (use python-api-team), deciding where code lives (api-architecture-rules), a single step (call the agent) or non-Python work."
allowed-tools: Agent(python:python-developer, python:python-tester, python:python-reviewer), Read, Glob, Grep, Bash(uv run:*), Bash(make:*), Bash(git:*), Bash(gh pr:*), TodoWrite
argument-hint: "[task brief | task id]"
---

# Run a Python task

Execute one task whose plan is already approved: developer, tester, reviewer, one fix round. The
caller (an orchestrator, or the user) owns the plan, the branch and the pull request; you own the
quality of the change. You run without a user to ask: never enter plan mode, never ask a question.

**Your first tool call creates the task list** (`mcp__ccd_turn__update_plan`, otherwise `TaskCreate`
and `TaskUpdate`, or `TodoWrite`; with none, print the list and reprint it after each step), before
any agent call:

```
0 input   → brief or task id, read
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
[budgets.md](../../references/budgets.md) (task flow section).

## 0. Input

- **A brief** (the normal case): free text with the task, its acceptance criteria, the plan
  sections that apply, the project's test, coverage, type-check and lint commands, the rules to
  follow, the definition of done and the git instructions. Use it as given.
- **A task id only**: find the task in the project's `specs/*/tasks.md`, then read the criteria it
  lists in that feature's `spec.md`, the plan sections it names (and the plan's testing section) in
  `plan.md`, and the commands and rules in the constitution. Assemble a brief with the same content.
  A file, a task or a section you cannot find: stop and say which. Do not guess a layout that is
  not there.

Check only that HEAD is on a branch (not detached) and that the tree is clean; otherwise stop and
say why. The branch's name is not your business: work on the one you are on. Note the git
instructions in the brief (commit message form, trailers, whether to push, whether to open a pull
request and into what) and quote them in the steps below.

## 1–5. Build, test, review

Run the agents one at a time, as `python:python-developer`, `python:python-tester` and
`python:python-reviewer`.

1. **Build.** The brief and "return the exported OpenAPI path, the state-dependent rules with their
   guards, the test files with the cases each covers, which checks you ran", plus the brief's
   commit instructions: only the task's files, the commit hash back. Gate: step-gates.md, Build.
2. **Test.** One pass: the tester lists the cases from the criteria and the contract, adds only what
   the developer's tests miss, runs the suite once, reports defects as red tests. No repeated runs,
   no second seed, no mutants, no fuzzer, no search for rare failures. Gate: Test.
3. **Fix.** The defects, in order. Run the tester's green command yourself. A defect that is a
   stricter reading of an ambiguous contract is the developer's call: fixed or disputed, and the
   report lists it as a decision taken.
4. **Review.** The developer's latest hand-off and the tester's files, first pass. Gate: Review.
5. **Fix once.** Only 🔴 and 🟡 findings, then the reviewer sees what changed, second pass. 🔵
   findings go to the report. After this second review stop: open findings are reported, not looped
   on.

Disagreements you cannot settle (the criteria and a team rule differ, two agents give opposite
findings, a step wants a new runtime dependency, a Python version change or a CI edit): do not ask.
Take the option that follows the team rule and the stricter reading, state it as a decision taken
in the report, and where no safe option exists leave the criterion unmet and stop the chain.

Never edit anything under `specs/`: a change the spec needs goes into the report.

## 6. Publish

Do exactly what the brief says about git and nothing else. After the commit check that it carries
what the brief required (a trailer, a subject form); when a commit skill dropped it, amend. Push and
open a pull request only when the brief says so, with the base, title and tool it names. Never
merge. Without git instructions in the brief: a Conventional Commits commit, no push, no pull
request, and the report says so.

## 7. Report

Short, in this order: files changed; test result (command and outcome); criteria not met, or
"none"; the pull request link if one was opened; open findings; decisions taken; what was not
checked; Proposals, collected as in [proposals.md](../../references/proposals.md). The caller
verifies the branch itself, so the report states what you did, not that it is correct.

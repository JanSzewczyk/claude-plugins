---
name: python-api-team
description: "Run the Python API team as one flow: architect, developer, tester and reviewer in turn, ending with a verdict, open decisions and rule proposals. Use when a Python (FastAPI) service or endpoint should be built and verified end to end, an existing API should be tested and reviewed, or the user wants a new endpoint delivered with independent tests and a review before merge, even without mentioning agents: 'build this API with the agents', 'run the full flow', 'zbuduj to z agentami', 'zrób pełny flow', 'build it, test it and review it'. Wins over api-architecture-rules and python-developer when the request covers building and verifying; a request about where code should live goes to api-architecture-rules, one that only asks for an implementation to python-developer. NOT for a task whose plan is already approved and handed over by an orchestrator such as SDD (use run-python-task), a single step (call python-tester or python-reviewer directly) or non-Python work."
allowed-tools: Agent(python:python-api-architect, python:python-developer, python:python-tester, python:python-reviewer), Read, Glob, Grep, Bash(uv run:*), Bash(make:*), Bash(git worktree:*), Bash(git rev-parse:*), TodoWrite, AskUserQuestion, EnterPlanMode, ExitPlanMode
argument-hint: "[task description | path of existing code to test and review]"
---

# Python API flow

Run the architect, developer, tester and reviewer in turn from the main session: subagents cannot
call each other and each starts with an empty context, so what you put in its prompt is everything
it knows. Run by hand, the sequence loses hand-offs and skips the tester on "small" changes. For a
one-line fix skip the flow and call the developer directly: the flow costs several long agent runs.

**Your first tool call in this skill creates the task list**, before any agent call: the flow spans
several long runs and pauses for the user, who needs to see where it stands. Use the task-list tool
the session has (`mcp__ccd_turn__update_plan`, otherwise `TaskCreate` and `TaskUpdate`, or
`TodoWrite`); with none, print the list and reprint it after each step. Create it with these items:

```
0 variant   → one of full / lean / short / review, named, with the reason
1 plan      → architect: layout and checklist, approved by the user (full, lean)
2 build     → developer: code, tests, hand-off          (full, short)
3 test      → tester: contract tests, defects as red tests
4 fix       → developer: the defects, in order          (when any are red)
5 review    → reviewer: verdict and findings table
6 fix again → developer fixes, reviewer re-reviews the changes (when the verdict is Changes requested; once)
7 report    → verdict, open decisions, proposals, not checked
```

- One item in progress at a time; finish it when its step ends and start the next in the same update.
- A step the variant skips stays on the list: `1 plan: skipped, short variant`.
- While waiting for the user, say so in the item: `5 review: waiting for your decision`.
- Show an outcome that is not a plain success: `3 test: gate failed, resent once`, `4 fix: 2 disputed`.
- After step 3 replace `4 fix` with one item per defect; after step 5 replace `6 fix again` with
  one item per finding number. In the lean variant steps 3 and 5 run side by side and share one
  fix step: list it as `4 fix: defects and findings`.

## 0. Pick the variant

- **full**: a new service, a new module, or a feature whose rules span more than one module.
  Steps 0–7.
- **lean**: a new endpoint or module whose task arrives with a spec that already fixes routes,
  statuses and limits (a document, a ticket). Like full, with the architect turning the spec into
  the layout and checklist (step 1), but the tester and the reviewer run side by side (steps 3 and
  5), with one fix step for both tables, a second review pass and the report (7). The tester's
  guard proofs (its step 5) run only when a rule reads stored state or a limit sheds load;
  without one, it runs the contract cases and the fuzzer only.
- **short**: a small change inside an existing module with a layout to follow. Steps 0, 2, 5, 6, 7;
  add steps 3 and 4 when the change adds a rule that reads stored state (a limit, stock,
  already-done), because only the tester proves its guard and its defects need a fix before the
  review.
- **review**: existing code to be tested and reviewed as it stands. Steps 0, 3, 4 (when any are
  red), 5, 6, 7; the developer fixes only what the tester and reviewer report.

A spec that fixes the routes and the rules means lean; a layout decision still open means full.
When it is unclear, choose full: a skipped architect costs more than an extra plan step. Say which
variant you chose and why. The variant is never "skip the reviewer": the author's own checks are
what the reviewer exists to confirm.

## The steps

Call the agents as described in [agent-prompts.md](../../references/agent-prompts.md): every prompt
carries the task, the project path, the previous hand-off verbatim, a time budget, "end with your
hand-off and a Proposals section" and, for the tester and the reviewer, which pass it is. Run them
one at a time, except the tester and the reviewer of the lean variant and developer parts on
disjoint files, which follow [parallel-agents.md](../../references/parallel-agents.md) (disjoint
ports, their own copy of the tree).

Without step 1 (short, review) there is no architect hand-off: step 2 gets the task and the module
to follow, and step 3 gets the OpenAPI path and rule list from the developer (short) or from your
own reading of the code and `/openapi.json` (review). Without step 2 (review), step 5 gets the
tester's files and Result line only.

1. **Plan.** Enter plan mode (`EnterPlanMode`, unless the session is already in it): the user
   gets the approve / reject / edit dialog, and the read-only architect runs fine inside it. Give
   the architect the task and project path, and ask it to list every open decision with its
   recommended option and the realistic alternatives.
   **Resolve the open decisions before the plan is shown.** When the hand-off lists any (a project
   folder, an id type, which rule wins when two apply, whether docs are exposed), ask them first
   with `AskUserQuestion`: up to four questions per call, each with the architect's recommendation
   as the first option marked "(Recommended)", the alternatives after it, and a line on what each
   costs. The plan is not shown while a question is open. Record every answer in the plan as a
   decided decision; one the user leaves to you takes the recommendation and is marked as such.
   With no open decisions, go on. When an answer changes the layout, run the architect once more
   with the answers: that is not a rejection.
   Then write the layout, checklist (cross-cutting pieces, error statuses, guards) and the decided
   decisions into the plan file in full (plan mode allows no other write, and a condensed plan is
   no longer the hand-off to pass verbatim), and show it with `ExitPlanMode`. Approved:
   the plan goes into step 2 and step 3. Edited: use the user's version. Rejected: ask what to
   change and run the architect once more with that; a second rejection ends the flow. Without the
   plan-mode tools, print the plan and ask with `AskUserQuestion` (approve / change / reject).
   Gate: no open decision is left, and the user approved a plan; nothing is built before.
2. **Build.** Task and the architect's hand-off. One developer run builds it and commits the work
   (the lean variant's reviewer needs the hash); split it only into parts that touch disjoint files,
   and then run those parts side by side in separate worktrees. Gate: Build in
   [step-gates.md](../../references/step-gates.md).
3. **Test.** The OpenAPI path, the rule list and the architect's checklist. Gate: Test.
4. **Fix.** The tester's defects table, in its order (in the lean variant, the tester's defects
   first, then the reviewer's 🔴 and 🟡 findings, in one run; step 6 is then only the reviewer's
   second pass). Gate: Fix. A dispute about the contract goes to the user with the options, not to
   a vote between agents.
5. **Review.** Gate: Review. In the lean variant the reviewer runs while the tester works: create a
   detached worktree at the build commit (`git worktree add --detach <dir> <hash>`) and give the
   reviewer its path as the project, so the tester's red tests and half-written files never reach
   it. Remove the worktree when it is done. The reviewer then has no tester files; its second pass
   covers everything since the build commit, tests included.
6. **Fix again.** Gate: Fix again. 🔵 findings go to the report and the pull request as follow-ups,
   and are fixed only when the user asks. After this second review stop and report.
7. **Report.** Open with the reviewer's last verdict, quoted. Then the defects and findings fixed
   and open, the decisions waiting for the user, the proposals (below) and what was not checked,
   taken from every agent's hand-off.

A failed gate is resent once with what is missing; if it fails again, ask the user and do not run
the next step.

## Budgets

[budgets.md](../../references/budgets.md) holds the limits: one full `make check` per hand-off, one
mutant per guard, race tests five times, the suite under two seeds, a step that overruns hands back
what it has. The first two runs of this flow took 1 h 40 min and 3 h 25 min, mostly on repeated
checks.

## Stop and ask the user

Use `AskUserQuestion`, with the options, when:

- the documented contract and a team rule disagree (the spec says 422, the rule says 409);
- a step needs a new runtime dependency, a Python version change or an edit to CI (a test-group
  dependency the tester adds is allowed and listed in the report);
- two agents give opposite findings on the same code;
- the second review still has a 🔴 or 🟡.

## Proposals

Agents report rules they find wrong, missing or contradicted under Proposals. Collect them at step 7
as in [proposals.md](../../references/proposals.md): merge duplicates, drop any without evidence,
show one table, change nothing yourself.

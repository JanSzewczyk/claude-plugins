---
name: coverage-gaps
description: Find and rank the test-coverage gaps that actually matter — untested auth, payment, server actions, validation, and error paths — weighting uncovered branches and recent churn over raw line percentages. Use this skill whenever the user asks what's untested, where coverage is weak, what tests are missing, which code needs tests most, or wants a coverage report interpreted or prioritized — even if they just say "we should probably add some tests" or mention a low coverage number without naming coverage tooling.
allowed-tools: Read, Glob, Grep, Bash
argument-hint: "[path or feature to scope the analysis, e.g. src/features/billing]"
---

# Coverage Gaps

Find the uncovered code that would hurt if it broke, and rank it. The deliverable is a short,
ordered list of gaps a developer can act on — not a coverage report.

This distinction is the whole point of the skill. Istanbul already prints every uncovered
line; that output is long, flat, and mostly noise, which is why nobody reads it. The value
you add is **judgement**: separating the untested refund guard from the untested barrel file,
and saying why. A report that lists 40 gaps has done nothing the tooling didn't already do.

> - [references/risk-model.md](./references/risk-model.md) — the five risk signals, what to
>   de-prioritize, branch-vs-line coverage, false positives, and calibration examples. Read
>   this before ranking anything; it is where the actual judgement lives.
> - [scripts/rank-gaps.mjs](./scripts/rank-gaps.mjs) — parses the coverage report, extracts
>   uncovered branches/functions/lines, filters noise, weights by path category and git churn.

## Scope

Vitest unit coverage (Istanbul `coverage-final.json`) for TypeScript projects. This skill
**finds and ranks** gaps — it does not write the tests. Hand the ranked list to the
`unit-testing` skill or the `unit-tester` agent to close them; that separation keeps this
skill honest, since an analyst who also writes the tests is tempted to find gaps that are
easy to fill rather than gaps that matter.

## Workflow

### 1. Get a coverage report

Look for an existing one first (`coverage/coverage-final.json` — the script checks the usual
locations). If it's absent or stale, generate it:

```bash
npm run test:unit -- --coverage --coverage.reporter=json
```

If the project has no coverage setup at all, say so plainly and stop — the fix is configuring
`@vitest/coverage-v8`, not guessing at gaps by reading source files. Guessing produces a
confident-looking report built on nothing, which is worse than no report.

### 2. Rank the candidates

```bash
node <skill-path>/scripts/rank-gaps.mjs --top 15
```

Scope it when the user named a feature or path (`--coverage`, or filter the output). Use
`--json` if you want to post-process. The script handles the mechanical part — parsing,
noise filtering, churn, a first-pass score.

Treat its ordering as a **starting hypothesis, not a verdict**. It matches on path shape and
counts, so it cannot tell a genuinely dangerous `catch` block from a defensive one that can
never fire. That's your job in the next step.

### 3. Read the top candidates

Open the actual code behind the top ~10 rows. For each, answer:

- What does this code do, and what breaks if it's silently wrong?
- Which specific paths are untested — a whole function, an error branch, a guard clause?
- Is the gap real, or a [false positive](./references/risk-model.md#common-false-positives)
  (unreachable defensive check, covered by E2E, generated code)?

Drop anything you can't justify. A gap you didn't open the file for isn't a finding, it's a
row from a CSV — and if you report it and the user opens it to find a one-line pass-through,
they'll rightly distrust the other nine.

### 4. Report

Keep it to the gaps that survived step 3 — typically **3 to 7**. If fewer survive, report
fewer; a two-item report that's all signal beats a ten-item report padded to look thorough.

## Report structure

Use this shape:

```markdown
## Coverage gaps worth closing

**Scope:** <what was analyzed> · **Overall:** <X>% statements / <Y>% branches

### 1. <path/to/file.ts> — <one-line risk statement>

<X>% statements / <Y>% branches · <N> commits in the last <window>

<What this code does and what a silent failure costs. Then the specific untested paths,
with line numbers.>

**Suggested tests:** <1-3 concrete cases, named by behaviour>

### 2. ...

## Deliberately excluded

<Anything that looks like a gap but isn't worth a test, one line each with the reason.>
```

Two things make this report land:

- **Lead each item with the risk, not the file.** "Refund guard never tested — an unsettled
  order can be refunded" tells the reader why to care; "82% coverage in refund-order.ts"
  makes them work it out.
- **Keep the exclusions section.** It's short, and it's what tells the reader you filtered
  rather than truncated — otherwise "only 4 findings" reads as a shallow pass.

## Handoff

Close with the natural next step: `/unit-testing` (or the `unit-tester` agent) to write the
tests for the top gaps, and offer to scope it to gap #1 rather than all of them at once.

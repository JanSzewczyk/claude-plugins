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

Follow the reporting rules indexed at the end of this section. For coverage gaps:

- **Marks** are the risk of the gap, from [the risk model](./references/risk-model.md): high → 🔴,
  medium → 🟡, low → 🔵. A gap is not broken code, so the verdict says how many are worth closing.
- **No scorecard:** the areas differ on every run.
- **`Problem` leads with the risk, not the file.** "Refund guard never tested — an unsettled order
  can be refunded" tells the reader why to care; "82% coverage in refund-order.ts" makes them
  work it out.
- **Detail blocks** carry the untested paths with line numbers, for the gaps whose table row
  cannot hold them.
- **Keep the exclusions line.** It is what tells the reader you filtered rather than truncated —
  otherwise "only 4 findings" reads as a shallow pass.

````markdown
## 🩺 Coverage gaps · `<scope>`

> 🔴 **3 gaps worth closing** · 1 high · 2 medium risk
> Overall `78.4%` statements / `61.2%` branches · `coverage/coverage-final.json`

| # | Risk | Where | What breaks silently | Coverage | Suggested tests |
| :-: | :-: | --- | --- | --- | --- |
| 1 | 🔴 | `src/orders/refund-order.ts:41` | Refund guard never tested — an unsettled order can be refunded | 82% / 40% · 9 commits in 90 days | refuses an unsettled order; refunds a settled one once |
| 2 | 🟡 | `src/users/schema.ts` | Email schema accepts anything after a `+` | 100% / 50% | rejects `a+@b`; accepts `a+tag@b.co` |

### 1 · 🔴 Refund guard never tested

Untested: the `status !== "settled"` branch (lines 41–48) and the `catch` that swallows the
payment provider error (line 63).

**Deliberately excluded:** `src/legacy/adapter.ts` — unreachable since the v2 flag · `src/generated/**` — generated

**Next:** run `/unit-testing` (or the `unit-tester` agent) for gap 1 first, rather than all at once.
````

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 8 note(s) (sha256 dccbe2275acb); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| high | [List findings in one numbered table, worst first](references/rules.md#list-findings-in-one-numbered-table-worst-first) — Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on. | any |
| high | [Mark every status with the shared five-mark scale](references/rules.md#mark-every-status-with-the-shared-five-mark-scale) — 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike. | any |
| high | [Open an audit report with a verdict line that quotes the tool's own summary](references/rules.md#open-an-audit-report-with-a-verdict-line-that-quotes-the-tools-own-summary) — First line is the worst status, the count at each severity, and the checking tool's summary line as evidence. | any |
| medium | [Show a scorecard when the audit covers a fixed set of areas](references/rules.md#show-a-scorecard-when-the-audit-covers-a-fixed-set-of-areas) — One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line. | any |
| medium | [Give a detail block only to findings whose fix will not fit the table, at most five](references/rules.md#give-a-detail-block-only-to-findings-whose-fix-will-not-fit-the-table-at-most-five) — Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding. | any |
| medium | [Close an audit report with what was not checked and the one next step](references/rules.md#close-an-audit-report-with-what-was-not-checked-and-the-one-next-step) — A Not checked line names what the run could not see; a Next line says what the user does now. | any |
| medium | [Report a clean run as the heading and one line](references/rules.md#report-a-clean-run-as-the-heading-and-one-line) — When nothing was found, skip the scorecard, the table and any list of what passed. | any |
| low | [Write reports in GitHub-flavoured Markdown without HTML](references/rules.md#write-reports-in-github-flavoured-markdown-without-html) — Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour. | any |

<!-- END:knowledge -->

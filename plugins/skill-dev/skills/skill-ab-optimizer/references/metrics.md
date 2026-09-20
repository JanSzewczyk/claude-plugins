# A/B Optimizer — Metrics & Scoring Rubric

## Overview

Each skill invocation is scored 0–100 across 5 dimensions (20 pts each).  
Final score = weighted sum (equal weights by default, adjustable per skill type).

---

## Dimension 1: Accuracy (20 pts)

**Question:** Does the output do what the skill claims to do?

| Score | Criteria |
|-------|----------|
| 18–20 | Output fully satisfies the test case's expected behavior with no errors |
| 13–17 | Output satisfies core expectation but misses minor details |
| 8–12  | Output partially correct; core intent addressed but significant gaps |
| 3–7   | Output tangentially related but fails to solve the actual task |
| 0–2   | Output wrong, hallucinated, or completely off-target |

---

## Dimension 2: Completeness (20 pts)

**Question:** Are all required steps, outputs, or components present?

| Score | Criteria |
|-------|----------|
| 18–20 | Every required element present; nothing missing |
| 13–17 | One minor element missing or underdeveloped |
| 8–12  | Multiple elements missing; output usable but incomplete |
| 3–7   | Core elements present but supporting material absent |
| 0–2   | Major components missing; output not usable as-is |

---

## Dimension 3: Conciseness (20 pts)

**Question:** Is the output free of unnecessary verbosity, repetition, or filler?

| Score | Criteria |
|-------|----------|
| 18–20 | Every sentence adds value; no repetition or padding |
| 13–17 | Slightly verbose in 1–2 sections but acceptable |
| 8–12  | Noticeable filler; key content buried in noise |
| 3–7   | Excessive repetition or preamble; hard to extract signal |
| 0–2   | Output is mostly noise; signal-to-noise ratio very low |

---

## Dimension 4: Tool Efficiency (20 pts)

**Question:** Did the skill use the minimal necessary tool calls without redundancy?

| Score | Criteria |
|-------|----------|
| 18–20 | Optimal tool sequence; no unnecessary reads/writes/searches |
| 13–17 | 1–2 redundant calls but overall efficient |
| 8–12  | Several unnecessary calls (e.g., re-reading the same file) |
| 3–7   | Many redundant or irrelevant tool calls; poor planning |
| 0–2   | Chaotic tool usage; loops, dead ends, or broken sequences |

---

## Dimension 5: Consistency (20 pts)

**Question:** Does the skill produce stable, predictable output for equivalent inputs?

> Measure by running the same test case 3x and comparing outputs.

| Score | Criteria |
|-------|----------|
| 18–20 | Outputs are structurally identical across runs; minor wording variation only |
| 13–17 | Same structure, minor content differences in 1 run out of 3 |
| 8–12  | Noticeable structural variation across runs |
| 3–7   | Outputs differ significantly; skill is non-deterministic |
| 0–2   | Completely different outputs each run; no predictability |

---

## Composite Score

```
Total = Accuracy + Completeness + Conciseness + Tool Efficiency + Consistency
Range = 0 – 100
```

### Interpretation

| Score | Grade | Action |
|-------|-------|--------|
| 90–100 | Excellent | Skill is production-ready; minor polish only |
| 75–89  | Good | Skill works well; 1–2 targeted improvements possible |
| 60–74  | Acceptable | Skill functional but has clear optimization opportunities |
| 40–59  | Needs Work | Multiple dimensions underperforming; 3+ rounds needed |
| 0–39   | Poor | Skill requires significant rework; consider rebuilding |

---

## Custom Weights (Advanced)

For skills where certain dimensions matter more, override weights in the run command:

```
/skill-ab-optimizer optimize <skill> \
  --weight-accuracy 30 \
  --weight-completeness 30 \
  --weight-conciseness 10 \
  --weight-tools 10 \
  --weight-consistency 20
```

**Example use cases:**
- **Code generation skills** → weight Accuracy + Tool Efficiency higher
- **Documentation skills** → weight Completeness + Conciseness higher
- **Agentic pipeline skills** → weight Consistency + Tool Efficiency higher

---

## Auto Research Threshold Guide

| Skill Maturity | Recommended Threshold |
|---------------|----------------------|
| Brand new skill | +3 pts (accept small wins) |
| Established skill | +5 pts (default) |
| High-traffic / critical skill | +8 pts (be conservative) |
| Experimental skill | +2 pts (move fast) |

---
name: skill-ab-optimizer
version: 1.0.0
lastUpdated: 2026-04-21
description: Continuously tests and improves Claude Code skills using A/B experimentation and Auto Research ML loop. Provides quantitative metrics on skill effectiveness and automatically approves only changes that improve outcomes.
tags: [skills, optimization, a/b-testing, auto-research, skill-creator, metrics, ml]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch, TodoWrite
context: fork
agent: general-purpose
user-invocable: true
examples:
  - Run A/B test on the unit-testing skill
  - Optimize the react-doctor skill and measure improvements
  - Which version of this skill performs better?
  - Benchmark skill-ab-optimizer against baseline
  - Auto-optimize all skills in the code-quality plugin
---

# Skill A/B Optimizer

Automates A/B testing and continuous improvement of Claude Code skills. Instead of guessing whether a skill modification actually helps, this skill provides hard quantitative data — and uses the **Auto Research** ML loop to automatically approve only changes that measurably improve outcomes.

> **Reference Files:**
>
> - [workflow.md](./workflow.md) — Full A/B testing lifecycle and phase breakdown
> - [metrics.md](./metrics.md) — Metric definitions, scoring rubrics, and evaluation criteria
> - [examples.md](./examples.md) — Practical examples and real optimization runs

---

## Core Problem This Solves

When creating or modifying a skill you have **no quantitative feedback**:
- Does the new prompt actually produce better results?
- Is the reorganized SKILL.md clearer than the original?
- Did adding an examples file improve accuracy?

Manual experimentation is slow, biased, and non-reproducible. This skill closes that loop.

---

## Quick Start

### 1. Target a skill to optimize

```
/skill-ab-optimizer optimize plugins/testing/skills/unit-testing
```

### 2. Run a head-to-head comparison

```
/skill-ab-optimizer compare plugins/testing/skills/unit-testing plugins/testing/skills/unit-testing-v2
```

### 3. Full auto-optimize loop

```
/skill-ab-optimizer auto plugins/code-quality/skills/performance-optimization --iterations 5
```

---

## How It Works (High Level)

```
[Skill A: Current] ──┐
                     ├──► [Test Suite: N prompts] ──► [Scorer] ──► [Winner]
[Skill B: Variant] ──┘                                    │
                                                          ▼
                                              [Auto Research Loop]
                                                  - If B > A: promote B
                                                  - If A >= B: discard B
                                                  - Generate next variant
```

The **Auto Research** loop repeats until either:
- A skill variant exceeds the improvement threshold (default: +10%)
- The iteration cap is reached (default: 5)
- No further improvement is detected for 2 consecutive rounds

---

## Key Concepts

### Variant Generation
Each variant modifies one dimension at a time (controlled experimentation):
- Prompt clarity and structure
- Example quantity and quality
- Reference file organization
- Frontmatter tag coverage
- Step-by-step instruction depth

### Scoring
Each variant is scored across 5 dimensions (see [metrics.md](./metrics.md)):
1. **Accuracy** — Does output match expected behavior?
2. **Completeness** — Are all required steps covered?
3. **Conciseness** — Is the output free of noise?
4. **Tool efficiency** — Minimal unnecessary tool calls?
5. **Consistency** — Same input → same output quality?

### Auto Research Integration
Uses an ML-inspired hill-climbing algorithm:
- Starts from current skill as baseline
- Generates variants via targeted mutations
- Scores each variant against the test suite
- Retains improvements, discards regressions
- Documents winning changes with delta scores

---

## Workflow Summary

| Phase | Action | Output |
|-------|--------|--------|
| 1. Baseline | Run test suite against current skill | Baseline score (0–100) |
| 2. Mutation | Generate 1–3 variants with targeted changes | Candidate SKILL.md files |
| 3. Evaluation | Run same test suite against each variant | Score per variant |
| 4. Decision | Compare scores, apply threshold | Keep or discard |
| 5. Iteration | Repeat from step 2 with winner as new baseline | Improvement log |
| 6. Report | Summarize all rounds, final delta | Markdown report |

See [workflow.md](./workflow.md) for the full phase-by-phase breakdown.

---

## Integration with Skill Creator

This skill is designed to work alongside the **skill-creator** skill (from Anthropic marketplace):

- Use **skill-creator** to scaffold the initial skill structure
- Use **skill-ab-optimizer** to iteratively improve it with data
- The optimizer reads the skill-creator's output format natively

```
skill-creator → initial SKILL.md → skill-ab-optimizer → optimized SKILL.md
```

---

## Best Practices

1. **One dimension at a time** — Don't change prompt AND examples in the same variant; you won't know what worked
2. **Minimum 10 test prompts** — Fewer leads to high variance in scores
3. **Use real invocations** — Test prompts should match actual user queries from your codebase
4. **Document every run** — Append results to `optimization-log.md` in the skill directory
5. **Set a threshold** — Don't promote variants with < 5% improvement; noise can fool you

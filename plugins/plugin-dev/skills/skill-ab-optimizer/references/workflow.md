# A/B Optimizer — Full Workflow

## Phase 0: Setup & Discovery

Before running any tests, read the target skill:

```bash
# Discover skill structure
ls plugins/<plugin>/<skills>/<target-skill>/

# Read main skill file
cat plugins/<plugin>/skills/<target-skill>/SKILL.md

# Read all reference files
cat plugins/<plugin>/skills/<target-skill>/*.md
```

Identify:
- What the skill claims to do (description + examples in frontmatter)
- Which tools it uses (`allowed-tools`)
- Which reference files support it

---

## Phase 1: Build the Test Suite

Create `test-suite.md` in a temp directory (or in-memory). A good test suite has:

### Structure
```markdown
# Test Suite: <skill-name>

## Test Case 1
**Input prompt:** "..."
**Expected behavior:** "..."
**Pass criteria:** [bullet list of observable outcomes]

## Test Case 2
...
```

### Guidelines
- Minimum 10 test cases, ideally 15–20
- Cover edge cases, not just happy paths
- Include at least 2 cases from the skill's own `examples:` frontmatter
- Include at least 3 cases that are adjacent (near-miss queries users might try)
- Include 1–2 adversarial cases (prompts that should gracefully fail or redirect)

---

## Phase 2: Baseline Evaluation

Run the test suite against the **current, unmodified** skill:

1. For each test case, invoke Claude using the skill's context
2. Score each output using the rubric in [metrics.md](./metrics.md)
3. Calculate: `baseline_score = mean(all test case scores)`

Record in optimization log:
```
Round 0 (Baseline): score = XX.X / 100
```

---

## Phase 3: Variant Generation

Generate **one** variant per round. Choose a single mutation dimension:

| Mutation Type | What Changes | When to Use |
|---------------|-------------|-------------|
| `clarity` | Rewrite ambiguous instructions in SKILL.md | Score low on Accuracy |
| `examples` | Add/improve example cases | Score low on Completeness |
| `structure` | Reorganize sections, add headers | Score low on Consistency |
| `conciseness` | Remove filler, tighten prose | Score low on Conciseness |
| `tools` | Add/remove allowed-tools | Score low on Tool Efficiency |
| `references` | Add a new reference file | Coverage gap identified |

Save variant as `SKILL-v<N>.md` (never overwrite the original during testing).

---

## Phase 4: Variant Evaluation

Run the **same test suite** against the variant:

1. Use identical test cases and scoring rubric
2. Score each output
3. Calculate: `variant_score = mean(all test case scores)`

Record in optimization log:
```
Round N (Variant: <mutation-type>): score = XX.X / 100
Delta: +X.X / -X.X
```

---

## Phase 5: Decision Gate

```
if variant_score > baseline_score + threshold:
    → PROMOTE: replace SKILL.md with variant
    → new baseline = variant_score
    → log: "✅ Promoted [mutation-type] — delta: +X.X"
else:
    → DISCARD: delete variant file
    → baseline unchanged
    → log: "❌ Discarded [mutation-type] — delta: X.X (below threshold)"
```

**Default threshold:** +5 points (out of 100)  
**Configurable via:** `--threshold <N>` flag

---

## Phase 6: Auto Research Loop

Repeat Phases 3–5 up to `--iterations N` times (default: 5).

Early stopping conditions:
- Two consecutive rounds with no improvement → stop
- Variant score exceeds `baseline + 20` in single round → stop and promote immediately (strong signal)
- All mutation dimensions have been tried → stop

---

## Phase 7: Final Report

Generate a Markdown report: `optimization-report-<date>.md`

```markdown
# Optimization Report: <skill-name>
Date: YYYY-MM-DD
Iterations: N
Baseline Score: XX.X
Final Score: XX.X
Total Delta: +X.X (+X%)

## Changes Promoted
1. [Round 2] clarity mutation: +8.2 pts
2. [Round 4] examples mutation: +3.7 pts

## Changes Discarded
- [Round 1] structure mutation: -1.2 pts
- [Round 3] conciseness mutation: +2.1 pts (below threshold)
- [Round 5] tools mutation: 0.0 pts

## Recommendation
[Summary of what worked and why]
```

Append summary row to `optimization-log.md` in the skill directory.

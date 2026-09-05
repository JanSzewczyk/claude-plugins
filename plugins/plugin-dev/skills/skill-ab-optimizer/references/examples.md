# A/B Optimizer — Examples

## Example 1: Optimizing the unit-testing skill

**Goal:** Improve the `unit-testing` skill's accuracy for React hook tests.

**Initial run:**
```
/skill-ab-optimizer optimize plugins/testing/skills/unit-testing
```

**Round 0 — Baseline:**
- Test suite: 12 prompts about writing unit tests
- Baseline score: 61.4 / 100
- Weak dimensions: Accuracy (11/20), Completeness (10/20)

**Round 1 — Mutation: `clarity`**
- Changed: Rewrote the "React hooks" section to include explicit `renderHook` usage
- Variant score: 68.8 / 100
- Delta: +7.4 → ✅ PROMOTED

**Round 2 — Mutation: `examples`**
- Changed: Added 4 new real-world test cases covering async hooks
- Variant score: 74.1 / 100
- Delta: +5.3 → ✅ PROMOTED

**Round 3 — Mutation: `structure`**
- Changed: Moved "Common Pitfalls" section to the top
- Variant score: 73.9 / 100
- Delta: -0.2 → ❌ DISCARDED

**Final Result:**
- Final score: 74.1 / 100 (+12.7, +20.7%)
- 2 changes promoted, 1 discarded

---

## Example 2: Head-to-head comparison

**Goal:** Compare two independently written versions of a skill.

```
/skill-ab-optimizer compare \
  plugins/code-quality/skills/performance-optimization \
  plugins/code-quality/skills/performance-optimization-v2
```

**Output:**
```
Skill A (current):  72.3 / 100
Skill B (v2):       79.1 / 100

Winner: Skill B (+6.8 pts)
Recommendation: Promote v2 as the new canonical version.

Breakdown:
  Accuracy:         A=15  B=17  (+2)
  Completeness:     A=14  B=16  (+2)
  Conciseness:      A=13  B=15  (+2)
  Tool Efficiency:  A=16  B=16  (=)
  Consistency:      A=14  B=15  (+1)
```

---

## Example 3: Full auto-optimize loop

**Goal:** Let the optimizer run 5 iterations unattended and report back.

```
/skill-ab-optimizer auto \
  plugins/product-management/skills/prd-spec \
  --iterations 5 \
  --threshold 5 \
  --report
```

**Auto Research Loop log:**
```
[R1] Mutation: clarity     → +9.1 pts ✅ PROMOTED  (new baseline: 68.4)
[R2] Mutation: examples    → +4.2 pts ❌ DISCARDED (below threshold)
[R3] Mutation: conciseness → +6.7 pts ✅ PROMOTED  (new baseline: 75.1)
[R4] Mutation: structure   → +1.1 pts ❌ DISCARDED
[R5] Mutation: references  → +3.8 pts ❌ DISCARDED
Early stop: 2 consecutive discards in rounds 4–5.

Final score: 75.1 / 100 (baseline was 59.3, delta +15.8, +26.6%)
Report saved: prd-spec/optimization-report-2026-04-21.md
```

---

## Example 4: Skill Creator integration

**Step 1:** Use skill-creator to scaffold a new skill
```
/skill-creator create "firebase-emulator-setup"
```

**Step 2:** Immediately run A/B optimizer to establish baseline
```
/skill-ab-optimizer optimize plugins/firebase/skills/firebase-emulator-setup
```

**Step 3:** Use optimizer output to guide next skill-creator iteration
```
# Optimizer found Accuracy = 9/20 due to missing auth emulator instructions
/skill-creator improve plugins/firebase/skills/firebase-emulator-setup \
  --focus "auth emulator configuration"
```

**Step 4:** Re-run optimizer to confirm improvement
```
/skill-ab-optimizer optimize plugins/firebase/skills/firebase-emulator-setup
# Expected: Accuracy improves from 9 → 16+
```

---

## Example 5: Reading the optimization log

After several runs, a skill directory may contain:

```
skills/unit-testing/
  SKILL.md                          # Current best version
  optimization-log.md               # All runs summary
  optimization-report-2026-04-18.md # Full report from run 1
  optimization-report-2026-04-21.md # Full report from run 2
```

`optimization-log.md` format:
```markdown
| Date       | Baseline | Final | Delta  | Rounds | Changes |
|------------|----------|-------|--------|--------|---------|
| 2026-04-18 | 61.4     | 74.1  | +12.7  | 3      | 2       |
| 2026-04-21 | 74.1     | 79.8  | +5.7   | 4      | 1       |
```

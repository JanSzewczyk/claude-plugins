---
title: Give a detail block only to findings whose fix will not fit the table, at most five
summary: Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding.
impact: medium
---

## Rule

Below the findings table, add a `### <n> · <mark> <claim>` block with the quoted evidence and a
diff or before/after only for 🔴 and 🟡 findings whose fix does not fit in the `Fix` cell. Write at
most five, choosing the findings that cost the reader most; findings on the same lines share one
block (`### 1–3 · 🟡 …`). Every other fix is written out when it is applied.

## Why

A diff under every finding makes the report longer than the thing it audits, and the reader gives
up before reaching the findings that matter.

---
name: lighthouse-audit
description: Automated Lighthouse audit for Next.js apps. Builds the production app, runs @lhci/cli across key URLs, scores all five categories, and produces a prioritized fix plan mapped to concrete Next.js code changes.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[url1,url2,...] [--no-build] [--categories performance,accessibility,seo,best-practices,pwa]"
---

# Lighthouse Audit Skill

Automated Lighthouse audit with full report and prioritized Next.js fix plan.

> **Reference Files:**
>
> - [report-analysis.md](./references/report-analysis.md) — JSON structure, score thresholds, metric descriptions
> - [fix-mapping.md](./references/fix-mapping.md) — Audit ID → Next.js fix mapping

## Overview

This skill runs in the **target Next.js project** (not in the plugin repo). It:

1. Builds the production app
2. Runs Lighthouse via `@lhci/cli` with a generated config
3. Parses JSON reports from `.lighthouseci/`
4. Produces a report: scores per URL, Core Web Vitals and ranked fixes

## Step-by-Step Protocol

### Step 1 — Detect project configuration

Read `package.json` and extract:
- `scripts.build` — command to build (typically `next build`)
- `scripts.start` — command to start production server (typically `next start`)
- Default port — scan scripts for `-p <port>` flag, default to `3000`

If `package.json` is missing or has no `build`/`start` scripts, stop and ask the user.

### Step 2 — Determine target URLs

**If URL argument provided:** use it directly.

**If no argument:**
- Default to `http://localhost:<port>/` (homepage)
- Also check if common routes exist by scanning `app/` directory for top-level directories (e.g. `app/dashboard/` → add `/dashboard`)
- Limit to max 5 URLs to keep audit time reasonable

**Production URL (no `localhost`):**
- Skip Steps 3–4 (no build or server needed)
- Jump directly to Step 5

### Step 3 — Build production app (localhost only)

```bash
npm run build
```

This step is mandatory for valid performance scores. A dev build produces
unminified bundles with source maps and dev overlays — results would be
meaningless. If build fails, report the error and stop.

**Skip this step if `--no-build` flag was passed** (assumes server is already running).

### Step 4 — Write `lighthouserc.json`

Write a config file to the project root. Use `startServerCommand: "npm start"` so
`lhci` handles server lifecycle. Do **not** include `assert` — the skill performs
its own analysis rather than relying on lhci's pass/fail gate.

```json
{
  "ci": {
    "collect": {
      "url": ["<url1>", "<url2>"],
      "startServerCommand": "npm start",
      "startServerReadyPattern": "Ready|started server on|listening on",
      "startServerReadyTimeout": 30000,
      "numberOfRuns": 3,
      "settings": {
        "chromeFlags": "--no-sandbox --headless=new",
        "onlyCategories": ["performance", "accessibility", "best-practices", "seo", "pwa"]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": ".lighthouseci"
    }
  }
}
```

Adjust `url` array and `onlyCategories` based on user's argument.
If `--no-build` was passed, remove `startServerCommand` (server already running).

### Step 5 — Run the audit

```bash
npx --yes @lhci/cli@latest autorun --config=lighthouserc.json
```

Always append `|| true` or use `; echo "exit:$?"` to capture the exit code
without aborting the pipeline — lhci exits non-zero when scores fall below
any threshold, which is exactly the case we want to analyze.

```bash
npx --yes @lhci/cli@latest autorun --config=lighthouserc.json; LHCI_EXIT=$?
echo "lhci exit code: $LHCI_EXIT"
```

After the run, verify `.lighthouseci/` directory was created:

```bash
ls .lighthouseci/
```

### Step 6 — Parse reports

Reports land in `.lighthouseci/lhr-<timestamp>-<hash>.json` — one file per
URL per run. When `numberOfRuns: 3`, lhci also writes a `manifest.json`
that identifies the median run per URL.

Read `manifest.json`:
```bash
cat .lighthouseci/manifest.json
```

For each URL, find the `representative: true` entry — that's the median run.
Read its corresponding `lhr-*.json` file for analysis.

See [report-analysis.md](./references/report-analysis.md) for the full JSON structure and
how to extract scores and failing audits.

### Step 7 — Map failing audits to fixes

For every failing audit (score < 0.9), find the concrete Next.js fix in
[fix-mapping.md](./references/fix-mapping.md), and keep the elements or resources Lighthouse
flagged in its `details` field — they say where the fix goes. Rank them by estimated impact: the
metric's weight in the category score times how far it misses the target.

### Step 8 — Write the report

Follow the reporting rules indexed at the end of this step. For a Lighthouse run:

- **Marks:** Lighthouse's own thresholds — 🟢 ≥ 90 · 🟡 50–89 · 🔴 < 50 — and ⚪ for a category
  not audited. A finding takes the mark of the category it pulls down.
- **Verdict:** the worst category score across all URLs, with the median run as evidence.
- **Scorecard:** one row per URL, one column per category, then the Core Web Vitals of the main
  URL against their targets.
- **Findings:** one row per failing audit, ranked by impact, with the value Lighthouse measured
  and the fix from Step 7. A detail block shows the code change for the few that need one.
- **Next:** re-run `/lighthouse-audit` after the 🔴 items.

````markdown
## 🩺 Lighthouse audit · `localhost:3000` · <date>

> 🔴 **Performance 46 on /products** · 1 red · 2 yellow categories · median of 3 runs
> `lhci autorun`: 3 URLs · 9 runs

| URL | Performance | Accessibility | Best Practices | SEO | PWA |
| --- | :-: | :-: | :-: | :-: | :-: |
| / | 🟢 94 | 🟡 78 | 🟢 92 | 🟢 98 | ⚪ |
| /products | 🔴 46 | 🟢 91 | 🟡 83 | 🟢 95 | ⚪ |

| Metric | Value | Target | Status |
| --- | --- | --- | :-: |
| LCP | 3.2 s | < 2.5 s | 🔴 |
| CLS | 0.14 | < 0.1 | 🟡 |
| INP | 180 ms | < 200 ms | 🟢 |

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🔴 | `/products` · `app/products/page.tsx` | LCP 3.2 s: hero `<img src="/hero.jpg">` loads late | `priority` on the hero `<Image>` |
| 2 | 🟡 | `/` · `app/layout.tsx` | CLS 0.14 from the web font swap | `display: "swap"` in `next/font` |
| 3 | 🟡 | `/` | Missing `<meta name="description">` | Export `metadata.description` |

**Not checked:** PWA (not configured) · authenticated pages

**Next:** fix 1, then re-run `/lighthouse-audit`.
````

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 8 note(s) (sha256 f18733f9ef03); edit the notes in knowledge/, then run build -->

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

### Step 9 — Cleanup

Remove the generated `lighthouserc.json` from the project root (it's ephemeral):

```bash
rm lighthouserc.json
```

Leave `.lighthouseci/` in place — the user may want to browse the HTML reports
there. Remind them to add `.lighthouseci` to `.gitignore`.

## Argument Reference

| Argument | Default | Description |
|----------|---------|-------------|
| `url1,url2,...` | auto-detected from `app/` | Comma-separated URLs to audit |
| `--no-build` | off | Skip `npm run build` (server already running) |
| `--categories` | all five | Comma-separated: `performance,accessibility,best-practices,seo,pwa` |

## Related Skills

- `performance-optimization` — Bundle analysis, React rendering, database queries, and Next.js-specific fixes referenced in the report
- `accessibility-audit` — Deep manual accessibility review beyond Lighthouse's automated checks
- `playwright-cli` — Browser automation for auditing pages behind authentication

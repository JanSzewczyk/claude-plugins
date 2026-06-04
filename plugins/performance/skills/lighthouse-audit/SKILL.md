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
> - [report-analysis.md](./report-analysis.md) — JSON structure, score thresholds, metric descriptions
> - [fix-mapping.md](./fix-mapping.md) — Audit ID → Next.js fix mapping

## Overview

This skill runs in the **target Next.js project** (not in the plugin repo). It:

1. Builds the production app
2. Runs Lighthouse via `@lhci/cli` with a generated config
3. Parses JSON reports from `.lighthouseci/`
4. Produces a scored summary and a prioritized action plan

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

See [report-analysis.md](./report-analysis.md) for the full JSON structure and
how to extract scores and failing audits.

### Step 7 — Generate the report

Produce a Markdown report structured as follows:

```
## Lighthouse Audit Report — <date>

### Scores Summary

| URL | Performance | Accessibility | Best Practices | SEO | PWA |
|-----|-------------|---------------|----------------|-----|-----|
| /   | 🟢 94       | 🟡 78         | 🟢 92          | 🟢 98 | ⚫ N/A |

Legend: 🟢 ≥ 90 · 🟡 50–89 · 🔴 < 50 · ⚫ not audited

### Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP    | 3.2 s | < 2.5 s | 🔴 |
| FCP    | 1.4 s | < 1.8 s | 🟢 |
| CLS    | 0.14  | < 0.1  | 🟡 |
| INP    | 180 ms | < 200 ms | 🟢 |
| TTFB   | 420 ms | < 800 ms | 🟢 |

### Failing Audits

Group by category. For each failing audit include:
- Audit title
- Current value / score
- Brief description of impact
- Specific elements or resources flagged by Lighthouse (from `details` field)
```

### Step 8 — Generate action plan

For every failing audit (score < 0.9), map it to a concrete Next.js fix using
[fix-mapping.md](./fix-mapping.md).

Structure the plan as a prioritized checklist:

```
## Action Plan

Sorted by estimated impact (high → low). Check each item after fixing and re-run
the audit to verify improvement.

### 🔴 High Impact

- [ ] **LCP too slow (3.2 s)** — Add `priority` prop to the hero `<Image>` in
  `app/(home)/page.tsx`. LCP element: `<img src="/hero.jpg">` flagged at line …
  Reference: `performance-optimization` skill → Core Web Vitals section.

### 🟡 Medium Impact

- [ ] **CLS: layout shift from web font** — Add `display: 'swap'` to `next/font`
  config and ensure font subsets are loaded. See `layout.tsx`.

### ℹ️ Low Impact / Best Practices

- [ ] **Missing `<meta name="description">`** — Add `metadata.description` export
  to each page's `page.tsx`. See Next.js Metadata docs.
```

Finish by suggesting: `Re-run /lighthouse-audit after addressing high-impact items.`

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

- `performance-optimization` — Bundle analysis, React rendering, database queries, and Next.js-specific fixes referenced in the action plan
- `accessibility-audit` — Deep manual accessibility review beyond Lighthouse's automated checks
- `playwright-cli` — Browser automation for auditing pages behind authentication

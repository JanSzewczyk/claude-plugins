# Lighthouse Report Analysis

How to read and interpret the `lhr-*.json` files produced by `@lhci/cli`.

## File Locations

After `lhci autorun`, reports land in `.lighthouseci/`:

```
.lighthouseci/
  manifest.json          ← index of all runs, marks median per URL
  lhr-<ts>-<hash>.json   ← full report per run
  report-<hash>.html     ← optional HTML report
```

### Reading `manifest.json`

```json
[
  {
    "url": "http://localhost:3000/",
    "isRepresentativeRun": true,
    "htmlPath": ".lighthouseci/report-abc123.html",
    "jsonPath": ".lighthouseci/lhr-1748690000000-abc123.json",
    "summary": {
      "performance": 0.94,
      "accessibility": 0.78,
      "best-practices": 0.92,
      "seo": 0.98
    }
  },
  ...
]
```

Filter `isRepresentativeRun: true` entries — these are the median runs used for scoring.

## LHR JSON Structure

```json
{
  "lighthouseVersion": "12.x.x",
  "fetchTime": "2026-05-31T10:00:00.000Z",
  "requestedUrl": "http://localhost:3000/",

  "categories": {
    "performance":     { "score": 0.94, "title": "Performance" },
    "accessibility":   { "score": 0.78, "title": "Accessibility" },
    "best-practices":  { "score": 0.92, "title": "Best Practices" },
    "seo":             { "score": 0.98, "title": "SEO" },
    "pwa":             { "score": 0.40, "title": "Progressive Web App" }
  },

  "audits": {
    "largest-contentful-paint": {
      "id": "largest-contentful-paint",
      "title": "Largest Contentful Paint",
      "description": "...",
      "score": 0.56,
      "scoreDisplayMode": "numeric",
      "numericValue": 3200,
      "displayValue": "3.2 s",
      "details": { ... }
    },
    ...
  }
}
```

## Score Thresholds

| Range | Status | Emoji |
|-------|--------|-------|
| ≥ 0.90 | Pass | 🟢 |
| 0.50 – 0.89 | Needs work | 🟡 |
| < 0.50 | Failing | 🔴 |
| `null` | Not applicable | ⚫ |

Multiply score × 100 to get the 0–100 display value.

## Core Web Vitals — Key Audits

| Audit ID | Metric | Good | Needs Improvement | Poor |
|----------|--------|------|--------------------|------|
| `largest-contentful-paint` | LCP | < 2.5 s | 2.5–4 s | > 4 s |
| `first-contentful-paint` | FCP | < 1.8 s | 1.8–3 s | > 3 s |
| `cumulative-layout-shift` | CLS | < 0.1 | 0.1–0.25 | > 0.25 |
| `interaction-to-next-paint` | INP | < 200 ms | 200–500 ms | > 500 ms |
| `total-blocking-time` | TBT (lab proxy for INP) | < 200 ms | 200–600 ms | > 600 ms |
| `speed-index` | Speed Index | < 3.4 s | 3.4–5.8 s | > 5.8 s |
| `server-response-time` | TTFB | < 800 ms | — | > 800 ms |
| `time-to-interactive` | TTI | < 3.8 s | 3.8–7.3 s | > 7.3 s |

## Extracting Failing Audits

To list all audits with `score < 0.9` for a given LHR file, use:

```bash
node -e "
  const lhr = JSON.parse(require('fs').readFileSync('.lighthouseci/lhr-XXX.json', 'utf8'));
  const failing = Object.values(lhr.audits)
    .filter(a => a.score !== null && a.score < 0.9)
    .sort((a, b) => a.score - b.score)
    .map(a => ({ id: a.id, score: Math.round(a.score * 100), display: a.displayValue }));
  console.log(JSON.stringify(failing, null, 2));
"
```

## Audit `details` Field

Many audits include a `details` object with the specific resources/elements to fix:

```json
"render-blocking-resources": {
  "score": 0.5,
  "details": {
    "type": "opportunity",
    "items": [
      { "url": "/_next/static/css/main.css", "totalBytes": 45000, "wastedMs": 320 }
    ]
  }
}
```

```json
"unused-javascript": {
  "details": {
    "type": "table",
    "items": [
      { "url": "/_next/static/chunks/vendor.js", "wastedBytes": 125000 }
    ]
  }
}
```

Always extract and include these `items` in the action plan — they pinpoint
the exact files/elements to fix.

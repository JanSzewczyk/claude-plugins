# performance

Web performance auditing — automated Lighthouse analysis, Core Web Vitals scoring, and prioritized fix planning for Next.js applications.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **lighthouse-audit** | `/lighthouse-audit` | Build production app, run Lighthouse via `@lhci/cli`, score all five categories, generate a prioritized Next.js fix plan |

## Installation

```bash
cp -r plugins/performance/skills/*  your-project/.claude/skills/
```

## Usage

```bash
# Audit homepage (auto-detects port, builds production app)
/lighthouse-audit

# Audit specific routes
/lighthouse-audit http://localhost:3000/dashboard,http://localhost:3000/products

# Skip build — server already running
/lighthouse-audit --no-build

# Audit production deployment
/lighthouse-audit https://my-app.vercel.app --no-build

# Limit to specific categories
/lighthouse-audit --categories performance,accessibility
```

## How It Works

1. **Detect** — reads `package.json` scripts, finds `build`/`start` commands and port
2. **Build** — runs `npm run build` for a valid production audit (dev scores are meaningless)
3. **Configure** — writes a temporary `lighthouserc.json` with `@lhci/cli` settings
4. **Audit** — `lhci autorun` starts the production server, runs Lighthouse 3× per URL, reports median
5. **Analyze** — parses `.lighthouseci/lhr-*.json`, extracts scores and failing audits with flagged elements
6. **Report** — scored summary table + Core Web Vitals table + failing audits grouped by category
7. **Plan** — prioritized action checklist mapping each failing audit to a concrete Next.js code fix

## Output Example

```
## Lighthouse Audit Report — 2026-05-31

### Scores Summary
| URL           | Performance | Accessibility | Best Practices | SEO  | PWA |
|---------------|-------------|---------------|----------------|------|-----|
| /             | 🟢 94       | 🟡 78         | 🟢 92          | 🟢 98 | ⚫  |
| /dashboard    | 🟡 71       | 🟢 91         | 🟢 95          | 🟢 96 | ⚫  |

### Core Web Vitals (/)
| Metric | Value  | Target  | Status |
|--------|--------|---------|--------|
| LCP    | 3.2 s  | < 2.5 s | 🔴     |
| FCP    | 1.4 s  | < 1.8 s | 🟢     |
| CLS    | 0.14   | < 0.1   | 🟡     |

## Action Plan
### 🔴 High Impact
- [ ] LCP 3.2 s — Add `priority` to hero <Image> in app/(home)/page.tsx
- [ ] Dashboard performance 71 — Split heavy chart component with dynamic()

### 🟡 Medium Impact
- [ ] CLS 0.14 — Missing dimensions on /images/banner.png
- [ ] Accessibility 78 — 3 color contrast failures in Button variants
```

## Requirements

- Node.js 18+
- Chrome/Chromium installed (Lighthouse dependency)
- Next.js project with `build` and `start` scripts in `package.json`

## Troubleshooting

**Chrome not found:**
```bash
npx @puppeteer/browsers install chrome@stable
```

**`lhci` times out waiting for server:**
Increase `startServerReadyTimeout` in the generated `lighthouserc.json`, or start the server manually and use `--no-build`.

**Scores differ from PageSpeed Insights:**
Lighthouse CLI runs in a lab environment (simulated throttling). Real-world scores depend on hosting infrastructure and CDN. Use [PageSpeed Insights](https://pagespeed.web.dev) for field data (CrUX).

# Firecrawl — Bypassing Bot Protection

## When to Use

Firecrawl is an external scraping service that bypasses bot protection (Cloudflare, DataDome, PerimeterX, reCAPTCHA) on third-party websites. Use it when:

- `playwright-cli` gets redirected to a captcha or "Checking your browser" page
- The target is an **external** public website (not your own app)
- You need the rendered HTML of a JavaScript-heavy page that blocks headless browsers
- You want to test your UI against **real scraped content** from a live external source

> **Never needed for your own app.** Use `playwright-cli` directly for localhost or staging.

---

## Setup

```bash
npm install @mendable/firecrawl-js
# or
pip install firecrawl-py
```

Set your API key:
```bash
export FIRECRAWL_API_KEY=fc-...
```

---

## CLI Usage (Quick Scrape)

```bash
# Scrape a single URL and get markdown
npx firecrawl scrape https://example.com/pricing

# Crawl an entire site (limited depth)
npx firecrawl crawl https://example.com --max-depth 2

# Get structured data with schema
npx firecrawl extract https://example.com/pricing \
  --schema '{"plan_name": "string", "price": "number"}'
```

---

## Integration with Playwright Tests

### Pattern: Scrape → Validate locally

Use Firecrawl to get the page content, then validate the structure with Playwright assertions on a local mirror or against the API response.

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { test, expect } from '@playwright/test';

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

test('pricing page lists expected plans', async () => {
  // Firecrawl handles the bot-protected external page
  const result = await firecrawl.scrapeUrl('https://competitor.com/pricing', {
    formats: ['markdown', 'json'],
    jsonOptions: {
      schema: {
        type: 'object',
        properties: {
          plans: {
            type: 'array',
            items: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'string' } } }
          }
        }
      }
    }
  });

  expect(result.success).toBe(true);
  expect(result.json.plans.length).toBeGreaterThan(0);
  expect(result.json.plans[0]).toHaveProperty('name');
});
```

---

## Pattern: Firecrawl as Content Oracle

When you want to test your own UI against real external data:

```typescript
test('our import correctly parses competitor pricing', async ({ page }) => {
  // 1. Scrape external data with Firecrawl (bypasses bot protection)
  const scraped = await firecrawl.scrapeUrl('https://external-source.com/data');
  const externalContent = scraped.markdown;

  // 2. Feed that content to your app's import feature
  await page.goto('/import');
  await page.getByRole('textbox', { name: 'Paste content' }).fill(externalContent);
  await page.getByRole('button', { name: 'Import' }).click();

  // 3. Assert your app handled it correctly
  await expect(page.getByRole('status')).toContainText('Import successful');
});
```

---

## Why Playwright CLI Alone Gets Blocked

Headless browsers are detectable via:
- `navigator.webdriver` flag set to `true`
- Missing browser extensions typical of real users
- Unusual TLS fingerprints (JA3 hash)
- Mouse movement patterns (no human micro-movements)
- IP reputation (data center IPs vs residential)

Firecrawl routes requests through residential proxies and real browser instances with randomized fingerprints, making scraping undetectable.

---

## Cost Awareness

Firecrawl is a paid service. Use it only when `playwright-cli` is blocked:

| Firecrawl Plan | Credits/mo | Approx. pages |
|---------------|-----------|---------------|
| Hobby ($16)   | 3,000     | ~3,000 pages  |
| Standard ($83)| 100,000   | ~100,000 pages|

For your own apps: always use `playwright-cli` (free, no limits).

---

## Quick Decision Tree

```
Is the target page your own app (localhost / staging)?
  YES → Use playwright-cli directly. Firecrawl not needed.
  NO  → Does playwright-cli work on the external page?
          YES → Use playwright-cli.
          NO (blocked / captcha) → Use Firecrawl.
```

---
name: true-dom-tester
version: 1.0.0
lastUpdated: 2026-04-21
description: Generates and runs automated browser tests using Playwright CLI and the accessibility tree (DOM snapshot). Faster and cheaper than screenshot-based approaches. Uses semantic locators, real DOM structure, and optional Firecrawl for bot-protected pages.
tags: [testing, playwright, e2e, automation, dom, accessibility-tree, firecrawl, browser]
author: Szum Tech Team
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Bash(playwright-cli:*), Bash(npx playwright:*), TodoWrite
context: fork
agent: general-purpose
user-invocable: true
examples:
  - Generate E2E tests for the login flow
  - Test the checkout page and assert success state
  - Write Playwright tests for the /dashboard route
  - Scrape and test a bot-protected page with Firecrawl
  - Run all E2E tests and show me failures
---

# True DOM Automated Tester

Generates production-ready Playwright tests by navigating the real DOM using the **accessibility tree** — not screenshots. This approach is:

- **5–10× faster** than screenshot/vision-based test generation
- **Cheaper** — no image tokens, no vision model calls
- **More resilient** — semantic locators (`getByRole`, `getByLabel`) survive UI redesigns
- **Accessible by default** — any page element reachable by screen reader is testable

> **Reference Files:**
>
> - [accessibility-tree.md](./references/accessibility-tree.md) — What the DOM snapshot contains and how to read it
> - [test-patterns.md](./references/test-patterns.md) — Patterns for auth flows, forms, navigation, APIs
> - [firecrawl.md](./references/firecrawl.md) — Bypassing bot protection for external pages
> - [examples.md](./examples.md) — Full worked examples with generated test files

---

## Core Concept: Accessibility Tree vs Screenshots

| Approach | Speed | Cost | Resilience | Setup |
|----------|-------|------|------------|-------|
| **This skill (DOM snapshot)** | ⚡ Fast | 💚 Low | 💚 High | Simple |
| Screenshot / vision | 🐢 Slow | 🔴 High | 🟡 Medium | Complex |
| CSS selectors (manual) | ⚡ Fast | 💚 Low | 🔴 Fragile | Manual |

Instead of taking a screenshot and asking a vision model to identify buttons, this skill calls `playwright-cli snapshot` to get a **structured text representation** of every interactive element on the page — exactly what a screen reader would see.

```
# snapshot output example:
e1 [textbox "Email address"]
e2 [textbox "Password"]
e3 [checkbox "Remember me"]
e4 [button "Sign in"]
e5 [link "Forgot password?"]
```

Claude reads this tree directly and generates precise, semantic selectors.

---

## Quick Start

### Generate tests for a URL

```
/true-dom-tester generate https://myapp.com/login
```

### Generate tests for a local dev route

```
/true-dom-tester generate http://localhost:3000/checkout --name checkout-flow
```

### Run existing E2E tests

```
/true-dom-tester run
```

### Generate + run in one step

```
/true-dom-tester full https://myapp.com/signup --name signup-flow
```

---

## Workflow

### Phase 1 — Discovery

```bash
playwright-cli open <url>
playwright-cli snapshot        # Read the accessibility tree
playwright-cli network         # Check API calls on page load (optional)
```

Read the snapshot. Identify:
- All interactive elements (inputs, buttons, links, selects)
- Page sections and landmarks
- Dynamic content areas (loading states, modals)

### Phase 2 — Interaction Recording

Walk through the user flow step by step. Each `playwright-cli` action auto-generates the corresponding TypeScript line:

```bash
playwright-cli fill e1 "user@example.com"
# → await page.getByRole('textbox', { name: 'Email address' }).fill('user@example.com');

playwright-cli click e4
# → await page.getByRole('button', { name: 'Sign in' }).click();

playwright-cli snapshot        # Take snapshot after each major action to verify state change
```

### Phase 3 — Assertion Generation

After each significant action, read the new snapshot and add assertions for:
- URL changes (`toHaveURL`)
- Element visibility (`toBeVisible`)
- Text content (`toHaveText`)
- Element count (`toHaveCount`)
- Input values (`toHaveValue`)

### Phase 4 — Test File Assembly

Compile all generated code into a structured `.spec.ts` file:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://myapp.com/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email address' }).fill('user@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email address' }).fill('bad@email.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  });
});
```

### Phase 5 — Run & Fix

```bash
npx playwright test tests/e2e/<name>.spec.ts
```

If tests fail: read the error, re-open the page, re-snapshot, fix selectors or assertions.

---

## File Conventions

```
tests/
  e2e/
    <feature-name>.spec.ts      # Main test file
    auth/
      login.spec.ts
      signup.spec.ts
    checkout/
      checkout-flow.spec.ts
```

---

## Locator Priority (Best → Worst)

Always prefer locators in this order:

1. `getByRole('button', { name: 'Submit' })` — ARIA role + accessible name
2. `getByLabel('Email address')` — form label
3. `getByPlaceholder('Enter email')` — placeholder text
4. `getByText('Sign in')` — visible text
5. `getByTestId('submit-btn')` — data-testid attribute
6. `locator('#submit')` — CSS selector (**avoid unless nothing else works**)

---

## When to Use Firecrawl

Use Firecrawl (see [references/firecrawl.md](./references/firecrawl.md)) when:
- The target page is an **external site** with bot protection (Cloudflare, DataDome, etc.)
- `playwright-cli` gets blocked or returns a captcha page
- You need to test against scraped content from a third-party page
- The page requires **JavaScript rendering** but blocks headless browsers

For your **own app** (localhost or staging), Firecrawl is not needed — use `playwright-cli` directly.

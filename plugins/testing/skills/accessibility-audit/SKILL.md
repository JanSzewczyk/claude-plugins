---
name: accessibility-audit
description: Perform WCAG accessibility audits on React components using automated tools and manual checks. Use when auditing accessibility, fixing a11y issues, or ensuring WCAG compliance.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(playwright-cli:*)
---

# Accessibility Audit Skill

Run a WCAG 2.1 **Level AA** audit on a React component: automated scans (axe-core, Storybook a11y
addon) plus a manual review for the ~50–70% of issues automation can't catch.

This file is the audit **process**. The bulky reference material lives alongside it:

> - [references/audit-guide.md](./references/audit-guide.md) — the full WCAG manual checklist, common
>   issues & fixes (before/after), and the audit report template. Open this during the manual review.
> - [references/examples.md](./references/examples.md) — worked component audits, reusable patterns
>   (skip links, sr-only text, icon buttons), and a Storybook a11y story.
> - [references/screen-reader-testing.md](./references/screen-reader-testing.md) — screen reader workflow.
> - [references/mobile-accessibility.md](./references/mobile-accessibility.md) — touch targets, zoom, gestures.
> - [references/motion-animation.md](./references/motion-animation.md) — `prefers-reduced-motion`, seizure risk.

## What This Audits

Accessibility violations (WCAG 2.1 AA), ARIA usage, keyboard navigation, focus management, color
contrast, and screen-reader compatibility for a single component or page.

## Tools

- **axe-core via Playwright** — automated violation scan against a rendered story/page.
- **Storybook a11y addon** — live automated checks in the Storybook Accessibility panel.
- **Manual checklist** — for everything automation misses (see audit-guide).

## Audit Process

### 1. Analyze the component

Read the source and note: interactive elements, images/media, form fields and their labels, dynamic
content, focus management, and any color-only signalling.

### 2. Run automated checks

Confirm the addon is enabled (`@storybook/addon-a11y` in `.storybook/main.ts`), then scan with axe:

```typescript
// tests/e2e/a11y/[component].a11y.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("has no accessibility violations", async ({ page }) => {
  await page.goto("http://localhost:6006/?path=/story/component--default");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Automated scans catch only ~30–50% of issues — never stop here.

### 3. Manual review

Work through the **WCAG 2.1 AA manual checklist** in
[references/audit-guide.md](./references/audit-guide.md#wcag-21-aa-manual-checklist) — text
alternatives, keyboard operability, focus order, contrast, ARIA name/role/value, live regions.
Verify keyboard-only navigation (Tab/Enter/Space/Escape) and test at 200% zoom.

### 4. Fix issues

Apply the before/after fixes in
[references/audit-guide.md](./references/audit-guide.md#common-issues--fixes) — missing labels,
non-descriptive buttons, alt text, contrast, focus indicators, click-only handlers, silent dynamic
updates, dialogs. Prefer semantic HTML; reach for ARIA only when no native element fits.

### 5. Report

Document findings with the report template in
[references/audit-guide.md](./references/audit-guide.md#audit-report-format) — issues grouped by
severity, each with WCAG criterion, location, impact, and a fix.

### 6. Lock it in with a Storybook test

Add an a11y story/test (CSF Next, owned by the `storybook-testing` skill) so regressions are caught —
see the example in [references/examples.md](./references/examples.md#storybook-a11y-story).

```bash
npm run storybook:dev                                    # check the a11y panel
npm run test:e2e -- tests/e2e/a11y/                      # run axe tests
npm run test:e2e -- tests/e2e/a11y/ --reporter=html      # html report
```

## Best Practices

- **Semantic HTML first** — the right element gives you behaviour and a11y for free.
- **Keyboard-first** — if it works without a mouse, it usually works for assistive tech.
- **Never disable focus styles** — improve them instead.
- **Announce dynamic changes** with `aria-live` regions.
- **Verify with real assistive tech** (VoiceOver on macOS, NVDA on Windows) and at 200% zoom.
- **Provide alternatives** — captions, transcripts, descriptions.

## Questions to Ask

- What user actions does this component support, and are any time-sensitive?
- What happens in error and loading states — is the change announced?
- Is there dynamic content or any custom (non-native) interactive pattern?
- What's the expected screen-reader experience?

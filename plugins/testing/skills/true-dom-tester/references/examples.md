# True DOM Tester — Examples

## Example 1: Login Flow (Full Walkthrough)

**User request:** "Generate E2E tests for the login page at http://localhost:3000/login"

### Step 1 — Open and snapshot

```bash
playwright-cli open http://localhost:3000/login
playwright-cli snapshot
```

```
# Snapshot output:
- heading "Welcome back" [level=1]
- form
  - textbox "Email" [ref=e1] [required]
  - textbox "Password" [ref=e2] [type=password] [required]
  - link "Forgot password?" [ref=e3]
  - button "Sign in" [ref=e4]
- separator
- button "Continue with Google" [ref=e5]
```

### Step 2 — Record happy path

```bash
playwright-cli fill e1 "jan@jaris.io"
# → await page.getByRole('textbox', { name: 'Email' }).fill('jan@jaris.io');

playwright-cli fill e2 "ValidPass123!"
# → await page.getByRole('textbox', { name: 'Password' }).fill('ValidPass123!');

playwright-cli click e4
# → await page.getByRole('button', { name: 'Sign in' }).click();

playwright-cli snapshot
# New state:
# - heading "Dashboard" [level=1]
# - URL changed to /dashboard
```

### Step 3 — Generated test file

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('jan@jaris.io');
    await page.getByRole('textbox', { name: 'Password' }).fill('ValidPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('bad@email.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('wrongpass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid');
    await expect(page).toHaveURL('/login'); // no redirect
  });

  test('empty form shows validation errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByRole('textbox', { name: 'Email' })
    ).toHaveAttribute('aria-invalid', 'true');
  });

  test('Google OAuth button is present and enabled', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Continue with Google' })
    ).toBeEnabled();
  });
});
```

### Step 4 — Run

```bash
npx playwright test tests/e2e/auth/login.spec.ts
```

```
Running 4 tests using 2 workers

  ✓ Login > successful login redirects to dashboard (1.2s)
  ✓ Login > invalid credentials shows error (0.9s)
  ✓ Login > empty form shows validation errors (0.7s)
  ✓ Login > Google OAuth button is present and enabled (0.4s)

4 passed (3.1s)
```

---

## Example 2: Checkout Flow

**User request:** "Test the checkout page — fill in shipping, proceed to payment"

```bash
playwright-cli open http://localhost:3000/checkout
playwright-cli snapshot
```

```
- heading "Checkout" [level=1]
- group "Shipping address"
  - textbox "First name" [ref=e1]
  - textbox "Last name" [ref=e2]
  - textbox "Address" [ref=e3]
  - textbox "City" [ref=e4]
  - combobox "Country" [ref=e5]
- button "Continue to payment" [ref=e6]
```

```bash
playwright-cli fill e1 "Jan"
playwright-cli fill e2 "Szewczyk"
playwright-cli fill e3 "ul. Przykładowa 1"
playwright-cli fill e4 "Warsaw"
playwright-cli select e5 "PL"
playwright-cli click e6
playwright-cli snapshot
# → heading "Payment" [level=1]
# → textbox "Card number" [ref=e7]
```

**Generated test:**

```typescript
test('checkout shipping step proceeds to payment', async ({ page }) => {
  await page.goto('/checkout');

  await page.getByRole('textbox', { name: 'First name' }).fill('Jan');
  await page.getByRole('textbox', { name: 'Last name' }).fill('Szewczyk');
  await page.getByRole('textbox', { name: 'Address' }).fill('ul. Przykładowa 1');
  await page.getByRole('textbox', { name: 'City' }).fill('Warsaw');
  await page.getByRole('combobox', { name: 'Country' }).selectOption('PL');
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Card number' })).toBeVisible();
});
```

---

## Example 3: Bot-Protected External Page (with Firecrawl)

**User request:** "Scrape competitor pricing and validate our import handles it"

```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { test, expect } from '@playwright/test';

test('import handles competitor pricing data', async ({ page }) => {
  const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

  // Firecrawl bypasses Cloudflare on competitor site
  const result = await firecrawl.scrapeUrl('https://competitor.com/pricing', {
    formats: ['markdown']
  });
  expect(result.success).toBe(true);

  // Test our import feature with the scraped data
  await page.goto('/import');
  await page.getByRole('textbox', { name: 'Paste content' }).fill(result.markdown);
  await page.getByRole('button', { name: 'Preview import' }).click();

  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
});
```

---

## Example 4: API Mock + DOM Assertion

**User request:** "Test the products page when the API returns an error"

```bash
playwright-cli open http://localhost:3000/products
playwright-cli snapshot
# Normal state:
# - list [ref=e1] with product cards

# Now let's see error state — use route mock in the test
```

```typescript
test('products page shows error state on API failure', async ({ page }) => {
  await page.route('**/api/products', route =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) })
  );

  await page.goto('/products');

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Failed to load products');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
```

# Test Patterns

Common patterns for generating Playwright tests with this skill.

---

## Pattern 1: Authentication Flow

### Login — happy path + error path

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('jan@jaris.io');
    await page.getByRole('textbox', { name: 'Password' }).fill('ValidPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('invalid credentials shows error alert', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Email' }).fill('wrong@email.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('badpass');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  test('empty form shows validation errors', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign in' }).click();

    const emailInput = page.getByRole('textbox', { name: 'Email' });
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });
});
```

### Persistent auth state (reuse across tests)

```typescript
// auth.setup.ts — run once, save state
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('jan@jaris.io');
  await page.getByRole('textbox', { name: 'Password' }).fill('ValidPass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/.*dashboard/);
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});
```

```typescript
// In your test file — reuse saved state
test.use({ storageState: 'tests/e2e/.auth/user.json' });

test('dashboard loads for logged-in user', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
```

---

## Pattern 2: Form Submission

```typescript
test.describe('Contact Form', () => {
  test('submits successfully and shows confirmation', async ({ page }) => {
    await page.goto('/contact');

    await page.getByRole('textbox', { name: 'Your name' }).fill('Jan Szewczyk');
    await page.getByRole('textbox', { name: 'Email' }).fill('jan@jaris.io');
    await page.getByRole('combobox', { name: 'Subject' }).selectOption('Support');
    await page.getByRole('textbox', { name: 'Message' }).fill('Hello, I need help.');
    await page.getByRole('button', { name: 'Send message' }).click();

    // Wait for async submission
    await expect(page.getByRole('status')).toContainText('Message sent');
  });

  test('required field validation prevents submission', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: 'Send message' }).click();

    // All required fields should be invalid
    const inputs = page.getByRole('textbox');
    await expect(inputs.first()).toHaveAttribute('aria-invalid', 'true');
  });
});
```

---

## Pattern 3: Navigation & Routing

```typescript
test.describe('Navigation', () => {
  test('main nav links navigate correctly', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation').getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL('/about');
    await expect(page.getByRole('heading', { name: 'About Us' })).toBeVisible();
  });

  test('back button works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Products' }).click();
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });
});
```

---

## Pattern 4: Modal / Dialog Interaction

```typescript
test.describe('Delete Confirmation Dialog', () => {
  test('cancel keeps the item', async ({ page }) => {
    await page.goto('/items');
    await page.getByRole('button', { name: 'Delete item' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(3); // items remain
  });

  test('confirm deletes the item', async ({ page }) => {
    await page.goto('/items');
    const initialCount = await page.getByRole('listitem').count();

    await page.getByRole('button', { name: 'Delete item' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('listitem')).toHaveCount(initialCount - 1);
  });
});
```

---

## Pattern 5: API Response Mocking

```typescript
test('shows error state when API fails', async ({ page }) => {
  // Mock API to return 500
  await page.route('**/api/products', route => {
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
  });

  await page.goto('/products');
  await expect(page.getByRole('alert')).toContainText('Failed to load');
});

test('shows empty state when API returns no data', async ({ page }) => {
  await page.route('**/api/products', route => {
    route.fulfill({ status: 200, body: JSON.stringify([]) });
  });

  await page.goto('/products');
  await expect(page.getByText('No products found')).toBeVisible();
});
```

---

## Pattern 6: Table / List Assertions

```typescript
test('data table renders correctly', async ({ page }) => {
  await page.goto('/users');

  const table = page.getByRole('table');
  await expect(table).toBeVisible();

  // Check headers
  await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Email' })).toBeVisible();

  // Check row count (excluding header row)
  const rows = table.getByRole('row');
  await expect(rows).toHaveCount(6); // 5 data rows + 1 header

  // Check specific cell
  await expect(table.getByRole('cell', { name: 'Jan Szewczyk' })).toBeVisible();
});
```

---

## Pattern 7: Waiting for Async Operations

```typescript
test('data loads after spinner disappears', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for loading spinner to disappear
  await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 10000 });

  // Now assert on actual content
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(5);
});

test('toast disappears after timeout', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Save changes' }).click();

  const toast = page.getByRole('status');
  await expect(toast).toBeVisible();
  await expect(toast).not.toBeVisible({ timeout: 5000 }); // auto-dismiss
});
```

---

## Running Tests

```bash
# All E2E tests
npx playwright test

# Single file
npx playwright test tests/e2e/login.spec.ts

# Specific test by name
npx playwright test --grep "successful login"

# With UI mode (headed, interactive)
npx playwright test --ui

# Debug mode (step through)
npx playwright test --debug

# Show trace on failure
npx playwright test --trace on
```

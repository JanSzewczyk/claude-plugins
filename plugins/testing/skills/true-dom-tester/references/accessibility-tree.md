# Accessibility Tree — DOM Snapshot Deep Dive

## What Is the Accessibility Tree?

Every browser maintains two parallel representations of a page:
1. **The visual DOM** — what you see rendered on screen
2. **The accessibility tree** — a structured, semantic description of every interactive element

Screen readers (VoiceOver, NVDA, JAWS) navigate using the accessibility tree. So does this skill.

When you run `playwright-cli snapshot`, you get a text serialization of the accessibility tree — every element that is reachable, identifiable, and interactable.

---

## Reading a Snapshot

```bash
playwright-cli open https://example.com/login
playwright-cli snapshot
```

**Sample output:**
```
- document "Login – MyApp"
  - banner
    - link "MyApp" [ref=e1]
    - navigation
      - link "Home" [ref=e2]
      - link "About" [ref=e3]
  - main
    - heading "Sign in to your account" [level=1]
    - form
      - group "Credentials"
        - label "Email address"
          - textbox "Email address" [ref=e4] [required]
        - label "Password"
          - textbox "Password" [ref=e5] [type=password] [required]
      - checkbox "Remember me for 30 days" [ref=e6]
      - link "Forgot your password?" [ref=e7]
      - button "Sign in" [ref=e8]
    - separator
    - button "Continue with Google" [ref=e9]
    - button "Continue with GitHub" [ref=e10]
  - contentinfo
    - link "Privacy Policy" [ref=e11]
    - link "Terms of Service" [ref=e12]
```

---

## Key Element Types

| Type | What It Represents | Example Locator |
|------|--------------------|-----------------|
| `textbox` | `<input type="text/email/search">`, `<textarea>` | `getByRole('textbox', { name: 'Email' })` |
| `button` | `<button>`, `<input type="submit">` | `getByRole('button', { name: 'Sign in' })` |
| `link` | `<a href="...">` | `getByRole('link', { name: 'Home' })` |
| `checkbox` | `<input type="checkbox">` | `getByRole('checkbox', { name: 'Remember me' })` |
| `radio` | `<input type="radio">` | `getByRole('radio', { name: 'Monthly' })` |
| `combobox` | `<select>`, custom dropdowns | `getByRole('combobox', { name: 'Country' })` |
| `listbox` | Multi-select lists | `getByRole('listbox')` |
| `slider` | `<input type="range">` | `getByRole('slider', { name: 'Volume' })` |
| `switch` | Toggle switches | `getByRole('switch', { name: 'Dark mode' })` |
| `heading` | `<h1>`–`<h6>` | `getByRole('heading', { name: 'Welcome' })` |
| `alert` | Error/success messages | `getByRole('alert')` |
| `dialog` | Modals, popups | `getByRole('dialog')` |
| `tab` | Tab navigation | `getByRole('tab', { name: 'Settings' })` |

---

## Refs vs Role Locators

The snapshot assigns **refs** (`e1`, `e2`, etc.) as shorthand for interactive use with `playwright-cli`:

```bash
playwright-cli click e8         # Quick interactive use
playwright-cli fill e4 "email"  # Quick interactive use
```

However, when **generating test code**, always convert refs to semantic locators:

```typescript
// ❌ Don't use ref-based code in tests (refs change between page loads)
await page.locator('[ref=e8]').click();

// ✅ Use semantic locators from the snapshot's role + name
await page.getByRole('button', { name: 'Sign in' }).click();
await page.getByRole('textbox', { name: 'Email address' }).fill('...');
```

---

## Dynamic Content: Re-Snapshot Strategy

After any action that changes the page (click, form submit, navigation), always re-snapshot:

```bash
playwright-cli click e8       # Click "Sign in"
playwright-cli snapshot       # Read new state

# New snapshot might show:
# - loading spinner: [progressbar "Signing in..."]
# - error alert: [alert "Invalid credentials"]
# - redirect indicator: [heading "Welcome, Jan"]
```

This is how you discover what assertions to add — the new snapshot tells you exactly what changed in the DOM.

---

## Common Snapshot Patterns

### Form with validation errors
```
- alert "Please fix the following errors:" [ref=e1]
  - list
    - listitem "Email is required"
    - listitem "Password must be at least 8 characters"
- textbox "Email address" [ref=e2] [invalid] [required]
- textbox "Password" [ref=e3] [invalid] [required]
```
→ Use `toHaveAttribute('aria-invalid', 'true')` for invalid field assertions.

### Loading state
```
- button "Submitting..." [ref=e1] [disabled]
- progressbar "Loading"
```
→ Use `toBeDisabled()` and wait for the spinner to disappear.

### Modal / Dialog
```
- dialog "Confirm deletion"
  - heading "Are you sure?" [level=2]
  - paragraph "This action cannot be undone."
  - button "Cancel" [ref=e1]
  - button "Delete" [ref=e2]
```
→ Use `getByRole('dialog')` to scope assertions: `page.getByRole('dialog').getByRole('button', { name: 'Delete' })`.

### Toast notification
```
- status "Changes saved successfully"
```
→ Use `getByRole('status')` or `getByRole('alert')`.

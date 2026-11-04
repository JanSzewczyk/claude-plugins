# Accessibility Audit Guide — Checklist, Fixes, Report

Reference material consulted during a manual WCAG 2.1 AA audit: the full review checklist, fixes for
the most common violations, and the report template. The audit *process* lives in [SKILL.md](../SKILL.md).

## WCAG 2.1 AA Manual Checklist

Automated tools (axe-core) catch only ~30–50% of issues — work through this by hand for the rest.

### Perceivable (WCAG 1.x)

```markdown
## 1.1 Text Alternatives
- [ ] All images have meaningful alt text
- [ ] Decorative images have alt=""
- [ ] Icon buttons have aria-label
- [ ] Complex images have long descriptions

## 1.2 Time-based Media
- [ ] Videos have captions
- [ ] Audio has transcripts
- [ ] No auto-playing media

## 1.3 Adaptable
- [ ] Content is structured with proper headings (h1-h6)
- [ ] Lists use proper list markup
- [ ] Tables have headers and captions
- [ ] Reading order is logical

## 1.4 Distinguishable
- [ ] Color contrast ratio >= 4.5:1 for normal text
- [ ] Color contrast ratio >= 3:1 for large text
- [ ] Information not conveyed by color alone
- [ ] Text can be resized to 200% without loss
- [ ] No horizontal scrolling at 320px viewport
```

### Operable (WCAG 2.x)

```markdown
## 2.1 Keyboard Accessible
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Focus visible on all interactive elements
- [ ] Logical tab order

## 2.2 Enough Time
- [ ] Users can extend time limits
- [ ] Users can pause moving content
- [ ] No content that flashes more than 3 times/second

## 2.3 Navigable
- [ ] Skip links available for navigation
- [ ] Page has descriptive title
- [ ] Focus order preserves meaning
- [ ] Link purpose clear from text

## 2.4 Input Modalities
- [ ] Touch targets at least 44x44px
- [ ] Functionality not dependent on motion
```

### Understandable (WCAG 3.x)

```markdown
## 3.1 Readable
- [ ] Page language specified (lang attribute)
- [ ] Abbreviations explained

## 3.2 Predictable
- [ ] No unexpected context changes on focus
- [ ] Navigation consistent across pages
- [ ] Components identified consistently

## 3.3 Input Assistance
- [ ] Error messages are descriptive
- [ ] Labels or instructions provided
- [ ] Error prevention for important actions
- [ ] Form validation is accessible
```

### Robust (WCAG 4.x)

```markdown
## 4.1 Compatible
- [ ] Valid HTML markup
- [ ] ARIA attributes used correctly
- [ ] Name, role, value programmatically determined
- [ ] Status messages announced to screen readers
```

## Common Issues & Fixes

Quick before/after for the violations that show up most often.

### Missing Form Labels

```tsx
// ❌ Bad
<input type="text" placeholder="Email" />

// ✅ Explicit label
<label htmlFor="email">Email</label>
<input id="email" type="text" />

// ✅ aria-label for icon inputs
<input type="text" aria-label="Search" />

// ✅ Visually hidden label
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" type="text" placeholder="Email" />
```

### Non-Descriptive Buttons

```tsx
// ❌ Bad
<button><Icon name="trash" /></button>

// ✅ aria-label + hidden icon
<button aria-label="Delete item">
  <Icon name="trash" aria-hidden="true" />
</button>

// ✅ With visible text
<button>
  <Icon name="trash" aria-hidden="true" />
  <span>Delete</span>
</button>
```

### Missing Image Alt Text

```tsx
// ❌ Bad
<Image src="/hero.jpg" />

// ✅ Meaningful alt
<Image src="/hero.jpg" alt="Team collaborating in modern office" />

// ✅ Decorative image
<Image src="/pattern.svg" alt="" aria-hidden="true" />
```

### Color Contrast

```tsx
// ❌ Low contrast
<span className="text-gray-400">Important text</span>

// ✅ Sufficient contrast (or use a design-system token that meets AA)
<span className="text-gray-700">Important text</span>
<span className="text-foreground">Important text</span>
```

### Missing Focus Indicators

```tsx
// ❌ Removes focus outline
<button className="focus:outline-none">Click me</button>

// ✅ Visible focus
<button className="focus:ring-2 focus:ring-primary focus:ring-offset-2">Click me</button>
```

### Keyboard Accessibility

```tsx
// ❌ Click-only
<div onClick={handleClick}>Clickable div</div>

// ✅ Use a real button
<button onClick={handleClick}>Clickable button</button>

// ✅ If a div is unavoidable, add role + tabIndex + key handler
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") handleClick();
  }}
>
  Clickable div
</div>
```

### Dynamic Content Announcements

```tsx
// ❌ Silent updates
{isLoading && <Spinner />}
{error && <ErrorMessage>{error}</ErrorMessage>}

// ✅ Announced via aria-live
<div aria-live="polite" aria-atomic="true">
  {isLoading && <Spinner aria-label="Loading..." />}
  {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
</div>

// ✅ Critical alerts
<div role="alert" aria-live="assertive">{criticalError}</div>
```

### Modal / Dialog

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-description">
    <DialogHeader>
      <DialogTitle id="dialog-title">Confirm Action</DialogTitle>
      <DialogDescription id="dialog-description">Are you sure you want to proceed?</DialogDescription>
    </DialogHeader>
    {/* Focus trapped inside; Escape closes; focus returns to trigger on close */}
  </DialogContent>
</Dialog>
```

## Audit Report Format

Follow the reporting rules indexed in SKILL.md → 5. Report. For an accessibility audit:

- **Marks:** critical and serious → 🔴 (blocks a user), moderate → 🟡, minor → 🔵.
- **Scorecard:** the automated scan, then the four WCAG principles, always in this order.
- **Findings:** add a `WCAG` column with the success criterion (`1.4.3`). `Problem` says who is
  blocked and how, not only what is missing.
- **Detail blocks:** before/after code, for the 🔴 and 🟡 findings whose fix needs more than one line.
- **No "passed checks" list:** the scorecard's 🟢 rows already say it.

````markdown
## 🩺 Accessibility audit · `<ComponentName>` · WCAG 2.1 AA

> 🔴 **Not accessible** · 2 critical · 1 serious · 3 moderate · 1 minor
> axe: `3 violations` · manual review: keyboard, VoiceOver

| Area | Status | Found |
| --- | :-: | --- |
| Automated scan (axe) | 🔴 | 3 violations |
| 1. Perceivable | 🟡 | 2 moderate |
| 2. Operable | 🔴 | 2 critical |
| 3. Understandable | 🟢 | — |
| 4. Robust | 🔴 | 1 serious · 1 moderate · 1 minor |

| # | Sev | WCAG | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- | --- |
| 1 | 🔴 | 2.1.1 | `Menu.tsx:24` | Menu items are `div`s: keyboard users cannot open them | Use `<button>` |
| 2 | 🔴 | 4.1.2 | `IconButton.tsx:8` | Icon-only button has no accessible name | Add `aria-label` |

### 1 · 🔴 Menu items are not keyboard accessible

```tsx
// Before
<div onClick={onSelect}>{label}</div>

// After
<button type="button" onClick={onSelect}>{label}</button>
```

**Not checked:** screen-reader pass on NVDA (macOS only here) · real-device touch targets

**Next:** say which numbers to fix, or `all`; step 6 then locks them in with a Storybook test.
````

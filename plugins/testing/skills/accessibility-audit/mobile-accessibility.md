# Mobile Accessibility Guide

A practical guide for building accessible mobile web experiences with React, Tailwind CSS, and Playwright. Mobile accessibility requires attention to touch interactions, viewport behavior, responsive text, and device-specific input patterns.

## Touch Target Sizes

Small touch targets are one of the most common mobile accessibility failures. Users with motor impairments, large fingers, or who are in moving environments need adequately sized targets.

### WCAG Requirements

| Criterion                             | Level | Minimum Size     | Notes                                        |
| ------------------------------------- | ----- | ---------------- | -------------------------------------------- |
| **WCAG 2.5.8** (Target Size Minimum)  | AA    | 24x24 CSS pixels | Or has sufficient spacing from other targets |
| **WCAG 2.5.5** (Target Size Enhanced) | AAA   | 44x44 CSS pixels | Recommended best practice                    |

The 44x44px target size from WCAG 2.5.5 is widely adopted as the practical standard. Apple's Human Interface Guidelines and Google's Material Design both recommend similar or larger minimum sizes.

### Exceptions

The minimum size requirement does not apply when:

- The target is **inline** (a link within a sentence of text)
- The target size is determined by the **user agent** (default browser controls)
- The target has an **equivalent** alternative that meets the size requirement
- The target is **essential** to the information being conveyed (e.g., map pins)

## Touch Target Implementation with Tailwind CSS

### Basic Touch Targets

```typescript
// Minimum 44x44px touch target
<button className="min-h-11 min-w-11 flex items-center justify-center">
  <Icon name="menu" className="h-5 w-5" />
</button>

// Icon button with proper sizing
<button
  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md"
  aria-label="Close dialog"
>
  <XIcon className="h-4 w-4" aria-hidden="true" />
</button>

// Small visual element with larger touch area using padding
<button className="p-3">
  <span className="text-sm">Edit</span>
</button>
```

### Expanding Touch Areas Without Changing Visual Size

When the visual design requires a smaller element, expand the touch area using pseudo-elements or padding:

```typescript
// Technique 1: Padding to expand touch area
<button className="relative p-3 -m-3">
  <SmallIcon className="h-4 w-4" />
</button>

// Technique 2: Pseudo-element for invisible touch expansion
// In your global CSS or Tailwind plugin:
// .touch-target::after {
//   content: '';
//   position: absolute;
//   inset: -8px;
// }

<button className="relative touch-target" aria-label="Settings">
  <GearIcon className="h-4 w-4" />
</button>

// Technique 3: Tailwind arbitrary values for precise sizing
<a
  href="/profile"
  className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px]"
>
  <Avatar className="h-8 w-8" />
</a>
```

### Touch Target Spacing

Adjacent touch targets need sufficient spacing to prevent accidental activation:

```typescript
// Toolbar with proper spacing between icon buttons
<div className="flex items-center gap-2">
  <button className="min-h-11 min-w-11 flex items-center justify-center" aria-label="Bold">
    <BoldIcon className="h-5 w-5" />
  </button>
  <button className="min-h-11 min-w-11 flex items-center justify-center" aria-label="Italic">
    <ItalicIcon className="h-5 w-5" />
  </button>
  <button className="min-h-11 min-w-11 flex items-center justify-center" aria-label="Underline">
    <UnderlineIcon className="h-5 w-5" />
  </button>
</div>

// List items as touch targets
<ul className="divide-y">
  {items.map(item => (
    <li key={item.id}>
      <a href={item.href} className="block min-h-11 px-4 py-3">
        {item.label}
      </a>
    </li>
  ))}
</ul>
```

### Tap Highlight Customization

```typescript
// Remove default tap highlight and add custom feedback
<button className="[-webkit-tap-highlight-color:transparent] active:bg-gray-100">
  Tap me
</button>

// For dark themes
<button className="[-webkit-tap-highlight-color:transparent] active:bg-white/10">
  Tap me
</button>
```

## Gesture Alternatives

Not all users can perform complex gestures like swiping, pinching, or multi-finger taps. WCAG 2.5.1 requires that all functionality using multipoint or path-based gestures can be operated with a single pointer without a path-based gesture.

### Provide Button Alternatives for Gestures

```typescript
// Swipeable card with button alternative
function SwipeableCard({ onDismiss, onAction, children }) {
  return (
    <div className="relative">
      {/* Swipe gesture for capable users */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Button alternatives for all users */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={onAction}
          className="min-h-11 px-4 py-2 rounded-md bg-primary text-white"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="min-h-11 px-4 py-2 rounded-md bg-gray-200"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// Image carousel with navigation buttons
function Carousel({ images }) {
  const [current, setCurrent] = useState(0);

  return (
    <div>
      <div
        className="relative overflow-hidden"
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        <img src={images[current].src} alt={images[current].alt} />
      </div>

      {/* Visible button alternatives */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          className="min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Previous image"
        >
          <ChevronLeftIcon />
        </button>

        <span aria-live="polite">
          {current + 1} of {images.length}
        </span>

        <button
          onClick={() => setCurrent(Math.min(images.length - 1, current + 1))}
          disabled={current === images.length - 1}
          className="min-h-11 min-w-11 flex items-center justify-center"
          aria-label="Next image"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
```

### Pinch-to-Zoom Alternative

```typescript
// Map with zoom buttons alongside pinch-to-zoom
<div className="relative">
  <Map
    onPinchZoom={handlePinchZoom}
    onDoubleTapZoom={handleDoubleTapZoom}
  />

  <div className="absolute bottom-4 right-4 flex flex-col gap-1">
    <button
      onClick={zoomIn}
      className="min-h-11 min-w-11 flex items-center justify-center bg-white rounded-md shadow"
      aria-label="Zoom in"
    >
      +
    </button>
    <button
      onClick={zoomOut}
      className="min-h-11 min-w-11 flex items-center justify-center bg-white rounded-md shadow"
      aria-label="Zoom out"
    >
      -
    </button>
  </div>
</div>
```

## Viewport and Zoom

### Never Disable User Scaling

Users with low vision rely on pinch-to-zoom. Disabling it is a WCAG 1.4.4 failure.

```html
<!-- WRONG: Disables pinch-to-zoom -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
/>

<!-- CORRECT: Allows pinch-to-zoom -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

In Next.js, the viewport is configured in `layout.tsx`:

```typescript
// app/layout.tsx
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Do NOT set maximumScale or userScalable: false
};
```

### Handle Zoom Gracefully

Design content that works at 200% zoom (WCAG 1.4.4) and 400% zoom (WCAG 1.4.10):

```typescript
// Use relative units for containers
<div className="max-w-prose mx-auto px-4">
  <p className="text-base leading-relaxed">
    Content remains readable when zoomed.
  </p>
</div>

// Avoid fixed-width containers that cause horizontal scrolling
// Bad
<div className="w-[1200px]">...</div>

// Good
<div className="w-full max-w-7xl">...</div>
```

## Responsive Text Sizing

### Use rem/em, Not px for Text

Using `rem` or `em` units allows text to scale with user preferences. Users who set larger default font sizes in their browser will see appropriately scaled text.

```css
/* WRONG: Fixed pixel sizes do not respect user preferences */
.heading {
  font-size: 24px;
}
.body {
  font-size: 14px;
}

/* CORRECT: Relative units scale with user preferences */
.heading {
  font-size: 1.5rem;
} /* 24px at default 16px base */
.body {
  font-size: 0.875rem;
} /* 14px at default 16px base */
```

Tailwind CSS uses `rem` by default for its text utilities (`text-sm`, `text-base`, `text-lg`, etc.), so using Tailwind's built-in classes is already the correct approach.

### 200% Zoom Test

Content must remain usable at 200% zoom without horizontal scrolling (at 1280px viewport width):

```typescript
// Good: Responsive layout that reflows at zoom
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>{item.content}</Card>
  ))}
</div>

// Good: Text that wraps properly
<p className="text-base max-w-prose break-words">
  Long content that wraps correctly at any zoom level.
</p>

// Bad: Truncated text hides content at zoom
<p className="truncate">
  This content might be important but gets cut off
</p>

// Better: Allow wrapping or provide full text on interaction
<p className="line-clamp-3">
  Content visible up to 3 lines with indication more exists
</p>
```

## Orientation

WCAG 1.3.4 requires that content is not restricted to a single display orientation (portrait or landscape) unless a specific orientation is essential for functionality.

```typescript
// Do NOT lock orientation via CSS
// Bad
@media (orientation: portrait) {
  .app { display: block; }
}
@media (orientation: landscape) {
  .app { display: none; }  /* Hides content in landscape */
}

// Good: Adapt layout to both orientations
@media (orientation: landscape) {
  .sidebar { position: fixed; left: 0; width: 250px; }
  .content { margin-left: 250px; }
}
@media (orientation: portrait) {
  .sidebar { position: relative; width: 100%; }
  .content { margin-left: 0; }
}
```

In a Next.js application, do not use the Web App Manifest to lock orientation unless the app genuinely requires it (e.g., a game):

```json
{
  "display": "standalone"
  // Do NOT include: "orientation": "portrait"
}
```

## Input Types on Mobile

Proper input types trigger the correct virtual keyboard, reducing errors and improving the experience for all users:

```typescript
// Email - shows @ and .com keys
<input type="email" inputMode="email" autoComplete="email" />

// Phone number - shows numeric keypad
<input type="tel" inputMode="tel" autoComplete="tel" />

// Numeric input - shows number pad
<input type="text" inputMode="numeric" pattern="[0-9]*" />

// URL - shows / and .com keys
<input type="url" inputMode="url" autoComplete="url" />

// Search - shows search/go button on keyboard
<input type="search" inputMode="search" />

// Decimal number - shows number pad with decimal point
<input type="text" inputMode="decimal" />
```

### inputMode vs type

The `type` attribute determines validation behavior. The `inputMode` attribute controls which keyboard appears. Use both when needed:

```typescript
// Credit card number: numeric keyboard but text type (for spaces/dashes)
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9\s-]*"
  autoComplete="cc-number"
  aria-label="Credit card number"
/>

// One-time code: numeric keyboard
<input
  type="text"
  inputMode="numeric"
  autoComplete="one-time-code"
  aria-label="Verification code"
/>

// Zip/postal code: depends on country
<input
  type="text"
  inputMode="text"  // Some postal codes have letters
  autoComplete="postal-code"
  aria-label="Postal code"
/>
```

### Autocomplete for Faster Input

Mobile users benefit greatly from autocomplete, which reduces typing:

```typescript
<form>
  <input type="text" autoComplete="given-name" aria-label="First name" />
  <input type="text" autoComplete="family-name" aria-label="Last name" />
  <input type="email" autoComplete="email" aria-label="Email" />
  <input type="tel" autoComplete="tel" aria-label="Phone" />
  <input type="text" autoComplete="street-address" aria-label="Street address" />
  <input type="text" autoComplete="address-level2" aria-label="City" />
  <input type="text" autoComplete="postal-code" aria-label="Postal code" />
</form>
```

## Mobile-Specific Testing with Playwright

### Viewport and Touch Emulation

```typescript
import { test, expect, devices } from "@playwright/test";

// Use Playwright device presets
test.use(devices["iPhone 14"]);

test.describe("Mobile Accessibility", () => {
  test("touch targets meet minimum size", async ({ page }) => {
    await page.goto("/");

    // Check all interactive elements meet 44x44px minimum
    const interactiveElements = await page
      .locator(
        'button, a, input, select, textarea, [role="button"], [role="link"]',
      )
      .all();

    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      if (box) {
        expect(
          box.width >= 44 || box.height >= 44,
          `Element has size ${box.width}x${box.height}, expected at least 44x44`,
        ).toBeTruthy();
      }
    }
  });

  test("no horizontal scrolling at mobile viewport", async ({ page }) => {
    await page.goto("/");

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("viewport allows user scaling", async ({ page }) => {
    await page.goto("/");

    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");

    expect(viewport).not.toContain("user-scalable=no");
    expect(viewport).not.toContain("maximum-scale=1");
  });
});
```

### Testing Touch Interactions

```typescript
test("swipe gesture has button alternative", async ({ page }) => {
  await page.goto("/cards");

  // Verify button alternatives exist for swipe actions
  const dismissButton = page.getByRole("button", { name: /dismiss/i });
  const acceptButton = page.getByRole("button", { name: /accept/i });

  await expect(dismissButton).toBeVisible();
  await expect(acceptButton).toBeVisible();

  // Test the button alternative works
  await acceptButton.tap();
  // Verify expected behavior
});

test("carousel has navigation buttons", async ({ page }) => {
  await page.goto("/gallery");

  const nextButton = page.getByRole("button", { name: /next/i });
  const prevButton = page.getByRole("button", { name: /previous/i });

  await expect(nextButton).toBeVisible();
  await expect(prevButton).toBeVisible();

  // Navigate using buttons
  await nextButton.tap();

  // Verify slide changed
  const status = page.getByText(/2 of/);
  await expect(status).toBeVisible();
});
```

### Testing at Multiple Viewports

```typescript
const viewports = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPad Mini", width: 768, height: 1024 },
  { name: "iPad Pro", width: 1024, height: 1366 },
];

for (const vp of viewports) {
  test(`content is accessible at ${vp.name} (${vp.width}x${vp.height})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    // No horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(vp.width);

    // All critical content visible
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();

    // Touch targets accessible
    const buttons = await page.getByRole("button").all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box && (await button.isVisible())) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}
```

## Common Mobile Accessibility Anti-Patterns and Fixes

### 1. Hover-Only Interactions

**Problem:** Tooltips, dropdowns, or info that appears only on hover. Mobile has no hover.

```typescript
// Bad: Hover-only tooltip
<div className="group relative">
  <button>Info</button>
  <div className="hidden group-hover:block absolute">
    Tooltip content
  </div>
</div>

// Good: Click/tap to toggle, accessible
function Tooltip({ content, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-describedby="tooltip"
      >
        {children}
      </button>
      {isOpen && (
        <div id="tooltip" role="tooltip" className="absolute z-10 p-2 bg-gray-900 text-white rounded">
          {content}
        </div>
      )}
    </div>
  );
}
```

### 2. Fixed Position Elements Covering Content

**Problem:** Fixed headers/footers/FABs that obscure content, especially when the virtual keyboard is open.

```typescript
// Bad: Fixed button covering content
<button className="fixed bottom-4 right-4">+</button>

// Good: Account for safe areas and keyboard
<button className="fixed bottom-4 right-4 pb-[env(safe-area-inset-bottom)]">
  <span className="min-h-11 min-w-11 flex items-center justify-center rounded-full bg-primary text-white shadow-lg">
    <PlusIcon aria-hidden="true" />
    <span className="sr-only">Add new item</span>
  </span>
</button>

// Good: Respect safe areas in layout
<main className="pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
  {children}
</main>
```

### 3. Tiny Close Buttons

**Problem:** Small X buttons on modals, toasts, and banners.

```typescript
// Bad: Tiny close button
<button className="absolute top-1 right-1 text-xs" onClick={onClose}>
  x
</button>

// Good: Properly sized close button
<button
  className="absolute top-2 right-2 min-h-11 min-w-11 flex items-center justify-center rounded-md"
  onClick={onClose}
  aria-label="Close"
>
  <XIcon className="h-5 w-5" aria-hidden="true" />
</button>
```

### 4. Disabled Zoom

**Problem:** Setting `maximum-scale=1` or `user-scalable=no` in the viewport meta tag.

```html
<!-- Bad -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1"
/>

<!-- Good -->
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### 5. Text Too Small to Read

**Problem:** Using small font sizes that are difficult to read on mobile screens.

```typescript
// Bad: Text too small on mobile
<p className="text-[10px]">Fine print that nobody can read</p>

// Good: Minimum 16px (1rem) for body text on mobile
// This also prevents iOS Safari from auto-zooming on input focus
<p className="text-base">Readable body text</p>
<input className="text-base" />  // 16px prevents auto-zoom on iOS
```

### 6. Links Too Close Together

**Problem:** Adjacent links or buttons with no spacing, causing mis-taps.

```typescript
// Bad: Links with no spacing
<nav>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/help">Help</a>
</nav>

// Good: Links with adequate spacing
<nav>
  <ul className="flex gap-4">
    <li><a href="/about" className="block py-2 px-3 min-h-11">About</a></li>
    <li><a href="/contact" className="block py-2 px-3 min-h-11">Contact</a></li>
    <li><a href="/help" className="block py-2 px-3 min-h-11">Help</a></li>
  </ul>
</nav>
```

### 7. Custom Select Without Mobile Optimization

**Problem:** Custom select dropdowns that are harder to use than native selects on mobile.

```typescript
// Consider: Use native select on mobile, custom on desktop
function ResponsiveSelect({ options, value, onChange, label }) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <label>
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 w-full text-base"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return <CustomSelect options={options} value={value} onChange={onChange} label={label} />;
}
```

### 8. Scroll Hijacking

**Problem:** Overriding default scroll behavior, which interferes with assistive technologies and user expectations.

```typescript
// Bad: Hijacked scroll
<div onWheel={customScrollHandler} onTouchMove={preventDefaultAndScroll}>
  {content}
</div>

// Good: Use native scrolling
<div className="overflow-y-auto max-h-[80vh]">
  {content}
</div>
```

### 9. No Focus Management After Navigation

**Problem:** After client-side navigation (SPA), focus remains on the old content or is lost entirely.

```typescript
// Good: Manage focus on route change in Next.js
"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function FocusManager({ children }) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Move focus to main content on route change
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <main ref={mainRef} tabIndex={-1} className="outline-none">
      {children}
    </main>
  );
}
```

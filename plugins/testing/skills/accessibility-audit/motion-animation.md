# Motion and Animation Accessibility

A practical guide for implementing accessible animations in React applications. Motion can enhance user experience when used purposefully, but it can also cause discomfort, distraction, or seizures for some users. This guide covers how to respect user preferences, avoid harmful patterns, and implement animation accessibility correctly.

## prefers-reduced-motion Media Query

The `prefers-reduced-motion` media query detects whether the user has requested the system minimize non-essential motion. On macOS, this is set in System Settings > Accessibility > Display > Reduce motion. On iOS, it is in Settings > Accessibility > Motion > Reduce Motion.

### CSS Detection

```css
/* Default: animations run normally */
.animated-element {
  transition: transform 0.3s ease-in-out;
  animation: slideIn 0.5s ease-out;
}

/* When user prefers reduced motion */
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    transition: none;
    animation: none;
  }
}

/* Alternative: Opt-in approach - only animate when motion is OK */
@media (prefers-reduced-motion: no-preference) {
  .animated-element {
    transition: transform 0.3s ease-in-out;
    animation: slideIn 0.5s ease-out;
  }
}
```

### JavaScript Detection

```typescript
// Check the preference once
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Listen for changes (user may toggle the setting)
const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

mediaQuery.addEventListener("change", (event) => {
  if (event.matches) {
    // User enabled reduced motion - stop animations
    cancelAllAnimations();
  } else {
    // User disabled reduced motion - animations can run
    startAnimations();
  }
});
```

## Tailwind CSS: motion-safe and motion-reduce Variants

Tailwind CSS provides built-in variants for respecting the `prefers-reduced-motion` preference:

### motion-safe: (animate only when motion is OK)

```typescript
// Animation only runs when user has NOT requested reduced motion
<div className="motion-safe:animate-bounce">
  <ArrowDownIcon />
</div>

// Transition only when motion is OK
<button className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-105">
  Click me
</button>

// Slide-in animation only when motion is OK
<div className="motion-safe:animate-in motion-safe:slide-in-from-bottom-4">
  New content
</div>
```

### motion-reduce: (override when reduced motion is requested)

```typescript
// Remove animation when reduced motion is requested
<div className="animate-spin motion-reduce:animate-none">
  <LoadingSpinner />
</div>

// Remove transitions when reduced motion is requested
<div className="transition-all duration-300 motion-reduce:transition-none">
  {content}
</div>

// Replace animation with instant change
<div className="transition-opacity duration-500 motion-reduce:duration-0">
  {isVisible ? "Visible" : "Hidden"}
</div>

// Provide alternative non-motion feedback
<button className="
  motion-safe:hover:scale-105 motion-safe:transition-transform
  motion-reduce:hover:ring-2 motion-reduce:hover:ring-primary
">
  Interactive button
</button>
```

### Practical Tailwind Patterns

```typescript
// Toast notification
<div className="
  motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-300
  motion-reduce:animate-none
">
  <Toast message="Settings saved" />
</div>

// Page transition wrapper
<div className="
  motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200
  motion-reduce:animate-none
">
  {children}
</div>

// Loading spinner with reduced motion alternative
function LoadingIndicator() {
  return (
    <div role="status" aria-label="Loading">
      {/* Spinning animation for motion-OK users */}
      <svg className="animate-spin motion-reduce:hidden h-5 w-5" viewBox="0 0 24 24">
        {/* spinner SVG */}
      </svg>
      {/* Static alternative for reduced motion users */}
      <span className="hidden motion-reduce:inline-block">Loading...</span>
    </div>
  );
}
```

## When Animation Is Decorative vs Functional

Understanding the distinction helps determine how to handle reduced motion:

### Decorative Animation (can be fully removed)

- Background particle effects
- Parallax scrolling
- Hover scale/rotation effects
- Decorative loading animations (spinning logos)
- Page transition flourishes
- Floating or bobbing elements

```typescript
// Decorative: Remove entirely for reduced motion
<div className="motion-safe:animate-float">
  <DecorativeBlob />
</div>
```

### Functional Animation (reduce but preserve meaning)

- Progress indicators (show static progress bar instead)
- Skeleton loaders (show static placeholder instead)
- Accordion open/close (change instantly instead of sliding)
- Tab panel transitions (swap instantly instead of sliding)
- Form validation feedback (show error immediately instead of shaking)
- Scroll-to-section navigation (jump instantly instead of smooth scroll)

```typescript
// Functional: Replace with instant state change for reduced motion
function Accordion({ title, children, isOpen }) {
  return (
    <div>
      <button onClick={toggle} aria-expanded={isOpen}>
        {title}
      </button>
      <div
        className={`
          overflow-hidden
          motion-safe:transition-[max-height] motion-safe:duration-300
          ${isOpen ? "max-h-96" : "max-h-0"}
        `}
      >
        {children}
      </div>
    </div>
  );
}

// Smooth scroll with reduced motion fallback
function scrollToSection(elementId: string) {
  const element = document.getElementById(elementId);
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  element?.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
  });
}
```

## Seizure Risk: WCAG 2.3.1

WCAG 2.3.1 (Level A) states: web pages do not contain anything that flashes more than three times in any one-second period. This is not a preference -- it is a safety requirement. Flashing content can trigger seizures in people with photosensitive epilepsy.

### What Counts as a Flash

A flash is a pair of opposing changes in relative luminance (light to dark, dark to light) that:

- Occurs more than 3 times per second
- Covers a sufficiently large area of the screen (more than 25% of 10 degrees of visual field, roughly 341x256px at typical viewing distance)

### Dangerous Patterns to Avoid

```typescript
// DANGEROUS: Rapid blinking
// Never do this
.blink {
  animation: blink 0.2s infinite;  // 5 flashes/sec - DANGEROUS
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

// DANGEROUS: Rapid color alternation
.strobe {
  animation: strobe 0.1s infinite;  // 10 flashes/sec - DANGEROUS
}

// DANGEROUS: Rapid background changes
// Any transition between significantly different luminance values
// at high frequency
```

### Safe Alternatives

```typescript
// Safe: Slow pulse (under 3 flashes per second)
@keyframes safePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }  // Subtle change
}

.pulse {
  animation: safePulse 2s ease-in-out infinite;  // 0.5 flashes/sec - safe
}

// Safe: Gentle glow effect
@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
}

.notification-badge {
  animation: glow 3s ease-in-out infinite;
}

// For any embedded video content, include a warning
<div>
  <p className="text-sm text-muted-foreground">
    Warning: This video contains flashing lights.
  </p>
  <video controls>
    <source src="/video-with-flashes.mp4" />
  </video>
</div>
```

## Parallax and Auto-Scrolling Concerns

### Parallax

Parallax effects create a sense of depth by moving background and foreground elements at different speeds during scroll. This can cause:

- **Vestibular disorders:** Dizziness, nausea, disorientation
- **Motion sickness:** Especially on mobile devices
- **Disorientation:** Users lose their place on the page

```typescript
// Parallax with reduced motion respect
function ParallaxSection({ backgroundImage, children }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden"
      style={
        prefersReducedMotion
          ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover" }
          : undefined
      }
    >
      {!prefersReducedMotion && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundAttachment: "fixed",  // Creates parallax effect
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
```

### Auto-Scrolling and Carousels

Auto-advancing carousels and marquee text are problematic for many users:

```typescript
// Auto-advancing carousel with pause control
function AutoCarousel({ slides, interval = 5000 }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // Do not auto-advance if user prefers reduced motion
    if (prefersReducedMotion || isPaused) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [prefersReducedMotion, isPaused, interval, slides.length]);

  return (
    <div
      role="region"
      aria-label="Image carousel"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div aria-live="polite">
        {slides[current]}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {/* Pause/Play control - REQUIRED for auto-advancing content */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? "Play carousel" : "Pause carousel"}
          className="min-h-11 min-w-11 flex items-center justify-center"
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>

        <button
          onClick={() => setCurrent((current - 1 + slides.length) % slides.length)}
          aria-label="Previous slide"
          className="min-h-11 min-w-11 flex items-center justify-center"
        >
          <ChevronLeftIcon />
        </button>

        <span>
          {current + 1} of {slides.length}
        </span>

        <button
          onClick={() => setCurrent((current + 1) % slides.length)}
          aria-label="Next slide"
          className="min-h-11 min-w-11 flex items-center justify-center"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
```

## CSS Implementation Patterns

### Transition with Reduced Motion

```css
/* Base transition that respects reduced motion */
.card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }

  .card:hover {
    transform: none;
    /* Keep non-motion visual feedback */
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    outline: 2px solid var(--color-primary);
  }
}
```

### Animation with Reduced Motion

```css
/* Fade-in animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1; /* Ensure element is visible */
  }
}

/* Skeleton loading animation */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    /* Static placeholder still indicates loading */
    background: #e0e0e0;
  }
}
```

### Global Reduced Motion Reset

For a blanket approach, disable all animations and transitions site-wide when reduced motion is preferred:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Note:** This approach is aggressive. It removes all animation, including functional ones. It works well as a safety net but should be supplemented with targeted styles for components where a static alternative (like a progress bar at its current position) is better than no animation at all.

## React Implementation: useReducedMotion Hook

### Custom Hook

```typescript
import { useState, useEffect } from "react";

function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // SSR-safe: default to reduced motion on server
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    // Sync state in case it changed between SSR and hydration
    setPrefersReducedMotion(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
```

### Using the Hook in Components

```typescript
// Animated counter
function AnimatedCounter({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (prefersReducedMotion) {
      // Skip animation, show final value immediately
      setDisplayValue(value);
      return;
    }

    // Animate counting up
    const duration = 1000;
    const start = displayValue;
    const diff = value - start;
    const startTime = performance.now();

    function step(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayValue(Math.round(start + diff * progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }, [value, prefersReducedMotion]);

  return <span aria-live="polite">{displayValue}</span>;
}

// Page transitions
function PageTransition({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <div className="animate-in fade-in duration-200">
      {children}
    </div>
  );
}

// Collapsible section
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {title}
      </button>

      <div
        ref={contentRef}
        style={{
          maxHeight: isOpen ? contentRef.current?.scrollHeight : 0,
          overflow: "hidden",
          transition: prefersReducedMotion ? "none" : "max-height 0.3s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

### Framer Motion Integration

If using Framer Motion, respect reduced motion preferences:

```typescript
import { motion, useReducedMotion } from "framer-motion";

function AnimatedCard({ children }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.3, ease: "easeOut" }
      }
    >
      {children}
    </motion.div>
  );
}

// Global reduced motion configuration
// In your app layout or provider
import { MotionConfig } from "framer-motion";

function App({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {/* All framer-motion components will respect system preference */}
      {children}
    </MotionConfig>
  );
}
```

## Testing Reduced Motion Preference in Playwright

### Emulate Reduced Motion

```typescript
import { test, expect } from "@playwright/test";

test.describe("Reduced Motion", () => {
  test("animations are disabled when prefers-reduced-motion is set", async ({
    page,
  }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Verify no CSS animations are running
    const animatedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      const animated: string[] = [];

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.animationName !== "none" &&
          style.animationDuration !== "0s" &&
          style.animationPlayState === "running"
        ) {
          animated.push(el.tagName + "." + el.className);
        }
      });

      return animated;
    });

    expect(
      animatedElements,
      `These elements still have animations running: ${animatedElements.join(", ")}`,
    ).toHaveLength(0);
  });

  test("transitions are disabled when prefers-reduced-motion is set", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Check that transition durations are zero or none
    const transitionElements = await page.evaluate(() => {
      const elements = document.querySelectorAll("*");
      const withTransitions: string[] = [];

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.transitionDuration !== "0s" &&
          style.transitionProperty !== "none"
        ) {
          withTransitions.push(
            `${el.tagName}.${el.className}: ${style.transitionDuration}`,
          );
        }
      });

      return withTransitions;
    });

    // Some elements may have very short transitions (0.01ms) from the global reset
    // Filter for any with durations longer than 50ms
    const significantTransitions = transitionElements.filter((t) => {
      const match = t.match(/(\d+\.?\d*)(ms|s)/);
      if (!match) return false;
      const duration = parseFloat(match[1]);
      const unit = match[2];
      const ms = unit === "s" ? duration * 1000 : duration;
      return ms > 50;
    });

    expect(significantTransitions).toHaveLength(0);
  });

  test("content is still visible with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Elements that animate in should still be visible
    const mainContent = page.getByRole("main");
    await expect(mainContent).toBeVisible();

    // Toast notification should appear (even without animation)
    await page.click('[data-testid="trigger-toast"]');
    const toast = page.getByRole("status");
    await expect(toast).toBeVisible();
  });

  test("auto-playing carousel stops with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/carousel-page");

    // Get initial slide
    const initialSlide = await page.getByTestId("active-slide").textContent();

    // Wait longer than the auto-advance interval
    await page.waitForTimeout(6000);

    // Slide should not have changed
    const currentSlide = await page.getByTestId("active-slide").textContent();
    expect(currentSlide).toBe(initialSlide);

    // Manual navigation should still work
    await page.getByRole("button", { name: /next/i }).click();
    const nextSlide = await page.getByTestId("active-slide").textContent();
    expect(nextSlide).not.toBe(initialSlide);
  });
});

// Compare behavior with and without reduced motion
test.describe("Motion comparison", () => {
  test("with motion enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    // Verify animations run
    const hasAnimations = await page.evaluate(() => {
      const el = document.querySelector(".animated-hero");
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.animationName !== "none";
    });

    expect(hasAnimations).toBe(true);
  });

  test("with motion reduced", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Verify animations do not run
    const hasAnimations = await page.evaluate(() => {
      const el = document.querySelector(".animated-hero");
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.animationName !== "none" && style.animationDuration !== "0s";
    });

    expect(hasAnimations).toBe(false);
  });
});
```

## Best Practices

### 1. Provide Pause/Stop Controls

WCAG 2.2.2 requires that users can pause, stop, or hide any auto-updating, moving, blinking, or scrolling content that starts automatically and lasts more than 5 seconds.

```typescript
// Any auto-playing content must have visible controls
<div>
  <button
    onClick={() => setIsPaused(!isPaused)}
    aria-label={isPaused ? "Resume animation" : "Pause animation"}
  >
    {isPaused ? "Play" : "Pause"}
  </button>
  <AnimatedContent isPaused={isPaused} />
</div>
```

### 2. Respect System Preferences

Always check `prefers-reduced-motion` and adjust behavior accordingly. Never assume all users want animation.

```typescript
// CSS-first approach (preferred for simple animations)
.element {
  /* No animation by default */
}

@media (prefers-reduced-motion: no-preference) {
  .element {
    animation: fadeIn 0.3s ease-out;
  }
}
```

### 3. Use Animation Purposefully

Animation should serve one of these purposes:

- **Orient the user:** Show where content came from or went (slide transitions)
- **Provide feedback:** Confirm an action happened (button press, form submit)
- **Show relationships:** Connect related elements (expanding a card to a detail view)
- **Direct attention:** Draw the eye to important changes (notification badge)

If an animation does not serve one of these purposes, it is decorative and should be the first to go under reduced motion.

### 4. Keep Animations Short

- **Micro-interactions:** 100-300ms (button feedback, toggle switches)
- **Transitions:** 200-500ms (page transitions, modal open/close)
- **Emphasis animations:** 500-1000ms (attention-drawing, one-time animations)
- **Anything longer than 1 second** needs a pause control

### 5. Avoid Animation on Large Areas

Large areas of motion are more likely to trigger vestibular disorders:

```typescript
// Avoid: Full-screen background animation
<div className="fixed inset-0 animate-gradient-shift" />

// Better: Small, contained animation
<div className="inline-block animate-pulse h-2 w-2 rounded-full bg-green-500" />
```

### 6. Test Both States

Always verify your UI works correctly with:

- `prefers-reduced-motion: no-preference` (animations enabled)
- `prefers-reduced-motion: reduce` (animations disabled)

Elements that animate into view must still be visible when animation is disabled. This is the most common bug: an element has `opacity: 0` as its initial state and relies on animation to become visible, but with animation disabled, it remains invisible.

```typescript
// Bug: Element invisible with reduced motion
.fade-in {
  opacity: 0;
  animation: fadeIn 0.3s forwards;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    /* BUG: opacity is still 0, element is invisible! */
  }
}

// Fix: Set final state when animation is removed
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
    opacity: 1;  /* Ensure element is visible */
  }
}
```

### 7. Document Animation Behavior

When building reusable components, document how they handle reduced motion:

```typescript
/**
 * Toast notification component.
 *
 * Animation behavior:
 * - Default: Slides in from top with fade, auto-dismisses with fade-out
 * - Reduced motion: Appears and disappears instantly, no slide or fade
 * - Always: Announced to screen readers via aria-live="polite"
 * - Auto-dismiss after 5 seconds (configurable via `duration` prop)
 * - Pause on hover/focus
 */
function Toast({ message, duration = 5000 }: ToastProps) {
  // ...
}
```

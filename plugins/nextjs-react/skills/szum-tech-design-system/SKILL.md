---
name: szum-tech-design-system
description: >
  Comprehensive reference for building UI with @szum-tech/design-system — a React component library
  built on Tailwind CSS 4+ and Radix UI. Use this skill whenever working in a project that imports
  from @szum-tech/design-system, when building or reviewing UI components, when choosing colors,
  typography, or layout styles, when deciding which component to use, or when creating new components
  following this design system's patterns. Covers the full color palette (OKLCH semantic tokens),
  all typography utility classes, every available component with its variants and props, animation
  classes, icon imports, and the CVA-based styling system. Always use this skill when the user
  asks about design tokens, Tailwind classes, or component APIs in the context of this library.
---

# @szum-tech/design-system — Complete Reference

## Installation & Setup

```bash
npm install tailwindcss @szum-tech/design-system
```

Consumer CSS file:

```css
@import "../../../../node_modules/tailwindcss/dist/lib.d.mts";
@import "@szum-tech/design-system/tailwind/global.css";

@source "../node_modules/@szum-tech/design-system";
```

## Imports

```typescript
// All components
import { Button, Card, Badge } from "@szum-tech/design-system";

// Individual component (tree-shaking)
import { Button } from "@szum-tech/design-system/components/button";

// Icons
import {
  GoogleLogoIcon,
  Auth0LogoIcon,
  XLogoIcon,
} from "@szum-tech/design-system/icons";

// Utilities
import { cn } from "@szum-tech/design-system/utils";

// Hooks
import { useComposedRefs } from "@szum-tech/design-system/hooks";
```

## Theme / Dark Mode

Dark mode is activated by adding `.dark` class to the root `<html>` element. All semantic color tokens automatically switch values.

---

## Color Palette

All colors are CSS Custom Properties in OKLCH color space, available as Tailwind classes.

### Semantic Tokens

| Token                                | Light                  | Dark                    | Usage                                      |
| ------------------------------------ | ---------------------- | ----------------------- | ------------------------------------------ |
| `background` / `foreground`          | white / near-black     | near-black / near-white | Page background and main text              |
| `primary` / `primary-foreground`     | blue-600 / blue-50     | blue-600 / blue-50      | Brand color, primary actions               |
| `secondary` / `secondary-foreground` | light gray / dark      | darker gray / white     | Secondary actions, subtle elements         |
| `muted` / `muted-foreground`         | light gray / gray      | dark gray / mid-gray    | Disabled states, placeholders, subtle text |
| `accent` / `accent-foreground`       | light gray / dark      | medium gray / white     | Hover states, highlighted items            |
| `success` / `success-foreground`     | green-600 / green-50   | green-700 / green-50    | Success states                             |
| `warning` / `warning-foreground`     | yellow-600 / yellow-50 | yellow-700 / yellow-50  | Warning states                             |
| `error` / `error-foreground`         | red-600 / red-50       | red-700 / red-50        | Error/destructive states                   |
| `border`                             | light gray             | white/10%               | Element borders                            |
| `input`                              | light gray             | white/15%               | Form input borders                         |
| `ring`                               | gray                   | mid-gray                | Focus ring color                           |
| `card` / `card-foreground`           | white / near-black     | dark / white            | Card backgrounds                           |
| `popover` / `popover-foreground`     | white / near-black     | medium dark / white     | Popover/dropdown backgrounds               |

### Sidebar Tokens

`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`

### Chart Tokens

`chart-1` through `chart-5` — blue scale (300→800) for data visualization.

### Using Colors in Tailwind

```tsx
// Background
<div className="bg-primary text-primary-foreground" />
<div className="bg-card text-card-foreground" />
<div className="bg-muted text-muted-foreground" />
<div className="bg-success/10 text-success border-success/20" />

// Borders
<div className="border border-border" />
<div className="ring ring-ring/50" />
```

### Border Radius

`--radius: 0.25rem` — components use `rounded` (0.25rem) by default.

---

## Typography

### Fonts

- `font-poppins` — primary sans-serif (headings, body)
- `font-code` — JetBrains Mono monospace (code)

### Typography Utility Classes

These are custom `@utility` classes — use them directly in `className`.

#### Display (hero text, landing pages)

| Class             | Size (mobile → desktop) | Weight        | Use for         |
| ----------------- | ----------------------- | ------------- | --------------- |
| `text-display-xl` | 3rem → 4.5rem           | 800 extrabold | Hero headlines  |
| `text-display-lg` | 2.5rem → 3.75rem        | 800 extrabold | Large hero text |
| `text-display-md` | 2rem → 3rem             | 700 bold      | Section heroes  |
| `text-display-sm` | 1.75rem → 2.25rem       | 700 bold      | Sub-heroes      |

#### Headings

| Class             | Size (mobile → desktop) | Weight       |
| ----------------- | ----------------------- | ------------ |
| `text-heading-h1` | 1.75rem → 2rem          | 700 bold     |
| `text-heading-h2` | 1.375rem → 1.5rem       | 600 semibold |
| `text-heading-h3` | 1.125rem → 1.25rem      | 600 semibold |
| `text-heading-h4` | 1rem → 1.125rem         | 600 semibold |

#### Body

| Class               | Size            | Weight | Line height |
| ------------------- | --------------- | ------ | ----------- |
| `text-body-xl`      | 1.25rem (20px)  | 400    | 1.6 relaxed |
| `text-body-lg`      | 1.125rem (18px) | 400    | 1.6 relaxed |
| `text-body-default` | 1rem (16px)     | 400    | 1.6 relaxed |
| `text-body-sm`      | 0.875rem (14px) | 400    | 1.5         |
| `text-body-xs`      | 0.75rem (12px)  | 400    | 1.5         |

#### Special Text

| Class             | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `text-lead`       | Large intro paragraph — `body-xl`, 1.7 line-height, `muted-foreground` color |
| `text-mute`       | Secondary/subtle text — `body-sm`, `muted-foreground` color                  |
| `text-small`      | Fine print — `body-xs`, `muted-foreground` color                             |
| `text-code`       | Inline code — JetBrains Mono, `bg-muted`, rounded, `px-1.5 py-0.5`           |
| `text-blockquote` | Quote block — left border `border-border`, `muted-foreground`, padded        |

```tsx
// Usage examples
<h1 className="text-display-xl font-poppins">Hero Title</h1>
<h2 className="text-heading-h2">Section Heading</h2>
<p className="text-body-default">Regular body text</p>
<p className="text-lead">Intro paragraph with subtle color</p>
<span className="text-mute">Helper text</span>
<code className="text-code">const x = 1</code>
```

---

## Animations

Custom Tailwind animation classes (defined in `animation.css`):

| Class                       | Effect                     | Use case                   |
| --------------------------- | -------------------------- | -------------------------- |
| `animate-slideDownAndFade`  | Fade in from above         | Tooltips opening downward  |
| `animate-slideUpAndFade`    | Fade in from below         | Tooltips opening upward    |
| `animate-slideLeftAndFade`  | Fade in from right         | Tooltips opening leftward  |
| `animate-slideRightAndFade` | Fade in from left          | Tooltips opening rightward |
| `animate-marquee`           | Horizontal infinite scroll | Marquee component          |
| `animate-marquee-vertical`  | Vertical infinite scroll   | Vertical marquee           |
| `animate-accordion-down`    | Expand accordion panel     | AccordionContent open      |
| `animate-accordion-up`      | Collapse accordion panel   | AccordionContent close     |

---

## Components

For full component details, see `references/components.md`.

### Quick Reference — All Components

**Form components:** `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Label`, `Field`, `FieldGroup`, `FieldSet`

**Feedback & status:** `Alert`, `AlertDialog`, `Badge`, `BadgeOverflow`, `Status`, `Spinner`, `Toaster`

**Layout & containers:** `Card`, `Separator`, `ScrollArea`, `Header`, `Masonry`

**Navigation:** `Tabs`, `Accordion`, `Stepper`

**Overlays:** `Dialog`, `Sheet`, `Tooltip`

**Content display:** `Avatar`, `Item`, `Timeline`, `Empty`, `Progress`, `Carousel`, `ColorSwatch`, `Marquee`

**Animated text:** `TypingText`, `WordRotate`, `CountingNumber`

**Icons:** `GoogleLogoIcon`, `Auth0LogoIcon`, `XLogoIcon`

---

## Core Patterns

### cn() for class merging

Always use `cn()` (combines clsx + tailwind-merge) when combining classes:

```typescript
import { cn } from "@szum-tech/design-system/utils";
className={cn("base-classes", conditional && "extra-class", className)}
```

### asChild pattern (polymorphic rendering)

Most interactive components support `asChild` via Radix UI Slot:

```tsx
<Button asChild>
  <a href="/about">About</a>
</Button>
```

### data-slot attributes

Components expose `data-slot="component-name"` for CSS targeting and testing selectors.

### CVA variants pattern

Variants are typed via `VariantProps<typeof componentVariants>` — TypeScript autocompletes all valid values.

---

Read `references/components.md` for the full API of every component with variants, props, and usage examples.

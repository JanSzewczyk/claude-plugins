# design

Design system & styling — skills for building UI with the Szum-Tech design system, Tailwind CSS v4, and CVA-based component conventions.

## Contents

### Skills

| Skill                       | Invoke with                | Description                                                                                                             |
| --------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **szum-tech-design-system** | `/szum-tech-design-system` | Complete reference for `@szum-tech/design-system` — color tokens, typography, all components, animations, icons         |
| **tailwind-css-4**          | `/tailwind-css-4`          | Tailwind CSS v4 — CSS-first config, `@theme` directive, design system integration, responsive patterns                  |
| **design-system-component** | `/design-system-component` | File structure, types, styles (CVA), context, store, barrel exports, and Storybook for React + TS + Tailwind components |
| **implement-design**        | `/implement-design`        | Inventory-first protocol for porting an external design (Claude Design output, mockup, screenshot, pasted JSX) onto DS components instead of reinventing them |

## Installation

### Copy skills

```bash
cp -r plugins/design/skills/szum-tech-design-system your-project/.claude/skills/
cp -r plugins/design/skills/tailwind-css-4          your-project/.claude/skills/
cp -r plugins/design/skills/design-system-component your-project/.claude/skills/
cp -r plugins/design/skills/implement-design        your-project/.claude/skills/
```

Or copy everything at once:

```bash
cp -r plugins/design/skills/* your-project/.claude/skills/
```

### Verify

```bash
ls your-project/.claude/skills/szum-tech-design-system/SKILL.md
```

## Usage

**Skills** — invoke any skill directly:

> `/szum-tech-design-system` — opens the design system reference (tokens, typography, components)
> `/tailwind-css-4` — opens the Tailwind v4 reference
> `/design-system-component` — scaffolds a new component following design system conventions

## Tech Stack Compatibility

| Technology   | Minimum Version |
| ------------ | --------------- |
| React        | 19+             |
| TypeScript   | 5.7+            |
| Tailwind CSS | 4.0+            |
| CVA          | 0.7+            |

## Troubleshooting

| Problem                          | Solution                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Tailwind v4 classes not working  | Verify `@import "tailwindcss"` in your CSS and that `@source` includes your component paths   |
| Design tokens missing            | Ensure `@szum-tech/design-system` is installed and its theme CSS is imported in your root CSS |
| Component scaffold paths differ  | Adapt the file structure in `design-system-component` to your project's conventions          |

## Related Plugins

- [**react**](../react/) — React 19 Compiler, hooks, component-driven UI
- [**nextjs**](../nextjs/) — App Router, Server Actions, error handling
- [**testing**](../testing/) — Storybook tests, Playwright E2E, accessibility audits

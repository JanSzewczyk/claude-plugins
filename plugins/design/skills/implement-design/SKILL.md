---
name: implement-design
description: >
  Implement UI in any project that imports from @szum-tech/design-system,
  especially when pasting output from Claude Design, porting a mockup,
  recreating a screenshot, or building a hero/landing/dashboard view. Use
  this skill BEFORE writing any JSX with components, classes, or design
  tokens — it enforces an inventory-first protocol that prevents the most
  common failure mode: reinventing components (Button, Card, Dialog, Input,
  etc.) that already exist in the DS, or using raw Tailwind utilities
  (text-gray-*, bg-white, hex colors) instead of semantic tokens. The
  primary argument is a Claude Design share URL of the form
  `https://api.anthropic.com/v1/design/h/<shareId>?open_file=<filename>`
  which the skill fetches directly; it also accepts pasted JSX/HTML, a
  screenshot, or a verbal spec as fallbacks. Optional quoted notes describe
  adjustments to apply (copy changes, color swaps, sections to skip).
  Trigger phrases: "build this view", "implement this design",
  "from Claude Design", "create landing page", "port mockup", "recreate
  this UI", "zbuduj ten widok", "zaimplementuj design", "z Claude Design".
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, mcp__context7__resolve-library-id, mcp__context7__get-library-docs
argument-hint: <claude-design-share-url> ["adjustment notes"]
---

# implement-design

Implement UI from an external design — a Claude Design share, mockup,
screenshot, or pasted JSX — using `@szum-tech/design-system` components instead
of reinventing primitives the DS already ships.

## Why inventory-first

Translating a design straight to code, a model defaults to raw HTML
(`<button>`, `<div className="rounded border">`) — that's what dominates its
training data. The result bypasses the DS, drifts from brand tokens, and rots
every time DS conventions change. The fix: **list every primitive and map each
to a DS component before writing any JSX.** Thirty seconds that save hours.

## Protocol

Do the steps in order. Don't skip Step 1 even for a "simple" design — the
inventory is what catches the silent reinvention.

### Step 0 — Acquire the source

The primary argument is a **Claude Design share URL**:

```
https://api.anthropic.com/v1/design/h/<shareId>?open_file=<filename>
```

`WebFetch` it as-is — public endpoint, returns the file named by `open_file`,
which is the screen to build (`+` = space, e.g. `Panel+sterowania.html`). Need a
different screen? Swap `open_file` and refetch.

No URL? Use whatever the user gave: pasted JSX/HTML (directly), a screenshot
(read visually), or a verbal spec. **If you can't actually see the source —
fetch failed, nothing pasted, no image — stop and ask. Never guess a layout.**

Hold any quoted notes (copy changes, color swaps, sections to skip, PL/EN)
aside; apply them as the final transform in Step 4.

### Step 1 — Inventory

List every visual primitive in the source as a table — and flag the rows the
notes will alter:

| Primitive | Count | Notes |
|---|---|---|
| Button (primary CTA) | 2 | "Get started", "View pricing" — *copy → PL* |
| Card | 3 | feature cards in grid |
| Badge | 1 | "New" in nav |
| Heading (display) | 1 | hero h1 |
| Icon (arrow-right) | 2 | in CTA buttons |

### Step 2 — Map to DS

Read `references/_index.md`. For each primitive, name the DS component or
utility that replaces it. Load `references/components/<name>.md` ONLY for
components you'll use — don't preload the library. These bundled docs are the
reference; if one doesn't cover a detail you need, read the component's types
directly from the installed package at
`node_modules/@szum-tech/design-system` rather than guessing.

Extend the inventory table with the mapping:

| Primitive | DS component / utility | Variant / props |
|---|---|---|
| Button (primary CTA) | `Button` | `variant="default" size="lg"` |
| Card | `Card` | default |
| Badge | `Badge` | `variant="default"` |
| Heading (display) | `text-display-xl` utility on `<h1>` | font-poppins |

**If a primitive has NO match in DS**, flag it. In step 4 it will be
implemented as plain HTML, but isolated in a clearly-named local component
(e.g. `RawCanvasChart`) so the gap is auditable later — and ideally promoted
upstream to DS in a future PR.

### Step 3 — Verify version

Compare the consumer's `@szum-tech/design-system` in `package.json` against the
snapshot version below — a stale snapshot makes you confidently wrong, so this
turns silent drift into an explicit decision:

- **Same minor (X.Y.\*)** or **older** → proceed (snapshot is forward-compatible).
- **Newer minor/major** → before using a component, grep
  `node_modules/@szum-tech/design-system` to confirm its props haven't changed.
- **Not installed** → stop and ask whether DS will be installed first.

### Step 4 — Implement

Only after steps 0–3. Apply the optional `notes` from step 0 as the final
transform on top of the mapped JSX.

**Never write:**

- raw `<button>`, `<input>`, `<select>`, `<dialog>`, `<a className="badge">`
- imports from `shadcn/ui`, `@radix-ui/*` directly (go through DS)
- hex colors, `rgb()`, or `hsl()`
- `text-gray-*`, `bg-white`, `bg-black`, `text-black`, `text-white` utilities

**Always use:**

- DS components from `@szum-tech/design-system`
- semantic color tokens: `text-foreground`, `bg-card`, `text-muted-foreground`,
  `border-border`, `bg-primary`, `text-primary-foreground`, etc.
- typography utilities: `text-display-xl`, `text-heading-h1`,
  `text-heading-h2`, `text-body-default`, `text-body-sm`, `text-lead`,
  `text-mute`, etc.
- `cn()` from `@szum-tech/design-system/utils` for class merging
- `asChild` for polymorphic rendering when wrapping `<Link>` or `<a>`

See `references/tokens.md` for the full color-token vocabulary and
`references/typography.md` for the text utility classes.

## Pitfalls

Mistakes that slip through even after the protocol — read once before Step 4:

- **Putting icons in `children`** — DS Button uses `startIcon` / `endIcon`
  props, not `children`. Wrong: `<Button><Icon /> Save</Button>`. Right:
  `<Button startIcon={<Icon />}>Save</Button>`.
- **Using `<a>` for navigation when you have `asChild`** — wrap with the
  framework Link via `asChild` instead, so styling and accessibility stay
  intact. Right: `<Button asChild><Link href="/x">Go</Link></Button>`.
- **Building a Card from scratch** — if DS exports `Card`, `CardHeader`,
  `CardContent`, use them. Don't write `<div className="rounded border p-4">`.
- **Assuming shadcn variant names** — Claude Design output uses shadcn
  variants that DON'T all exist in DS. The Button has `default, outline,
  secondary, ghost, error, link` — there is no `primary` and no
  `destructive`. Translate shadcn `variant="destructive"` → DS
  `variant="error"`; shadcn `variant="default"` stays `variant="default"`.
  Variant names differ per component (e.g. `Badge` and `Status` DO have a
  `primary` variant) — always confirm against that component's
  `references/components/<name>.md` before assuming.
- **Inventing a typography size** — don't use `text-4xl font-bold` for a
  hero. Use `text-display-xl` (it bundles size + weight + line height +
  responsive scaling).

## When this skill should NOT trigger

- Refactoring existing code that already uses DS correctly (no fresh design
  source) → use direct edits.
- Pure backend / data-layer changes → no UI surface.
- Modifying a single existing component's internal behavior without
  changing its visual surface → direct edit, no protocol needed.
- Projects that don't import `@szum-tech/design-system` → the protocol's
  output won't apply; let the model use whatever DS that project has.

<!-- AUTO-GENERATED BELOW — do not edit manually -->
## Snapshot version

`@szum-tech/design-system` **3.21.4** — generated 2026-05-30.
52 components indexed.
<!-- END AUTO-GENERATED -->

## References

Files under `references/` are loaded on demand — do not preload them all.

- [`references/_index.md`](references/_index.md) — components inventory
  with category grouping. **Always read first in step 2.**
- `references/components/<name>.md` — per-component docs (props, variants,
  examples, anti-patterns). Load only for components you'll use.
- `references/tokens.md` — semantic color tokens (light + dark). Load in
  step 4 when picking colors.
- `references/typography.md` — text utility classes. Load in step 4 when
  picking heading/body styles.

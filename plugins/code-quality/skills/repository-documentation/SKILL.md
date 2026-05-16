---
name: repository-documentation
description: >
  Generate or update a project's README.md plus a ready-to-paste GitHub
  repository description and topics list, following the Szum-Tech
  documentation standard. Auto-detects project type (web app, mobile app,
  npm package, CLI tool, monorepo, Claude plugin) by analyzing
  package.json, configs, and folder structure, then confirms with the user
  before generating. Use whenever the user asks to "create README",
  "update README", "document repository", "generate project docs",
  "GitHub description", "GitHub topics", or invokes
  /repository-documentation.
tags: [documentation, readme, github, project-setup, markdown]
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Repository Documentation

Generates production-grade README files matching the **Szum-Tech standard**
(see `references/section-standards.md` for the canonical structure) and
produces two extra GitHub artifacts the user can paste directly into the
repo settings:

1. **README.md** — created or updated in repository root
2. **GitHub description** — single sentence, ≤ 350 characters
3. **GitHub topics** — 5–20 lowercase-kebab-case tags

All output is in **English**, regardless of conversation language.

---

## Workflow

Follow these steps in order. Do not skip steps — each one feeds the next.

### Step 1 — Detect project type

Read configuration files in the repository root to determine the project
type. Apply the rules in `references/detection-rules.md`. Use parallel
`Read`/`Glob` calls for speed.

Files to probe (in priority order):

- `.claude-plugin/marketplace.json` or any `plugin.json` with `skills`/`agents` → **claude-plugin**
- `package.json` → check `dependencies`, `bin`, `workspaces`, `main`/`exports`
- `app.json`, `expo.json`, `metro.config.js` → **mobile-app**
- `pubspec.yaml` → **mobile-app** (Flutter)
- `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json` → **monorepo**
- `next.config.*`, `vite.config.*`, `app/` or `pages/` directory → **web-app**
- `bin/` directory or `package.json#bin` field → **cli-tool**
- npm package indicators: `main`, `module`, `exports`, `types`, `files`, `publishConfig` → **npm-package**
- nothing matches → **generic**

Build an **evidence list** (e.g., `["expo@~50 in deps", "app.json present", "metro.config.js"]`)
so you can show the user *why* you picked the type.

### Step 2 — Confirm type with user

Call `AskUserQuestion` with:

- The detected type as the recommended option (first, labeled "(Recommended)")
- 2–3 plausible alternatives based on the evidence
- Brief description for each option citing the evidence

If user picks "Other", ask a follow-up free-text question to capture the
custom type, then fall back to `templates/generic.md`.

### Step 3 — Gather metadata

First, extract everything you can from the filesystem without asking:

- **name** — `package.json#name` / `app.json#name` / directory name
- **description / tagline** — `package.json#description`
- **author** — `package.json#author` / git config
- **license** — `package.json#license` / `LICENSE` file
- **repo URL** — `package.json#repository.url` / git remote
- **node version** — `package.json#engines.node` / `.nvmrc`
- **package manager** — presence of `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, default `npm`
- **scripts** — `package.json#scripts`
- **key dependencies** — top frameworks from `dependencies` (React, Next, Expo, etc.)
- **directory tree** — `Glob` on `*` (depth 2) to build Project Structure section

If anything critical is missing, ask in ONE `AskUserQuestion` round (group
multiple questions). Critical fields per type are listed in each
`templates/<type>.md` file. Do not ask about things you can read from disk.

### Step 4 — Load the right template

Read `templates/<detected-type>.md`. The template uses `{{placeholders}}`
that map directly to fields gathered in Step 3.

### Step 5 — Merge with existing README (if any)

`Read` the current `README.md`. If present:

- **Preserve verbatim**: `Acknowledgments`, `Contact & Support`, `License`
  (if it points to a specific file), and any H2 sections not present in
  the template (treat them as user-authored).
- **Regenerate fresh**: header, Features, Getting Started, Scripts
  Overview, Testing, Project Structure, and all per-type sections —
  these reflect current code state.
- **Preserve the title** if the user clearly customized it (different
  from `package.json#name`).

If no README exists, skip this merge step.

### Step 6 — Generate README

Substitute placeholders, attach preserved sections at their original
positions, validate Markdown headings are properly nested (H1 → H2 → H3),
ensure the Table of Contents links match the actual section anchors.

Apply standards from `references/section-standards.md`:

- Centered header block with title, badges, tagline, nav links
- Emoji prefix on every H2/H3
- Language tags on every code fence
- Closing footer with "Back to Top" link

Pick badges from `references/badges-registry.md` matching the detected
stack (license, package version, build, coverage, etc.).

### Step 7 — Generate GitHub description

One sentence, ≤ 350 characters, English. Format:

> `{What it does} for {target users} — {key benefit / standout feature}.`

Example: `Enterprise-ready Next.js 16 template with TypeScript, Vitest,
Playwright, Storybook, and GitHub Actions CI/CD pre-configured for
production deployment.`

See `references/github-metadata.md` for examples per project type.

### Step 8 — Generate GitHub topics

5–20 tags, all `lowercase-kebab-case`, no spaces, no emoji, ≤ 50 chars
each. Compose from:

- Project type tag (e.g., `nextjs`, `expo`, `npm-package`, `cli`)
- Core frameworks/languages (`typescript`, `react`, `tailwindcss`)
- Notable tools/integrations (`vitest`, `playwright`, `storybook`)
- Domain tags (`design-system`, `boilerplate`, `template`, `monorepo`)

Prefer well-known GitHub topics (check that they exist on
github.com/topics if uncertain). Avoid niche names no one searches for.
See `references/github-metadata.md` for curated topic pools per type.

### Step 9 — Write & report

1. `Write` to `README.md` in repo root.
2. Output to the user (in a clean copy-pasteable block):
   - **GitHub description** (with character count)
   - **GitHub topics** (space-separated and as JSON array)
3. Summarize what was preserved from the previous README (if any).

---

## Quality bar (must-pass before finishing)

- [ ] Header is wrapped in `<div align="center">` and contains title + at least one badge + tagline
- [ ] Every H2 starts with an emoji
- [ ] Table of Contents links resolve (anchors match section titles)
- [ ] All code fences specify a language
- [ ] Project Structure tree reflects actual directories (verified with `Glob`)
- [ ] License section matches actual `LICENSE` file (read it; don't assume MIT)
- [ ] Scripts section lists scripts present in `package.json` (no invented commands)
- [ ] GitHub description ≤ 350 chars and contains no markdown
- [ ] GitHub topics: 5–20 items, all kebab-case, no duplicates
- [ ] No `{{placeholders}}` remain unsubstituted in the final file

---

## Files in this skill

- `templates/web-app.md` — Next.js / Vite / React SPA
- `templates/mobile-app.md` — React Native / Expo / Flutter
- `templates/npm-package.md` — Published library
- `templates/cli-tool.md` — Command-line tool
- `templates/monorepo.md` — Turborepo / Nx / pnpm workspaces
- `templates/claude-plugin.md` — This repo's plugin format
- `templates/generic.md` — Fallback
- `references/detection-rules.md` — Type detection signals
- `references/section-standards.md` — Canonical section structure & style
- `references/badges-registry.md` — shields.io badge catalog
- `references/github-metadata.md` — Description format + topics pools

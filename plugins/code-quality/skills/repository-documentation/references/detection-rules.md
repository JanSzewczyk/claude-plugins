# Project Type Detection Rules

Apply rules **in this priority order**. First match wins. Always collect
evidence so the user can verify the choice.

## 1. claude-plugin

**Strong signals (any one is sufficient):**
- `.claude-plugin/marketplace.json` exists
- `plugins/*/plugin.json` exists (this repo's pattern)
- A `plugin.json` in repo root with `skills` or `agents` field

**Confirmatory signals:**
- Directories named `skills/`, `agents/`, `hooks/`, `commands/`
- `SKILL.md` files anywhere

## 2. mobile-app

**Strong signals:**
- `app.json` or `app.config.js` with `expo` field → React Native + Expo
- `metro.config.js` → React Native (with or without Expo)
- `react-native` in `dependencies`
- `pubspec.yaml` → Flutter
- `ios/` AND `android/` directories at repo root

**Confirmatory signals:**
- `eas.json` → Expo Application Services
- `babel.config.js` referencing `babel-preset-expo`
- Directories `app/screens/`, `src/screens/`

## 3. monorepo

**Strong signals:**
- `turbo.json`
- `nx.json` or `workspace.json`
- `pnpm-workspace.yaml`
- `lerna.json`
- `package.json#workspaces` (array of paths)

**Confirmatory signals:**
- `packages/` or `apps/` directory with multiple sub-packages each having own `package.json`

## 4. cli-tool

**Strong signals:**
- `package.json#bin` field present
- Files in `bin/` with shebang (`#!/usr/bin/env node`)

**Confirmatory signals:**
- Dependencies: `commander`, `yargs`, `oclif`, `inquirer`, `clack`
- README/repo name ends in `-cli`

## 5. web-app

**Strong signals:**
- `next.config.{js,ts,mjs}` → Next.js
- `vite.config.{js,ts}` with `@vitejs/plugin-react` or similar → Vite SPA
- `app/` directory with `layout.tsx`/`page.tsx` → Next.js App Router
- `pages/` directory at root → Next.js Pages Router
- `astro.config.*` → Astro
- `remix.config.*` or `@remix-run/*` → Remix
- `svelte.config.*` → SvelteKit
- `gatsby-config.*` → Gatsby

**Confirmatory signals:**
- Deployment configs: `vercel.json`, `netlify.toml`
- `public/` with assets
- React/Vue/Svelte in dependencies

## 6. npm-package

**Strong signals (must have multiple):**
- `package.json#main`, `#module`, `#exports`, or `#types` pointing into `dist/`/`lib/`
- `package.json#files` array
- `package.json#publishConfig`
- `.npmignore` file
- Build script producing `dist/`

**Anti-signals (suggest NOT npm-package):**
- `next.config.*`, `vite.config.*` with app entry — likely web-app
- `"private": true` in package.json

## 7. generic (fallback)

Use when:
- No `package.json` (Python, Go, Rust, etc.)
- Detected stack doesn't match any of the above
- User explicitly chose "Other"

## Evidence format

Always present detection results as:

```
Detected type: web-app
Evidence:
  - next.config.ts present
  - "next": "^16.0.0" in dependencies
  - app/layout.tsx exists
  - vercel.json present
```

## Edge cases

- **Next.js + npm package** (rare): if `package.json#main` points to `dist/` AND `next.config.*` exists, ask the user — usually it's a web-app with a build output.
- **Monorepo containing apps + packages**: prefer `monorepo` template; per-package READMEs are out of scope for a single run.
- **Storybook-only repo**: treat as `npm-package` (component library) unless a top-level app exists.
- **Multiple frameworks present**: pick the one in `dependencies` (not `devDependencies`) and matching a config file.

# Project Type Detection Rules

Apply rules **in this priority order**. First match wins. Always collect
evidence so the user can verify the choice.

## 1. claude-plugin

**Strong signals (any one is sufficient):**
- `.claude-plugin/marketplace.json` exists
- `plugins/*/.claude-plugin/plugin.json` exists (this repo's pattern)
- A `.claude-plugin/plugin.json` (or a root `plugin.json`) with `skills` or `agents` field

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

## 7. python-service

**Strong signals (both required):**
- `pyproject.toml` whose `[project].dependencies` (or `[tool.poetry.dependencies]`) names a web
  framework: `fastapi`, `litestar`, `django`, `flask`, `starlette`
- A lockfile: `uv.lock`, `poetry.lock` or `pdm.lock` (a `requirements*.txt` alone also counts)

**Confirmatory signals:**
- An ASGI/WSGI server in dependencies: `uvicorn`, `granian`, `hypercorn`, `gunicorn`
- `src/<package>/main.py` with `create_app` / `FastAPI(`, or `manage.py` (Django)
- A committed `openapi.json` / `openapi.yaml`
- `.python-version`, `Makefile`, `Dockerfile`, `compose.yaml`, `.env.example`
- `gh repo view --json isTemplate` is `true` → a service template; the README gets the
  *Use This Template* section

**Anti-signals:** no web framework in the dependencies (a library, CLI or data project) → `generic`.

## 8. generic (fallback)

Use when:
- No `package.json` and no web-service signals (a Python library or CLI, Go, Rust, etc.)
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
- **Python service with a frontend** (`pyproject.toml` with FastAPI plus a `frontend/package.json`): a
  `package.json` at the root wins (`monorepo` or `web-app`); one only in a subfolder leaves it a
  `python-service`.
- **Multiple frameworks present**: pick the one in `dependencies` (not `devDependencies`) and matching a config file.

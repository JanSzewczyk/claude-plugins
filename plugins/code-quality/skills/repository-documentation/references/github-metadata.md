# GitHub Description & Topics

The skill produces two GitHub-specific artifacts the user pastes into
the repository **About** panel: a description and topics.

## GitHub description

**Hard constraints:**
- Single sentence
- ≤ 350 characters (GitHub's hard limit)
- Plain text — no Markdown, no links, no emoji
- English

**Format:**
> `{What it does} {for whom (optional)} — {key benefit / standout features / tech hint}.`

**Examples per type:**

- **web-app**: `Enterprise-ready Next.js 16 template with TypeScript, Tailwind CSS, Vitest, Playwright, Storybook, and GitHub Actions CI/CD pre-configured for fast, production-grade development.`
- **mobile-app**: `Cross-platform Expo + React Native starter with TypeScript, EAS Build, file-based routing, and Storybook for component-driven mobile development.`
- **npm-package**: `Type-safe React form builder powered by Zod schemas, with zero runtime dependencies and full SSR support.`
- **cli-tool**: `Command-line tool for scaffolding TypeScript monorepos with Turborepo, pnpm workspaces, and shared ESLint/Prettier configuration.`
- **monorepo**: `Turborepo monorepo containing the web app, mobile app, and shared design system, with end-to-end CI and Changesets-driven releases.`
- **claude-plugin**: `Claude Code marketplace plugin bundling skills and agents for Next.js, testing, and code-quality workflows used at Szum-Tech.`

**Anti-patterns:**
- ❌ "This is a project that..." (start with what it IS, not a self-reference)
- ❌ Multiple sentences
- ❌ Just listing technologies ("Next.js TypeScript Tailwind Vitest Playwright")
- ❌ Promotional fluff ("The best React template ever")

Always include the character count when reporting back to the user.

## GitHub topics

**Hard constraints:**
- 5–20 topics
- Each: `lowercase-kebab-case`, ≤ 50 chars, no spaces, no emoji
- No duplicates
- Prefer topics that exist on `github.com/topics/<topic>`

**Composition formula:**

```
{1 type tag} + {1-3 language tags} + {2-5 framework tags} + {1-3 tooling tags} + {1-3 domain tags}
```

### Curated topic pools

**Type tags (pick one):**
`nextjs`, `react`, `expo`, `react-native`, `flutter`, `vite`, `astro`, `remix`, `sveltekit`, `npm-package`, `cli`, `monorepo`, `turborepo`, `nx`, `claude-code`

**Language tags:**
`typescript`, `javascript`, `python`, `rust`, `go`, `dart`, `swift`, `kotlin`

**Framework / library tags:**
`react`, `nextjs`, `vue`, `svelte`, `tailwindcss`, `radix-ui`, `shadcn-ui`, `zod`, `react-query`, `redux`, `zustand`, `react-hook-form`, `prisma`, `drizzle-orm`, `trpc`

**Tooling tags:**
`vitest`, `jest`, `playwright`, `cypress`, `storybook`, `eslint`, `prettier`, `husky`, `lint-staged`, `commitlint`, `semantic-release`, `github-actions`, `dependabot`, `vercel`, `netlify`, `docker`, `pnpm`, `bun`

**Domain tags:**
`boilerplate`, `template`, `starter`, `starter-kit`, `design-system`, `component-library`, `documentation`, `cli-tool`, `automation`, `developer-tools`, `enterprise`, `production-ready`

### Examples per type

**web-app (Next.js template):**
```
nextjs typescript react tailwindcss vitest playwright storybook github-actions vercel template boilerplate enterprise
```

**mobile-app (Expo):**
```
expo react-native typescript ios android eas-build storybook nativewind mobile cross-platform
```

**npm-package (React form library):**
```
react typescript form-builder zod react-hook-form npm-package zero-dependencies ssr tree-shaking developer-tools
```

**cli-tool:**
```
cli typescript nodejs scaffolding monorepo turborepo pnpm developer-tools npm-package
```

**monorepo:**
```
monorepo turborepo pnpm typescript nextjs expo design-system shared-config changesets github-actions
```

**claude-plugin:**
```
claude-code claude-plugin skills agents marketplace nextjs react testing code-quality developer-tools automation
```

## GitHub automation (gh CLI)

After writing README.md, the skill applies the description and topics
automatically using `gh` CLI. The commands used internally are:

```bash
# Update description
gh repo edit --description "<description>"

# Replace all topics (PUT = full replace, not append)
gh api repos/<owner>/<repo>/topics -X PUT \
  -f "names[]=topic1" -f "names[]=topic2" ...
```

If `gh` is unavailable or not authenticated, the skill falls back to
printing manual commands in the final report.

## Output format to user

The final report uses a structured layout with status indicators:

```
─────────────────────────────────────────────────────────────────
 Repository Documentation — Complete
─────────────────────────────────────────────────────────────────

📄 README.md
   ✅ Written to repository root

   [If updating existing README:]
   Preserved:    Acknowledgments · Contact & Support · License
   Regenerated:  Header · Features · Getting Started · Scripts ·
                 Project Structure · [per-type sections]

─────────────────────────────────────────────────────────────────

🐙 GitHub repository
   ✅ Description updated (203/350 chars)
   ✅ Topics replaced (12 tags)

   Description (203/350 chars):
   Claude Code marketplace plugin bundling skills and agents for Next.js,
   testing, and code-quality workflows used at Szum-Tech.

   Topics (12):
   claude-code claude-plugin skills agents marketplace nextjs react
   testing code-quality typescript developer-tools automation

─────────────────────────────────────────────────────────────────
```

**On auth failure**, the GitHub section reads:
```
🐙 GitHub repository
   ⚠️  GitHub update skipped — gh not authenticated
      Run: gh auth login
      Then apply manually:
        gh repo edit --description "..."
        gh api repos/OWNER/REPO/topics -X PUT -f "names[]=t1" ...
```

**On other failure**, the GitHub section reads:
```
🐙 GitHub repository
   ❌  GitHub update failed — <short error message>
      Manual fallback:
        gh repo edit --description "..."
        gh api repos/OWNER/REPO/topics -X PUT -f "names[]=t1" ...
```

Always include the description text and topic list at the bottom of the
GitHub section regardless of whether automation succeeded or failed.

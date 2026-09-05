# code-quality

Code review, performance analysis, bundle optimization, and dependency management.

## Contents

### Agents

| Agent                    | Description                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **code-reviewer**        | Comprehensive code review — quality, performance, type safety, security, pattern compliance. Runs automated checks (TypeScript, ESLint, Prettier) before manual review. Integrates with JetBrains IDE for problem detection. |
| **performance-analyzer** | Analyze bundle size, React rendering efficiency, database queries, Core Web Vitals. Uses Next.js DevTools MCP for runtime diagnostics.                                                                                       |
| **library-updater**      | Update npm packages safely — investigate breaking changes, execute migrations, verify quality (type-check, lint, build, test) after updates.                                                                                 |

### Skills

| Skill                        | Invoke with                 | Description                                                                                                             |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **performance-optimization** | `/performance-optimization` | Bundle analysis, React rendering optimization, database query tuning, code splitting patterns                         |
| **update-deps**              | `/update-deps`              | Update npm dependencies in sequential, theme-grouped batches; verify + commit each group, pause on majors, full report |
| **dead-code**                | `/dead-code`                | Find unused files, exports, types, and dependencies via Knip's reachability graph; rank by confidence, propose safe removal |
| **repository-documentation** | `/repository-documentation` | Generate or update README.md plus a ready-to-paste GitHub description and topics list, per the Szum-Tech documentation standard |

## Installation

### 1. Copy agents

```bash
cp plugins/code-quality/agents/code-reviewer.md         your-project/.claude/agents/
cp plugins/code-quality/agents/performance-analyzer.md   your-project/.claude/agents/
cp plugins/code-quality/agents/library-updater.md        your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/code-quality/skills/*  your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/code-reviewer.md
ls your-project/.claude/skills/performance-optimization/SKILL.md
```

## Usage

**Code review** after implementing a feature:

> "Use code-reviewer to review the changes in features/checkout/"

The code-reviewer will:

1. Read project context and conventions
2. Run automated checks (`npm run type-check`, `npm run lint`)
3. Use JetBrains MCP for IDE-detected problems (if available)
4. Perform manual review with structured output

**Analyze performance:**

> "Use performance-analyzer to check the bundle size after adding the chart library"

**Update a dependency:**

> "Use library-updater to update React Hook Form to the latest version"

The library-updater workflow:

1. Checks current version and release notes (via Context7)
2. Identifies breaking changes
3. Updates package.json and runs `npm install`
4. Applies migrations
5. Runs verification suite (type-check, lint, build, test)

**Find dead code:**

> "Use dead-code to find unused exports and files in features/billing/"

The dead-code workflow:

1. Runs Knip (`npx knip --reporter json`) to build the unused-code graph — the expensive
   whole-repo pass happens once, deterministically, not via reading every file
2. Ranks candidates by confidence (unused file > export > type > enum/class member) and path
   risk with `scripts/rank-dead-code.mjs`
3. Verifies the top candidates by hand — checks for dynamic/string-based references,
   framework convention files, and public API surface before calling anything dead
4. Reports high-confidence removals plus a "needs a decision" list, and proposes the diff

## Cross-Plugin Skills

The `code-reviewer` agent references skills from other plugins for comprehensive reviews:

| Skill                    | From Plugin  | Used For                              |
| ------------------------ | ------------ | ------------------------------------- |
| accessibility-audit      | testing      | Checking a11y compliance              |
| server-actions           | nextjs       | Validating Server Action patterns     |
| react-19-compiler        | react        | Checking React Compiler compatibility |
| storybook-testing        | testing      | Reviewing component test quality      |
| tailwind-css-4           | design       | Validating Tailwind patterns          |
| performance-optimization | code-quality | Performance review                    |

Install skills from related plugins for the best review coverage.

## Troubleshooting

| Problem                                            | Solution                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code-reviewer misses project patterns              | Ensure `CLAUDE.md` describes your conventions                                                                                                             |
| JetBrains MCP not available                        | The code-reviewer works without it — MCP integration is optional for IDE problem detection                                                                |
| performance-analyzer shows wrong bundle sizes      | Run `npm run build` first to generate fresh build output                                                                                                  |
| library-updater breaks after update                | Run `npm run type-check && npm run lint && npm run build` to identify issues. Revert with `git checkout -- package.json package-lock.json && npm install` |
| code-reviewer flags patterns you intentionally use | Add exceptions to your `CLAUDE.md` under project conventions                                                                                              |
| Bundle analysis commands not found                 | Install `@next/bundle-analyzer` and add the `ANALYZE=true` environment variable                                                                           |
| dead-code flags Next.js `page.tsx`/`layout.tsx` etc. as unused | Configure Knip's Next.js plugin (or a `knip.json` with the right `entry` globs) so framework files are excluded before ranking                |
| Knip errors out on the project                     | Usually a missing/misconfigured `entry`/`project` glob in `knip.json` for a monorepo or non-standard layout — fix the config rather than falling back to a manual scan |

## Related Plugins

- [**nextjs**](../nextjs/) — Server Actions, error handling, and logging skills referenced during code review
- [**react**](../react/) — React Compiler skill referenced during code review
- [**design**](../design/) — Tailwind and design-system skills referenced during code review
- [**testing**](../testing/) — Testing skills referenced during review
- [**plugin-dev**](../plugin-dev/) — Marketplace auditing and plugin release tooling, split out of this plugin

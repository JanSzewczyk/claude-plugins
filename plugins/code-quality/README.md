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

| Skill                        | Invoke with                 | Description                                                                                   |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| **performance-optimization** | `/performance-optimization` | Bundle analysis, React rendering optimization, database query tuning, code splitting patterns |

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

## Cross-Plugin Skills

The `code-reviewer` agent references skills from other plugins for comprehensive reviews:

| Skill                    | From Plugin  | Used For                              |
| ------------------------ | ------------ | ------------------------------------- |
| accessibility-audit      | testing      | Checking a11y compliance              |
| server-actions           | nextjs-react | Validating Server Action patterns     |
| react-19-compiler        | nextjs-react | Checking React Compiler compatibility |
| storybook-testing        | testing      | Reviewing component test quality      |
| tailwind-css-4           | nextjs-react | Validating Tailwind patterns          |
| performance-optimization | code-quality | Performance review                    |

Install skills from related plugins for the best review coverage.

## Troubleshooting

| Problem                                            | Solution                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code-reviewer misses project patterns              | Ensure `.claude/project-context.md` and `CLAUDE.md` describe your conventions                                                                             |
| JetBrains MCP not available                        | The code-reviewer works without it — MCP integration is optional for IDE problem detection                                                                |
| performance-analyzer shows wrong bundle sizes      | Run `npm run build` first to generate fresh build output                                                                                                  |
| library-updater breaks after update                | Run `npm run type-check && npm run lint && npm run build` to identify issues. Revert with `git checkout -- package.json package-lock.json && npm install` |
| code-reviewer flags patterns you intentionally use | Add exceptions to your `CLAUDE.md` under project conventions                                                                                              |
| Bundle analysis commands not found                 | Install `@next/bundle-analyzer` and add the `ANALYZE=true` environment variable                                                                           |

## Related Plugins

- [**nextjs-react**](../nextjs-react/) — Skills referenced during code review
- [**testing**](../testing/) — Testing skills referenced during review
- [**dev-experience**](../dev-experience/) — Auto-formatting hooks complement code review

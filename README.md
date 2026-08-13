<div align="center">

# 🧩 Szum-Tech Claude Plugins

[![Claude Code](https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![GitHub stars](https://img.shields.io/github/stars/JanSzewczyk/claude-plugins?style=social)](https://github.com/JanSzewczyk/claude-plugins/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Shared skills and agents for Claude Code — covering Next.js, testing, Firebase, and more.**

[Plugins](#-plugins) • [Installation](#-installation) • [Usage](#-usage) • [Repository Structure](#-repository-structure)

</div>

---

## 👋 Hello there!

This repository is a [Claude Code](https://claude.com/claude-code) marketplace — a curated collection of **skills** and **agents** that extend Claude Code with domain-specific knowledge for modern full-stack development. Install a plugin once and every project you open gets access to specialist assistants that know your stack's conventions, patterns, and pitfalls.

The collection covers eight domains: Next.js development, React UI development, design systems & styling, testing strategy, code quality, Firebase architecture, product management orchestration, and AI tool integrations. Each plugin ships with ready-to-use agents and slash-command skills that Claude Code picks up automatically.

## ✨ Features

### 🤖 Specialist Agents

- **✨ [frontend-expert](./plugins/react/)** — React 19 specialist for UI components, Tailwind CSS v4, and design-system integration
- **✨ [nextjs-backend-engineer](./plugins/nextjs/)** — Server Actions, API routes, database operations, and authentication flows for Next.js
- **🧪 [testing-strategist](./plugins/testing/)** — Plans test coverage across unit, integration, and E2E layers
- **🧪 [storybook-tester](./plugins/testing/)** — Writes Storybook CSF Next stories and play-function interaction tests for component variants and edge cases
- **🧪 [unit-tester](./plugins/testing/)** — Writes Vitest unit tests for utilities, schemas, hooks, and Server Actions (with mocked dependencies)
- **🧹 [code-reviewer](./plugins/code-quality/)** — Comprehensive Next.js/React/TypeScript code review for quality, performance, and security
- **⚡ [performance-analyzer](./plugins/code-quality/)** — Bundle size, React rendering efficiency, and slow query analysis
- **📦 [library-updater](./plugins/code-quality/)** — Updates npm packages, investigates breaking changes, and verifies code quality post-update
- **🔥 [database-architect](./plugins/firebase/)** — Firebase Firestore schema design, data modeling, and architecture guidance
- **📋 [product-owner](./plugins/product-management/)** — Multi-phase PRD/TDD orchestrator that coordinates specialist agents across implementation phases

### 🛠️ Slash-Command Skills

- **⚛️ [react-19-compiler](./plugins/react/skills/react-19-compiler/)** — React 19 compiler patterns, memoization decisions, and Server Component boundaries
- **🎨 [tailwind-css-4](./plugins/design/skills/tailwind-css-4/)** — Tailwind CSS v4 CSS-first config, migration guide, and utility patterns
- **🔐 [t3-env-validation](./plugins/nextjs/skills/t3-env-validation/)** — Type-safe environment variables with T3 Env and Zod
- **⚡ [server-actions](./plugins/nextjs/skills/server-actions/)** — Next.js Server Actions with react-hook-form and Zod validation
- **📝 [structured-logging](./plugins/nextjs/skills/structured-logging/)** — Production logging patterns for Next.js applications
- **🔔 [toast-notifications](./plugins/nextjs/skills/toast-notifications/)** — Toast notification architecture and patterns
- **🚨 [error-handling](./plugins/nextjs/skills/error-handling/)** — Error boundaries, retry patterns, and validation-vs-runtime error handling
- **🎨 [design-system-component](./plugins/design/skills/design-system-component/)** — CVA-based component architecture following design system conventions
- **🎨 [szum-tech-design-system](./plugins/design/skills/szum-tech-design-system/)** — Reference for `@szum-tech/design-system` — OKLCH tokens, Radix UI components, Tailwind CSS v4
- **🧱 [implement-design](./plugins/design/skills/implement-design/)** — Inventory-first protocol for porting an external design (native Claude Design handoff, `/design-sync`'d project, mockup, screenshot, pasted JSX) onto DS components instead of reinventing them
- **📦 [generate-feature-package](./plugins/nextjs/skills/generate-feature-package/)** — Scaffolds a new `features/<name>/` domain package with zone folders and barrel files following the feature-architecture spec
- **📄 [devlogs](./plugins/nextjs/skills/devlogs/)** — Audits a LogLayer + Pino dev-session log (`tmp/app.log`) for missing context, sensitive-data leaks, and structured-logging violations
- **📖 [storybook-testing](./plugins/testing/skills/storybook-testing/)** — Storybook stories with browser-rendered interaction tests in CSF Next format
- **🏗️ [builder-factory](./plugins/testing/skills/builder-factory/)** — Type-safe test data builders and factories
- **🌐 [playwright-cli](./plugins/testing/skills/playwright-cli/)** — Playwright browser automation for E2E tests and web scraping
- **🖥️ [true-dom-tester](./plugins/testing/skills/true-dom-tester/)** — Accessibility-tree-based automated tests using Playwright CLI
- **🧪 [unit-testing](./plugins/testing/skills/unit-testing/)** — Vitest unit test patterns, mocking strategies, and examples
- **🎯 [coverage-gaps](./plugins/testing/skills/coverage-gaps/)** — Ranks the coverage gaps worth closing, weighting uncovered branches, critical paths, and git churn over line percentages
- **🔌 [api-test](./plugins/testing/skills/api-test/)** — API endpoint testing patterns and examples
- **♿ [accessibility-audit](./plugins/testing/skills/accessibility-audit/)** — WCAG accessibility audits, screen-reader testing, and motion/animation checks
- **⚡ [performance-optimization](./plugins/code-quality/skills/performance-optimization/)** — Bundle analysis, React rendering optimization, and database query tuning
- **📦 [update-deps](./plugins/code-quality/skills/update-deps/)** — Sequential, theme-grouped npm dependency updates with per-group verification, commits, and a final report
- **🔥 [firebase-firestore](./plugins/firebase/skills/firebase-firestore/)** — Firestore patterns, security rules, data types, and seeding
- **🔄 [db-migration](./plugins/firebase/skills/db-migration/)** — Firebase data migration scripts and patterns
- **📋 [prd-spec](./plugins/product-management/skills/prd-spec/)** — PRD and TDD document templates and generation
- **📓 [notebooklm](./plugins/ai-tools/skills/notebooklm/)** — NotebookLM automation via CLI and Python API
- **🎬 [youtube-scraper](./plugins/ai-tools/skills/youtube-scraper/)** — YouTube content extraction and transcript processing
- **🐦 [x-twitter-scraper](./plugins/ai-tools/skills/x-twitter-scraper/)** — Xquik REST API, MCP, SDK, monitor, export, and webhook workflow planning
- **🔦 [lighthouse-audit](./plugins/performance/skills/lighthouse-audit/)** — Automated Lighthouse audit with scored report and prioritized Next.js fix plan
- **🔗 [sync-rules](./plugins/shared-rules/skills/sync-rules/)** — Pulls canonical `.claude/rules/` files into any repo from a single source of truth, with hash-based drift detection

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🧩 Plugins](#-plugins)
- [📦 Installation](#-installation)
- [🚀 Usage](#-usage)
- [📁 Repository Structure](#-repository-structure)
- [🛠️ Conventions](#️-conventions)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [📧 Contact & Support](#-contact--support)

---

## 🧩 Plugins

| Plugin | Description | Agents | Skills | Guide |
| --- | --- | --- | --- | --- |
| [**nextjs**](./plugins/nextjs/) | Next.js App Router — Server Actions, logging, env validation, error handling | 1 | 7 | [README](./plugins/nextjs/README.md) |
| [**react**](./plugins/react/) | React 19 UI development — Compiler, hooks, components | 1 | 1 | [README](./plugins/react/README.md) |
| [**design**](./plugins/design/) | Design system & styling — Szum-Tech design system, Tailwind CSS v4, design porting | — | 4 | [README](./plugins/design/README.md) |
| [**testing**](./plugins/testing/) | Storybook, Playwright E2E, accessibility, test strategy | 3 | 8 | [README](./plugins/testing/README.md) |
| [**code-quality**](./plugins/code-quality/) | Code review, performance analysis, dependency management | 3 | 5 | [README](./plugins/code-quality/README.md) |
| [**firebase**](./plugins/firebase/) | Firebase Firestore, database architecture, migrations | 1 | 2 | [README](./plugins/firebase/README.md) |
| [**product-management**](./plugins/product-management/) | PRD/TDD orchestration, agent coordination | 1 | 1 | [README](./plugins/product-management/README.md) |
| [**ai-tools**](./plugins/ai-tools/) | NotebookLM automation, YouTube scraping, Xquik planning, AI integrations | — | 4 | — |
| [**performance**](./plugins/performance/) | Web performance auditing — Lighthouse, Core Web Vitals, fix planning | — | 1 | [README](./plugins/performance/README.md) |
| [**shared-rules**](./plugins/shared-rules/) | Single source of truth for `.claude/rules/` files across repos | — | 1 | [README](./plugins/shared-rules/README.md) |

**Total: 10 agents · 34 skills**

---

## 📦 Installation

### Via Marketplace (recommended)

#### 1. Add the marketplace

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
```

#### 2. Install a plugin

```bash
/plugin install nextjs@szum-tech
/plugin install react@szum-tech
/plugin install design@szum-tech
/plugin install testing@szum-tech
/plugin install code-quality@szum-tech
/plugin install firebase@szum-tech
/plugin install product-management@szum-tech
/plugin install ai-tools@szum-tech
/plugin install performance@szum-tech
/plugin install shared-rules@szum-tech
```

Or browse available plugins interactively:

```bash
/plugin
```

This opens a tabbed interface (Discover, Installed, Marketplaces) where you can browse and install plugins.

#### 3. Manage installed plugins

```bash
# List installed marketplaces
/plugin marketplace list

# Update marketplace to get latest plugins
/plugin marketplace update szum-tech

# Disable / enable / uninstall a plugin
/plugin disable testing@szum-tech
/plugin enable testing@szum-tech
/plugin uninstall testing@szum-tech
```

#### Install scope

Plugins can be installed at different scopes:

| Scope | Applies to | Command |
| --- | --- | --- |
| **user** | All your projects | `/plugin install nextjs@szum-tech --scope user` (default) |
| **project** | Current project (team) | `/plugin install nextjs@szum-tech --scope project` |
| **local** | Current project (local) | `/plugin install nextjs@szum-tech --scope local` |

#### Pre-configure for your team

Add the marketplace to your project's `.claude/settings.json` so all team members have access:

```json
{
  "extraKnownMarketplaces": {
    "szum-tech": {
      "source": {
        "source": "github",
        "repo": "JanSzewczyk/claude-plugins"
      }
    }
  }
}
```

### Manual Installation

#### 1. Clone the repository

```bash
git clone https://github.com/JanSzewczyk/claude-plugins.git
```

#### 2. Copy agents and skills

```bash
# Copy agents to your project
cp -r claude-plugins/plugins/<plugin-name>/agents/*.md  your-project/.claude/agents/

# Copy skills to your project
cp -r claude-plugins/plugins/<plugin-name>/skills/*     your-project/.claude/skills/
```

#### 3. Verify installation

```bash
ls your-project/.claude/agents/   # Should show agent .md files
ls your-project/.claude/skills/   # Should show skill directories
```

---

## 🚀 Usage

Once installed, skills are invoked with `/<skill-name>` and agents are referenced by name. Claude Code picks up agent definitions automatically when you mention the agent name.

### 🗺️ Pick the right agent or skill

```
What are you doing?
│
├── Building UI / styling / components
│   └── Agent: frontend-expert (react)
│       Skills: react-19-compiler (react), tailwind-css-4, design-system-component, szum-tech-design-system (design)
│
├── Server actions / API routes / database ops
│   └── Agent: nextjs-backend-engineer (nextjs)
│       Skills: server-actions, t3-env-validation, structured-logging, error-handling, toast-notifications
│
├── Scaffolding a new feature / domain / module
│   └── Skill: generate-feature-package (nextjs)
│
├── Database design / data modeling / migrations
│   └── Agent: database-architect (firebase)
│       Skills: firebase-firestore, db-migration
│
├── Writing tests
│   ├── Planning test strategy      → Agent: testing-strategist (testing)
│   ├── Component / Storybook tests → Agent: storybook-tester (testing)
│   │                                  Skills: storybook-testing, builder-factory
│   ├── DOM-based browser tests    → Skill: true-dom-tester (testing)
│   ├── Unit tests (Vitest)        → Agent: unit-tester (testing)
│   │                                  Skills: unit-testing, builder-factory
│   ├── API / E2E tests            → Skill: api-test, playwright-cli (testing)
│   ├── What's untested / gaps?    → Skill: coverage-gaps (testing)
│   └── Accessibility audit        → Skill: accessibility-audit (testing)
│
├── Code review / quality check
│   └── Agent: code-reviewer (code-quality)
│
├── Performance analysis / bundle optimization
│   └── Agent: performance-analyzer (code-quality)
│       Skill: performance-optimization
│
├── Updating dependencies
│   └── Agent: library-updater (code-quality)
│
├── Coordinating a full feature from PRD/TDD
│   └── Agent: product-owner (product-management)
│       Skill: prd-spec
│
└── Keeping shared .claude/rules/ files in sync across repos
    └── Skill: sync-rules (shared-rules)
```

### ⚡ Quick Reference

| I want to... | Use this |
| --- | --- |
| Build a React component | `frontend-expert` agent |
| Build with @szum-tech/design-system | `/szum-tech-design-system` skill |
| Create a design system component | `/design-system-component` skill |
| Scaffold a new feature package | `/generate-feature-package` skill |
| Create a server action | `nextjs-backend-engineer` agent |
| Write Storybook tests | `storybook-tester` agent |
| Plan which tests to write | `testing-strategist` agent |
| Write unit tests | `unit-tester` agent (or `/unit-testing` skill) |
| Find out what's untested and what to test first | `/coverage-gaps` skill |
| Review code quality | `code-reviewer` agent |
| Optimize performance | `performance-analyzer` agent |
| Run an accessibility audit | `/accessibility-audit` skill |
| Design a database schema | `database-architect` agent |
| Write a migration script | `/db-migration` skill |
| Update npm packages | `library-updater` agent |
| Add environment variables | `/t3-env-validation` skill |
| Add logging to my code | `/structured-logging` skill |
| Handle errors properly | `/error-handling` skill |
| Test an API endpoint | `/api-test` skill |
| Orchestrate a feature from PRD/TDD | `product-owner` agent |
| Write a PRD or TDD document | `/prd-spec` skill |
| Automate NotebookLM | `/notebooklm` skill |
| Scrape YouTube content | `/youtube-scraper` skill |
| Sync shared `.claude/rules/` files into this repo | `/sync-rules` skill |

---

## 📁 Repository Structure

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest listing all plugins
└── plugins/
    ├── nextjs/                    # Next.js full-stack development
    │   ├── plugin.json
    │   ├── agents/                # nextjs-backend-engineer
    │   └── skills/                # 7 skills (server-actions, error-handling, …)
    ├── react/                     # React 19 UI development
    │   ├── plugin.json
    │   ├── agents/                # frontend-expert
    │   └── skills/                # 1 skill (react-19-compiler)
    ├── design/                    # Design system & styling
    │   ├── plugin.json
    │   └── skills/                # 4 skills (szum-tech-design-system, tailwind-css-4, design-system-component, implement-design)
    ├── testing/                   # Testing strategies & QA
    │   ├── plugin.json
    │   ├── agents/                # testing-strategist, storybook-tester, unit-tester
    │   └── skills/                # 8 skills (unit-testing, coverage-gaps, storybook-testing, playwright-cli, …)
    ├── code-quality/              # Code review, performance & maintenance
    │   ├── plugin.json
    │   ├── agents/                # code-reviewer, performance-analyzer, library-updater
    │   └── skills/                # 5 skills (performance-optimization, update-deps, …)
    ├── firebase/                  # Firebase & database architecture
    │   ├── plugin.json
    │   ├── agents/                # database-architect
    │   └── skills/                # 2 skills (firebase-firestore, db-migration)
    ├── product-management/        # PRD/TDD orchestration & coordination
    │   ├── plugin.json
    │   ├── agents/                # product-owner
    │   └── skills/                # 1 skill (prd-spec)
    ├── ai-tools/                  # AI tool integrations & automation
    │   ├── plugin.json
    │   └── skills/                # 4 skills (notebooklm, youtube-scraper, kw-lookup, x-twitter-scraper)
    ├── performance/                # Web performance auditing
    │   ├── plugin.json
    │   └── skills/                # 1 skill (lighthouse-audit)
    └── shared-rules/               # Source of truth for .claude/rules/ files
        ├── plugin.json
        └── skills/                # 1 skill (sync-rules)
```

### 🗂️ Key Files

- **`.claude-plugin/marketplace.json`** — Marketplace manifest; Claude Code reads this to discover all plugins
- **`plugins/<name>/plugin.json`** — Plugin metadata: name, version, agent paths, skills directory
- **`plugins/<name>/agents/<agent>.md`** — Agent definition with YAML frontmatter (`name`, `model`, `tools`, `skills`)
- **`plugins/<name>/skills/<skill>/SKILL.md`** — Skill entry point; supporting docs live alongside it

---

## 🛠️ Conventions

- Plugin names use **kebab-case**
- Agent files are Markdown with YAML frontmatter (`name`, `version`, `model`, `tools`, `skills`)
- Skill directories contain `SKILL.md` as the entry point plus optional `examples.md`, `patterns.md`, `references/`, `templates/`
- Each `plugin.json` lists its agents as paths and its skills as a directory glob (`"./skills/"`)
- All paths in manifests are relative to the plugin directory
- Skills target **Next.js 15+**, **React 19+**, **TypeScript 5.7+** unless otherwise noted in the skill's `SKILL.md`
- Agents default to `model: sonnet`; the frontmatter can override this per-agent

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-skill`)
3. Add your skill or agent following the [conventions above](#️-conventions)
4. Update the plugin's `plugin.json` and the plugin's own `README.md` table
5. Open a Pull Request — describe which plugin is affected and what the new capability does

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/JanSzewczyk/claude-plugins/issues)
- ⭐ [Star this repository](https://github.com/JanSzewczyk/claude-plugins/stargazers)
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/JanSzewczyk)

---

<div align="center">

**Made with ❤️ by [Szum Tech Team](https://github.com/JanSzewczyk)**

If these plugins helped you, please consider giving them a ⭐ on GitHub!

[⬆ Back to Top](#-szum-tech-claude-plugins)

</div>

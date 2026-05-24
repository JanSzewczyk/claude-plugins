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

The collection covers six domains: React & Next.js development, testing strategy, code quality, Firebase architecture, product management orchestration, and AI tool integrations. Each plugin ships with ready-to-use agents and slash-command skills that Claude Code picks up automatically.

## ✨ Features

### 🤖 Specialist Agents

- **✨ [frontend-expert](./plugins/nextjs-react/)** — React 19 & Next.js App Router specialist for UI components, Tailwind CSS v4, and design-system integration
- **✨ [nextjs-backend-engineer](./plugins/nextjs-react/)** — Server Actions, API routes, database operations, and authentication flows for Next.js
- **🧪 [testing-strategist](./plugins/testing/)** — Plans test coverage across unit, integration, and E2E layers
- **🧪 [storybook-test-architect](./plugins/testing/)** — Writes Storybook CSF Next stories with interaction tests using the `.test()` method
- **🧪 [storybook-tester](./plugins/testing/)** — Creates Storybook stories and play functions for component variants
- **🧹 [code-reviewer](./plugins/code-quality/)** — Comprehensive Next.js/React/TypeScript code review for quality, performance, and security
- **⚡ [performance-analyzer](./plugins/code-quality/)** — Bundle size, React rendering efficiency, and slow query analysis
- **📦 [library-updater](./plugins/code-quality/)** — Updates npm packages, investigates breaking changes, and verifies code quality post-update
- **🔥 [database-architect](./plugins/firebase/)** — Firebase Firestore schema design, data modeling, and architecture guidance
- **📋 [product-owner](./plugins/product-management/)** — Multi-phase PRD/TDD orchestrator that coordinates specialist agents across implementation phases

### 🛠️ Slash-Command Skills

- **⚛️ [react-19-compiler](./plugins/nextjs-react/skills/react-19-compiler/)** — React 19 compiler patterns, memoization decisions, and Server Component boundaries
- **🎨 [tailwind-css-4](./plugins/nextjs-react/skills/tailwind-css-4/)** — Tailwind CSS v4 CSS-first config, migration guide, and utility patterns
- **🔐 [t3-env-validation](./plugins/nextjs-react/skills/t3-env-validation/)** — Type-safe environment variables with T3 Env and Zod
- **⚡ [server-actions](./plugins/nextjs-react/skills/server-actions/)** — Next.js Server Actions with react-hook-form and Zod validation
- **📝 [structured-logging](./plugins/nextjs-react/skills/structured-logging/)** — Production logging patterns for Next.js applications
- **🔔 [toast-notifications](./plugins/nextjs-react/skills/toast-notifications/)** — Toast notification architecture and patterns
- **🚨 [error-handling](./plugins/nextjs-react/skills/error-handling/)** — Error boundaries, retry patterns, and validation-vs-runtime error handling
- **🎨 [design-system-component](./plugins/nextjs-react/skills/design-system-component/)** — CVA-based component architecture following design system conventions
- **🎨 [szum-tech-design-system](./plugins/nextjs-react/skills/szum-tech-design-system/)** — Reference for `@szum-tech/design-system` — OKLCH tokens, Radix UI components, Tailwind CSS v4
- **📦 [generate-feature-package](./plugins/nextjs-react/skills/generate-feature-package/)** — Scaffolds a new `features/<name>/` domain package with zone folders and barrel files following the feature-architecture spec
- **📖 [storybook-testing](./plugins/testing/skills/storybook-testing/)** — Storybook stories with browser-rendered interaction tests in CSF Next format
- **🏗️ [builder-factory](./plugins/testing/skills/builder-factory/)** — Type-safe test data builders and factories
- **🌐 [playwright-cli](./plugins/testing/skills/playwright-cli/)** — Playwright browser automation for E2E tests and web scraping
- **🖥️ [true-dom-tester](./plugins/testing/skills/true-dom-tester/)** — Accessibility-tree-based automated tests using Playwright CLI
- **🧪 [unit-testing](./plugins/testing/skills/unit-testing/)** — Vitest unit test patterns, mocking strategies, and examples
- **🔌 [api-test](./plugins/testing/skills/api-test/)** — API endpoint testing patterns and examples
- **♿ [accessibility-audit](./plugins/testing/skills/accessibility-audit/)** — WCAG accessibility audits, screen-reader testing, and motion/animation checks
- **⚡ [performance-optimization](./plugins/code-quality/skills/performance-optimization/)** — Bundle analysis, React rendering optimization, and database query tuning
- **🔥 [firebase-firestore](./plugins/firebase/skills/firebase-firestore/)** — Firestore patterns, security rules, data types, and seeding
- **🔄 [db-migration](./plugins/firebase/skills/db-migration/)** — Firebase data migration scripts and patterns
- **📋 [prd-spec](./plugins/product-management/skills/prd-spec/)** — PRD and TDD document templates and generation
- **📓 [notebooklm](./plugins/ai-tools/skills/notebooklm/)** — NotebookLM automation via CLI and Python API
- **🎬 [youtube-scraper](./plugins/ai-tools/skills/youtube-scraper/)** — YouTube content extraction and transcript processing

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
| [**nextjs-react**](./plugins/nextjs-react/) | React 19 & Next.js App Router — full-stack development | 2 | 10 | [README](./plugins/nextjs-react/README.md) |
| [**testing**](./plugins/testing/) | Storybook, Playwright E2E, accessibility, test strategy | 3 | 7 | [README](./plugins/testing/README.md) |
| [**code-quality**](./plugins/code-quality/) | Code review, performance analysis, dependency management | 3 | 3 | [README](./plugins/code-quality/README.md) |
| [**firebase**](./plugins/firebase/) | Firebase Firestore, database architecture, migrations | 1 | 2 | [README](./plugins/firebase/README.md) |
| [**product-management**](./plugins/product-management/) | PRD/TDD orchestration, agent coordination | 1 | 1 | [README](./plugins/product-management/README.md) |
| [**ai-tools**](./plugins/ai-tools/) | NotebookLM automation, YouTube scraping, AI integrations | — | 3 | — |

**Total: 10 agents · 26 skills**

---

## 📦 Installation

### Via Marketplace (recommended)

#### 1. Add the marketplace

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
```

#### 2. Install a plugin

```bash
/plugin install nextjs-react@szum-tech
/plugin install testing@szum-tech
/plugin install code-quality@szum-tech
/plugin install firebase@szum-tech
/plugin install product-management@szum-tech
/plugin install ai-tools@szum-tech
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
| **user** | All your projects | `/plugin install nextjs-react@szum-tech --scope user` (default) |
| **project** | Current project (team) | `/plugin install nextjs-react@szum-tech --scope project` |
| **local** | Current project (local) | `/plugin install nextjs-react@szum-tech --scope local` |

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
│   └── Agent: frontend-expert (nextjs-react)
│       Skills: react-19-compiler, tailwind-css-4, design-system-component, szum-tech-design-system
│
├── Server actions / API routes / database ops
│   └── Agent: nextjs-backend-engineer (nextjs-react)
│       Skills: server-actions, t3-env-validation, structured-logging, error-handling, toast-notifications
│
├── Scaffolding a new feature / domain / module
│   └── Skill: generate-feature-package (nextjs-react)
│
├── Database design / data modeling / migrations
│   └── Agent: database-architect (firebase)
│       Skills: firebase-firestore, db-migration
│
├── Writing tests
│   ├── Planning test strategy      → Agent: testing-strategist (testing)
│   ├── Component / Storybook tests → Agent: storybook-test-architect (testing)
│   │                                  Skills: storybook-testing, builder-factory
│   ├── DOM-based browser tests    → Skill: true-dom-tester (testing)
│   ├── Unit tests (Vitest)        → Skill: unit-testing (testing)
│   ├── API / E2E tests            → Skill: api-test, playwright-cli (testing)
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
└── Coordinating a full feature from PRD/TDD
    └── Agent: product-owner (product-management)
        Skill: prd-spec
```

### ⚡ Quick Reference

| I want to... | Use this |
| --- | --- |
| Build a React component | `frontend-expert` agent |
| Build with @szum-tech/design-system | `/szum-tech-design-system` skill |
| Create a design system component | `/design-system-component` skill |
| Scaffold a new feature package | `/generate-feature-package` skill |
| Create a server action | `nextjs-backend-engineer` agent |
| Write Storybook tests | `storybook-test-architect` agent |
| Plan which tests to write | `testing-strategist` agent |
| Write unit tests | `/unit-testing` skill |
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

---

## 📁 Repository Structure

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest listing all plugins
└── plugins/
    ├── nextjs-react/              # React 19 & Next.js full-stack development
    │   ├── plugin.json
    │   ├── agents/                # frontend-expert, nextjs-backend-engineer
    │   └── skills/                # 10 skills (react-19-compiler, tailwind-css-4, …)
    ├── testing/                   # Testing strategies & QA
    │   ├── plugin.json
    │   ├── agents/                # testing-strategist, storybook-test-architect, storybook-tester
    │   └── skills/                # 7 skills (storybook-testing, playwright-cli, …)
    ├── code-quality/              # Code review, performance & maintenance
    │   ├── plugin.json
    │   ├── agents/                # code-reviewer, performance-analyzer, library-updater
    │   └── skills/                # 3 skills (performance-optimization, …)
    ├── firebase/                  # Firebase & database architecture
    │   ├── plugin.json
    │   ├── agents/                # database-architect
    │   └── skills/                # 2 skills (firebase-firestore, db-migration)
    ├── product-management/        # PRD/TDD orchestration & coordination
    │   ├── plugin.json
    │   ├── agents/                # product-owner
    │   └── skills/                # 1 skill (prd-spec)
    └── ai-tools/                  # AI tool integrations & automation
        ├── plugin.json
        └── skills/                # 3 skills (notebooklm, youtube-scraper, kw-lookup)
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

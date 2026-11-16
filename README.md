<div align="center">

# 🧩 Szum-Tech Claude Plugins

[![Claude Code](https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![GitHub stars](https://img.shields.io/github/stars/JanSzewczyk/claude-plugins?style=social)](https://github.com/JanSzewczyk/claude-plugins/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Shared skills and agents for Claude Code — organized by technology: TypeScript, React, Next.js, Python, Firebase, and more.**

[Plugins](#-plugins) • [Installation](#-installation) • [Usage](#-usage) • [Repository Structure](#-repository-structure)

</div>

---

## 👋 Hello there!

This repository is a [Claude Code](https://claude.com/claude-code) marketplace — a curated collection of **skills** and **agents** that extend Claude Code with domain-specific knowledge for modern full-stack development. Install a plugin once and every project you open gets access to specialist assistants that know your stack's conventions, patterns, and pitfalls.

Technology plugins are layered — a technology-agnostic **testing** core, the **typescript** and **python** language layers, then **react**, **nextjs** and **firebase** on top, with **design** for Tailwind CSS and the design system — so you install only the stack you work in, and a new technology is a new plugin. Alongside them sit technology-agnostic plugins: repository maintenance, product management orchestration, AI tool integrations, Git workflow on GitHub, prose quality for messages and posts, and Claude Code plugin authoring itself. Each plugin ships with ready-to-use agents and slash-command skills that Claude Code picks up automatically.

## ✨ Features

### 🤖 Specialist Agents

- **✨ [frontend-expert](./plugins/react/)** — React 19 specialist for UI components, Tailwind CSS v4, and design-system integration
- **✨ [nextjs-developer](./plugins/nextjs/)** — Implements Next.js App Router pages, server actions and services with their tests under the team rules, then runs the project's checks
- **🕵️ [qa-engineer](./plugins/testing/)** — Black-box QA of any app (web, API, CLI, library): runs a given list of flows or builds one from the spec, drives the browser with Playwright CLI, reports pass/fail per flow and what to fix
- **🧪 [nextjs-tester](./plugins/nextjs/)** — Independent tests for a Next.js feature from its acceptance criteria, at the cheapest sensible layer; defects as failing tests
- **🧪 [storybook-tester](./plugins/react/)** — Writes Storybook CSF Next stories and play-function interaction tests for component variants and edge cases
- **🐍 [python-developer](./plugins/python/)** — Writes and fixes Python code with its pytest tests under the team rules, then runs Ruff, the type checker and the tests
- **🏛️ [python-api-architect](./plugins/python/)** — Read-only architecture advice for Python APIs: domain modules or hexagonal modules, with a layout and a hand-off
- **🧪 [python-tester](./plugins/python/)** — Black-box tests for a Python API from its contract: every documented status, Schemathesis, guards proved by removing them, flaky and coverage checks; reports defects as failing tests
- **🔎 [python-reviewer](./plugins/python/)** — Read-only review of Python code against the team rules: runs the checks, reproduces each finding and returns a verdict with a findings table
- **🧪 [unit-tester](./plugins/typescript/)** — Writes Vitest unit tests for utilities, schemas, hooks, and Server Actions (with mocked dependencies)
- **🧹 [code-reviewer](./plugins/nextjs/)** — Review of Next.js/React/TypeScript changes against the team rules: runs the checks, reproduces each finding, returns a verdict with a findings table
- **⚡ [performance-analyzer](./plugins/nextjs/)** — Bundle size, React rendering efficiency, and slow query analysis
- **📦 [library-updater](./plugins/typescript/)** — Updates npm packages, investigates breaking changes, and verifies code quality post-update
- **🔥 [database-architect](./plugins/firebase/)** — Firebase Firestore schema design, data modeling, and architecture guidance
- **📋 [product-owner](./plugins/product-management/)** — Multi-phase PRD/TDD orchestrator that coordinates specialist agents across implementation phases
- **📚 [librarian](./plugins/knowledge-dev/)** — Reviews knowledge notes for what scripts cannot judge: duplicates, contradictions, API facts posing as decisions and unsupported sources

### 🛠️ Slash-Command Skills

- **⚛️ [react-19-compiler](./plugins/react/skills/react-19-compiler/)** — Enable and verify the React Compiler, migrate off manual memoization
- **🎨 [tailwind-css-4](./plugins/design/skills/tailwind-css-4/)** — Tailwind CSS v4 CSS-first config, migration guide, and utility patterns
- **🚀 [run-nextjs-task](./plugins/nextjs/skills/run-nextjs-task/)** — Runs one planned task (an SDD brief or task id) through developer, tester and reviewer agents for a Next.js app, with no questions
- **🔐 [setup-app-infrastructure](./plugins/nextjs/skills/setup-app-infrastructure/)** — Adds T3 Env validation, LogLayer logging, ServiceError and retry, server action result types and cookie toasts to a Next.js project
- **🎨 [design-system-component](./plugins/design/skills/design-system-component/)** — CVA-based component architecture following design system conventions
- **🎨 [szum-tech-design-system](./plugins/design/skills/szum-tech-design-system/)** — Reference for `@szum-tech/design-system` — OKLCH tokens, Radix UI components, Tailwind CSS v4
- **🧱 [implement-design](./plugins/design/skills/implement-design/)** — Inventory-first protocol for porting an external design (native Claude Design handoff, `/design-sync`'d project, mockup, screenshot, pasted JSX) onto DS components instead of reinventing them
- **📦 [generate-feature-package](./plugins/nextjs/skills/generate-feature-package/)** — Scaffolds a new `features/<name>/` domain package with zone folders and barrel files following the feature-architecture spec
- **📄 [devlogs](./plugins/nextjs/skills/devlogs/)** — Audits a LogLayer + Pino dev-session log (`tmp/app.log`) for missing context, sensitive-data leaks, and logging-rule violations
- **📖 [create-stories](./plugins/react/skills/create-stories/)** — Create or update a component's Storybook stories with browser-rendered `.test()` interaction tests in CSF Next format
- **🏗️ [builder-factory](./plugins/typescript/skills/builder-factory/)** — Type-safe test data builders and factories
- **🌐 [playwright-cli](./plugins/testing/skills/playwright-cli/)** — Playwright browser automation for E2E tests and web scraping
- **🖥️ [true-dom-tester](./plugins/testing/skills/true-dom-tester/)** — Accessibility-tree-based automated tests using Playwright CLI
- **🧪 [unit-testing](./plugins/typescript/skills/unit-testing/)** — Vitest unit test patterns, mocking strategies, and examples
- **🎯 [coverage-gaps](./plugins/typescript/skills/coverage-gaps/)** — Ranks the coverage gaps worth closing, weighting uncovered branches, critical paths, and git churn over line percentages
- **🔌 [api-test](./plugins/nextjs/skills/api-test/)** — API endpoint testing patterns and examples
- **♿ [accessibility-audit](./plugins/react/skills/accessibility-audit/)** — WCAG accessibility audits, screen-reader testing, and motion/animation checks
- **⚡ [performance-optimization](./plugins/nextjs/skills/performance-optimization/)** — Bundle analysis, React rendering optimization, and database query tuning
- **📦 [update-deps](./plugins/code-quality/skills/update-deps/)** — Sequential, theme-grouped dependency updates for Node, and in beta for Python and Java/JVM: detects the ecosystem, loads only its profile, verifies per group, commits on its own branch and ships a pull request with the final report
- **🧹 [dead-code](./plugins/typescript/skills/dead-code/)** — Finds unused files, exports, types, and dependencies via Knip's reachability graph, then ranks and verifies before proposing removals
- **📖 [repository-documentation](./plugins/code-quality/skills/repository-documentation/)** — Generates or updates README.md plus a ready-to-paste GitHub description and topics list
- **🧬 [template-sync](./plugins/code-quality/skills/template-sync/)** — Finds what a GitHub template repository changed since your project was created from it and writes an ordered catch-up plan
- **🩺 [marketplace-creator](./plugins/plugin-dev/skills/marketplace-creator/)** — Creates, maintains and audits a plugin marketplace: entries and sources, hosting, renames and removals, relevance — and finds drift between the manifest layers and the docs that enumerate them by hand
- **🧩 [plugin-creator](./plugins/plugin-dev/skills/plugin-creator/)** — Creates, extends, debugs and audits a Claude Code plugin: manifest, skills, agents, hooks, MCP servers, `userConfig`, dependencies, evals and release readiness
- **🏷️ [plugin-release](./plugins/plugin-dev/skills/plugin-release/)** — On request, works out which plugins changed, proposes the semver bump each change implies, writes it into `plugin.json` once you agree, and tags the release
- **🧰 [plugin-setup](./plugins/plugin-dev/skills/plugin-setup/)** — Writes the plugin-development workflow into another project's `CLAUDE.md` and optionally adds CI that fails a PR with drift or a missing version bump
- **🧱 [mod-creator](./plugins/plugin-dev/skills/mod-creator/)** — Builds, tests, debugs and audits Claude Code mods: plugins whose hooks module draws panes, bands and toasts, adds commands, or guards tool calls
- **🔎 [skill-audit](./plugins/skill-dev/skills/skill-audit/)** — Audits one skill for authoring quality — triggering, context budget, dead references, and prose that does not earn its tokens
- **🔬 [skill-ab-optimizer](./plugins/skill-dev/skills/skill-ab-optimizer/)** — A/B tests skill wording and accepts a change only when the measured outcome improves
- **🧩 [workflow-creator](./plugins/skill-dev/skills/workflow-creator/)** — Creates, audits and optimizes Claude Code dynamic workflow scripts (`agent()` / `pipeline()` / `parallel()`)
- **🪜 [workflow-skill-creator](./plugins/skill-dev/skills/workflow-skill-creator/)** — Creates, reworks and audits multi-step workflow skills, choosing the lightest tier (prose guide to gated pipeline) that keeps the step order
- **🔥 [firebase-firestore](./plugins/firebase/skills/firebase-firestore/)** — Firestore patterns, security rules, data types, and seeding
- **🔄 [db-migration](./plugins/firebase/skills/db-migration/)** — Firebase data migration scripts and patterns
- **📋 [prd-spec](./plugins/product-management/skills/prd-spec/)** — PRD and TDD document templates and generation
- **📓 [notebooklm](./plugins/ai-tools/skills/notebooklm/)** — NotebookLM automation via CLI and Python API
- **🎬 [youtube-scraper](./plugins/ai-tools/skills/youtube-scraper/)** — YouTube content extraction and transcript processing
- **🏠 [kw-lookup](./plugins/ai-tools/skills/kw-lookup/)** — Looks up a Polish property by land register (KW) number: address, parcels, owners, rights and mortgages
- **🔦 [lighthouse-audit](./plugins/nextjs/skills/lighthouse-audit/)** — Automated Lighthouse audit with scored report and prioritized Next.js fix plan
- **📚 [knowledge-author](./plugins/knowledge-dev/skills/knowledge-author/)** — Writes and extracts one-decision-per-file rule notes in `knowledge/`, builds them into the skills and agents that apply them, and checks for drift
- **🔁 [python-api-team](./plugins/python/skills/python-api-team/)** — Runs the architect, developer, tester and reviewer in turn with hand-offs, decision stops and a collected list of rule proposals
- **▶️ [run-python-task](./plugins/python/skills/run-python-task/)** — Runs one already-planned task (an orchestrator brief or a task id) through developer, tester and reviewer with no questions, following the brief's git instructions
- **🏗️ [api-architecture-rules](./plugins/python/skills/api-architecture-rules/)** — Chooses and lays out the architecture of a Python (FastAPI) API: domain modules, and hexagonal layers where a module needs them
- **🔗 [sync-rules](./plugins/shared-rules/skills/sync-rules/)** — Pulls canonical `.claude/rules/` files into any repo from a single source of truth, with hash-based drift detection
- **🌿 [create-branch](./plugins/git-workflow/skills/create-branch/)** — Creates a branch off a freshly fetched default branch, named `<type>/<english-kebab-case>` from your work or your hint
- **💾 [create-commit](./plugins/git-workflow/skills/create-commit/)** — Splits uncommitted work into logical commits, each message in Conventional Commits format, never with AI attribution
- **🔀 [create-pull-request](./plugins/git-workflow/skills/create-pull-request/)** — Pushes the branch if needed and opens a GitHub PR with a unified five-section description, shown for approval first
- **🚢 [ship-task](./plugins/git-workflow/skills/ship-task/)** — Carries one task through branch, change, verification, commits and a pull request, using the three skills above; other skills can hand it the same flow
- **🏗️ [github-repo-init](./plugins/github/skills/github-repo-init/)** — Creates a new GitHub repository from your own template and configures merge, Dependabot, security, Actions and a protected default branch, every decision approved first
- **🩺 [github-repo-audit](./plugins/github/skills/github-repo-audit/)** — Audits an existing repository's settings against the same baseline — including required checks that never run and release bots a ruleset would block — and fixes what you approve
- **✍️ [humanize](./plugins/writing/skills/humanize/)** — Writes, edits or reviews messages, emails and posts so they are short, consistent and free of AI-sounding filler, keeping your voice; humanizes drafts and files without touching code; fires on any request for such text

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
| [**testing**](./plugins/testing/) | Technology-agnostic testing core — Playwright, DOM-based test generation, black-box QA engineer agent | 1 | 2 | [README](./plugins/testing/README.md) |
| [**typescript**](./plugins/typescript/) | TypeScript & JavaScript — typescript-rules, Vitest unit tests, mimicry-js builders, coverage gaps, dead-code sweeps, npm package updates | 2 | 6 | [README](./plugins/typescript/README.md) |
| [**python**](./plugins/python/) | Python — developer, API-architect, tester and reviewer agents, API architecture guide, team conventions (Ruff, uv, typing, errors, logging, documentation, asyncio, security), pytest and FastAPI rules, and factory_boy test data rules | 4 | 8 | [README](./plugins/python/README.md) |
| [**react**](./plugins/react/) | React 19 — react-rules, the Compiler, Storybook interaction tests, accessibility audits | 2 | 6 | [README](./plugins/react/README.md) |
| [**design**](./plugins/design/) | Design system & styling — Szum-Tech design system, Tailwind CSS v4, design porting | — | 4 | [README](./plugins/design/README.md) |
| [**nextjs**](./plugins/nextjs/) | Next.js App Router — SDD task flow with developer, tester and reviewer agents, nextjs-rules, app setup, API tests, performance and Lighthouse audits | 4 | 8 | [README](./plugins/nextjs/README.md) |
| [**firebase**](./plugins/firebase/) | Firebase Firestore, database architecture, migrations | 1 | 2 | [README](./plugins/firebase/README.md) |
| [**code-quality**](./plugins/code-quality/) | Repository maintenance — README generation, template-repository sync, dependency updates across ecosystems | — | 3 | [README](./plugins/code-quality/README.md) |
| [**product-management**](./plugins/product-management/) | PRD/TDD orchestration, agent coordination | 1 | 1 | [README](./plugins/product-management/README.md) |
| [**ai-tools**](./plugins/ai-tools/) | NotebookLM automation, YouTube search, Polish land register (KW) lookup | — | 3 | [README](./plugins/ai-tools/README.md) |
| [**plugin-dev**](./plugins/plugin-dev/) | Plugin and marketplace authoring — create and audit plugins and marketplaces, mods, semver tagging, project setup | — | 5 | [README](./plugins/plugin-dev/README.md) |
| [**skill-dev**](./plugins/skill-dev/) | Skill authoring craft — quality audits of one skill, and A/B testing wording changes, dynamic workflow scripts, workflow skills | — | 4 | [README](./plugins/skill-dev/README.md) |
| [**shared-rules**](./plugins/shared-rules/) | Single source of truth for `.claude/rules/` files across repos | — | 1 | [README](./plugins/shared-rules/README.md) |
| [**git-workflow**](./plugins/git-workflow/) | Git workflow on GitHub — branches, Conventional Commits, pull requests, whole tasks from branch to PR | — | 4 | [README](./plugins/git-workflow/README.md) |
| [**knowledge-dev**](./plugins/knowledge-dev/) | Shared knowledge base tooling — author rule notes, build them into skills and agents, check drift in CI | 1 | 1 | [README](./plugins/knowledge-dev/README.md) |
| [**github**](./plugins/github/) | GitHub repository administration — create a repository from your template or audit an existing one, every decision approved | — | 2 | [README](./plugins/github/README.md) |
| [**writing**](./plugins/writing/) | Prose quality — write, edit or review messages, emails and posts: short, consistent, no AI-sounding filler | — | 1 | [README](./plugins/writing/README.md) |

**Total: 16 agents · 60 skills**

Technology plugins depend only downward, and installing one installs what it depends on:

```
testing  ←  typescript  ←  react  ←  nextjs  ←  firebase
                              ↑         ↑
                            design ─────┘
python (standalone)
```

### Migrating from the domain layout

Earlier versions grouped plugins by domain. Agents and skills keep their names; only the plugin
(the namespace prefix) changed. The `performance` plugin is gone — `lighthouse-audit` is in `nextjs`.

| Was | Now |
| --- | --- |
| `testing:unit-tester`, `unit-testing`, `builder-factory`, `coverage-gaps`, `builder-rules-ts` | `typescript:…` |
| `testing:storybook-tester`, `create-stories`, `storybook-rules`, `accessibility-audit` | `react:…` |
| `testing:testing-strategist`, `api-test` | `nextjs:nextjs-tester`, `nextjs:api-test` |
| `nextjs:nextjs-backend-engineer`, `nextjs:testing-strategist` | `nextjs:nextjs-developer`, `nextjs:nextjs-tester` |
| `nextjs:server-actions`, `error-handling`, `structured-logging`, `t3-env-validation`, `toast-notifications` | the `nextjs:nextjs-rules` knowledge skill and `nextjs:setup-app-infrastructure` |
| `testing:builder-rules-py` | `python:builder-rules` |
| `code-quality:code-reviewer`, `performance-analyzer`, `performance-optimization` | `nextjs:…` |
| `code-quality:library-updater`, `dead-code` | `typescript:…` |
| `typescript:update-deps` | `code-quality:update-deps` |
| `performance:lighthouse-audit` | `nextjs:lighthouse-audit` |

---

## 📦 Installation

### Via Marketplace (recommended)

#### 1. Add the marketplace

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
```

#### 2. Install a plugin

```bash
/plugin install testing@szum-tech
/plugin install typescript@szum-tech
/plugin install python@szum-tech
/plugin install react@szum-tech
/plugin install design@szum-tech
/plugin install nextjs@szum-tech
/plugin install firebase@szum-tech
/plugin install code-quality@szum-tech
/plugin install product-management@szum-tech
/plugin install ai-tools@szum-tech
/plugin install plugin-dev@szum-tech
/plugin install shared-rules@szum-tech
/plugin install git-workflow@szum-tech
/plugin install knowledge-dev@szum-tech
/plugin install github@szum-tech
/plugin install writing@szum-tech
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
│       Skills: react-rules (react, preloaded), tailwind-css-4, design-system-component, szum-tech-design-system (design)
│
├── Server actions / API routes / database ops
│   └── Agent: nextjs-developer (nextjs)
│       Skills: nextjs-rules (preloaded), setup-app-infrastructure
│
├── Scaffolding a new feature / domain / module
│   └── Skill: generate-feature-package (nextjs)
│
├── Database design / data modeling / migrations
│   └── Agent: database-architect (firebase)
│       Skills: firebase-firestore, db-migration
│
├── QA of a running app / feature / flows → Agent: qa-engineer (testing)
│
├── Writing tests
│   ├── Tests from criteria         → Agent: nextjs-tester (nextjs)
│   ├── Component / Storybook tests → Agent: storybook-tester (react)
│   │                                  Skills: create-stories (react), builder-factory (typescript)
│   ├── DOM-based browser tests    → Skill: true-dom-tester (testing)
│   ├── Unit tests (Vitest)        → Agent: unit-tester (typescript)
│   │                                  Skills: unit-testing, builder-factory (typescript)
│   ├── API tests                  → Skill: api-test (nextjs)
│   ├── E2E / browser automation   → Skill: playwright-cli (testing)
│   ├── What's untested / gaps?    → Skill: coverage-gaps (typescript)
│   └── Accessibility audit        → Skill: accessibility-audit (react)
│
├── Writing Python code, or structuring a Python API
│   ├── Implementation + tests     → Agent: python-developer (python)
│   ├── Full build + verify flow   → Skill: python-api-team (python)
│   ├── One planned task           → Skill: run-python-task (python)
│   ├── Black-box tests / guards   → Agent: python-tester (python)
│   ├── Review against the rules   → Agent: python-reviewer (python)
│   └── Architecture / layout      → Agent: python-api-architect, Skill: api-architecture-rules (python)
│
├── Code review / quality check
│   └── Agent: code-reviewer (nextjs)
│
├── Performance analysis / bundle optimization
│   └── Agent: performance-analyzer (nextjs)
│       Skills: performance-optimization, lighthouse-audit
│
├── Updating dependencies / removing dead code
│   ├── Several packages, any ecosystem → Skill: update-deps (code-quality)
│   ├── One npm package            → Agent: library-updater (typescript)
│   └── Unused code                → Skill: dead-code (typescript)
│
├── Coordinating a full feature from PRD/TDD
│   └── Agent: product-owner (product-management)
│       Skill: prd-spec
│
├── Keeping shared .claude/rules/ files in sync across repos
│   └── Skill: sync-rules (shared-rules)
│
├── Branching, committing, opening a pull request, or doing a whole task through to one
│   └── Skills: create-branch, create-commit, create-pull-request, ship-task (git-workflow)
│
├── Creating a new GitHub repository, or auditing the settings of an existing one
│   └── Skills: github-repo-init, github-repo-audit (github)
│
└── Writing or tightening a message, email or post, or checking if it reads as AI
    └── Skill: humanize (writing)
```

### ⚡ Quick Reference

| I want to... | Use this |
| --- | --- |
| Build a React component | `frontend-expert` agent |
| Build with @szum-tech/design-system | `/szum-tech-design-system` skill |
| Create a design system component | `/design-system-component` skill |
| Scaffold a new feature package | `/generate-feature-package` skill |
| Create a server action | `nextjs-developer` agent |
| Write Storybook tests | `storybook-tester` agent |
| Write tests from acceptance criteria | `nextjs-tester` agent |
| Write unit tests | `unit-tester` agent (or `/unit-testing` skill) |
| Write Python code and its tests | `python-developer` agent |
| Decide how a Python API is structured | `python-api-architect` agent (or `/api-architecture-rules` skill) |
| Build and verify a Python API end to end | `/python-api-team` skill |
| Run one planned task (SDD brief or task id) with tests and review | `/run-python-task` skill |
| Test a Python API from its contract, prove a guard | `python-tester` agent |
| Review Python code against the team rules | `python-reviewer` agent |
| Find out what's untested and what to test first | `/coverage-gaps` skill |
| Review code quality | `code-reviewer` agent |
| Optimize performance | `performance-analyzer` agent |
| Run an accessibility audit | `/accessibility-audit` skill |
| Design a database schema | `database-architect` agent |
| Write a migration script | `/db-migration` skill |
| Update npm packages | `library-updater` agent |
| Add environment variables, logging or ServiceError | `/setup-app-infrastructure` skill |
| Run one planned Next.js task (SDD brief or task id) with tests and review | `/run-nextjs-task` skill |
| Test an API endpoint | `/api-test` skill |
| Orchestrate a feature from PRD/TDD | `product-owner` agent |
| Write a PRD or TDD document | `/prd-spec` skill |
| Automate NotebookLM | `/notebooklm` skill |
| Scrape YouTube content | `/youtube-scraper` skill |
| Sync shared `.claude/rules/` files into this repo | `/sync-rules` skill |
| Start a new branch for the work at hand | `/create-branch` skill |
| Commit what I just changed | `/create-commit` skill |
| Open a pull request for this branch | `/create-pull-request` skill |
| Do a task on its own branch and open a PR | `/ship-task` skill |
| Create a new GitHub repository with sane settings | `/github-repo-init` skill |
| Check and fix the settings of an existing repository | `/github-repo-audit` skill |
| Write or shorten a message so it does not sound like AI | `/humanize` skill (fires on its own) |

---

## 📁 Repository Structure

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json          # Marketplace manifest listing all plugins
├── knowledge/                    # Shared rule notes, one decision per file, built into skills
└── plugins/
    ├── testing/                   # Technology-agnostic testing core
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # qa-engineer
    │   └── skills/                # 2 skills (playwright-cli, true-dom-tester)
    ├── typescript/                # TypeScript & JavaScript language layer
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # unit-tester, library-updater
    │   └── skills/                # 6 skills (unit-testing, builder-factory, coverage-gaps, dead-code, generated builder-rules-ts, typescript-rules)
    ├── python/                    # Python language layer
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # python-developer, python-api-architect, python-tester, python-reviewer
    │   └── skills/                # 8 skills (api-architecture-rules, python-api-team, run-python-task, generated builder-rules, python-rules, python-project-rules, pytest-rules, fastapi-rules)
    ├── react/                     # React 19 UI development
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # frontend-expert, storybook-tester
    │   └── skills/                # 6 skills (react-19-compiler, create-stories, accessibility-audit, generated storybook-rules, component-test-rules, react-rules)
    ├── design/                    # Design system & styling
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 4 skills (szum-tech-design-system, tailwind-css-4, design-system-component, implement-design)
    ├── nextjs/                    # Next.js full-stack development
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # nextjs-developer, nextjs-tester, code-reviewer, performance-analyzer
    │   └── skills/                # 8 skills (run-nextjs-task, setup-app-infrastructure, generated nextjs-rules, api-test, lighthouse-audit, …)
    ├── firebase/                  # Firebase & database architecture
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # database-architect
    │   └── skills/                # 2 skills (firebase-firestore, db-migration)
    ├── code-quality/              # Repository maintenance
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 3 skills (repository-documentation, template-sync, update-deps)
    ├── product-management/        # PRD/TDD orchestration & coordination
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # product-owner
    │   └── skills/                # 1 skill (prd-spec)
    ├── ai-tools/                  # AI tool integrations & automation
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 3 skills (notebooklm, youtube-scraper, kw-lookup)
    ├── plugin-dev/                 # Plugin & marketplace authoring, releases
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 5 skills (plugin-creator, marketplace-creator, plugin-release, plugin-setup, mod-creator)
    ├── skill-dev/                  # Skill authoring quality & A/B testing
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 4 skills (skill-audit, skill-ab-optimizer, workflow-creator, workflow-skill-creator)
    ├── shared-rules/               # Source of truth for .claude/rules/ files
    │   ├── .claude-plugin/plugin.json
    │   └── skills/                # 1 skill (sync-rules)
    ├── git-workflow/               # Branches, commits, pull requests
    │   ├── .claude-plugin/plugin.json
    │   ├── references/            # Shared conventions for all its skills
    │   └── skills/                # 4 skills (create-branch, create-commit, create-pull-request, ship-task)
    ├── knowledge-dev/              # Knowledge base authoring and build
    │   ├── .claude-plugin/plugin.json
    │   ├── agents/                # librarian
    │   └── skills/                # 1 skill (knowledge-author)
    ├── github/                     # GitHub repository administration
    │   ├── .claude-plugin/plugin.json
    │   ├── references/            # Settings baseline shared by both skills
    │   ├── scripts/               # read-settings.mjs, apply-plan.mjs
    │   └── skills/                # 2 skills (github-repo-init, github-repo-audit)
    └── writing/                    # Prose quality for text meant for people
        ├── .claude-plugin/plugin.json
        └── skills/                # 1 skill (humanize)
```

### 🗂️ Key Files

- **`.claude-plugin/marketplace.json`** — Marketplace manifest; Claude Code reads this to discover all plugins
- **`plugins/<name>/.claude-plugin/plugin.json`** — Plugin metadata: name, version, agent paths, skills directory
- **`plugins/<name>/agents/<agent>.md`** — Agent definition with YAML frontmatter (`name`, `model`, `tools`, `skills`)
- **`plugins/<name>/skills/<skill>/SKILL.md`** — Skill entry point; supporting docs live alongside it
- **`knowledge/`** — Shared rule notes; `references/rules.md`, the `BEGIN:knowledge` blocks and the `*-rules` skills are generated from them

---

## 🛠️ Conventions

- Plugin names use **kebab-case**
- Technology plugins are named after the technology (`typescript`, `python`, `react`, `nextjs`); a skill lives in the most general one whose stack it needs, and agents preload only from their own plugin or a lower layer
- Agent files are Markdown with YAML frontmatter (`name`, `version`, `model`, `tools`, `skills`)
- Skill directories contain `SKILL.md` as the entry point plus optional `examples.md`, `patterns.md`, `references/`, `templates/`
- Each `plugin.json` lists its agents as paths and its skills as a directory glob (`"./skills/"`)
- All paths in manifests are relative to the plugin directory
- Each skill names the languages and stack it targets in its description; shared rules carry theirs in `applies`
- Agents default to `model: sonnet`; the frontmatter can override this per-agent

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-skill`)
3. Add your skill or agent following the [conventions above](#️-conventions)
4. Update the plugin's `.claude-plugin/plugin.json` and the plugin's own `README.md` table
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

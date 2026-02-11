# Szum-Tech Claude Plugins

Shared skills, agents, and developer tools for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the CLI-based AI coding assistant.

## Available Plugins

| Plugin                                          | What's inside                                                               | Install                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| [**nextjs-react**](./plugins/nextjs-react/)     | 2 agents + 7 skills for React 19 & Next.js full-stack development           | [Guide](./plugins/nextjs-react/README.md)   |
| [**testing**](./plugins/testing/)               | 2 agents + 5 skills for Storybook, Playwright, accessibility, test strategy | [Guide](./plugins/testing/README.md)        |
| [**code-quality**](./plugins/code-quality/)     | 3 agents + 1 skill for code review, performance, dependency management      | [Guide](./plugins/code-quality/README.md)   |
| [**firebase-auth**](./plugins/firebase-auth/)   | 1 agent + 3 skills for Firebase Firestore, migrations, Clerk auth           | [Guide](./plugins/firebase-auth/README.md)  |
| [**dev-experience**](./plugins/dev-experience/) | Statusline (cost/tokens/context tracking), safety hooks, auto-formatting    | [Guide](./plugins/dev-experience/README.md) |

## Installation

### Via Marketplace (recommended)

#### 1. Add the marketplace

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
```

#### 2. Install a plugin

```bash
/plugin install testing@szum-tech
/plugin install nextjs-react@szum-tech
/plugin install code-quality@szum-tech
/plugin install firebase-auth@szum-tech
/plugin install dev-experience@szum-tech
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

| Scope       | Applies to              | Command                                                    |
| ----------- | ----------------------- | ---------------------------------------------------------- |
| **user**    | All your projects       | `/plugin install testing@szum-tech --scope user` (default) |
| **project** | Current project (team)  | `/plugin install testing@szum-tech --scope project`        |
| **local**   | Current project (local) | `/plugin install testing@szum-tech --scope local`          |

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

If you prefer manual setup:

#### 1. Clone the repository

```bash
git clone https://github.com/JanSzewczyk/claude-plugins.git
```

#### 2. Copy agents and skills

```bash
# Copy agents to your project
cp -r claude-plugins/plugins/<plugin-name>/agents/*.md  your-project/.claude/agents/

# Copy skills to your project
cp -r claude-plugins/plugins/<plugin-name>/skills/*      your-project/.claude/skills/
```

Or install the dev-experience plugin with the automated script:

```bash
bash claude-plugins/plugins/dev-experience/install.sh --all
```

#### 3. Verify installation

```bash
ls your-project/.claude/agents/   # Should show agent .md files
ls your-project/.claude/skills/   # Should show skill directories
```

## Which Agent or Skill Should I Use?

### By Task Type

```
What are you doing?
│
├── Building UI / styling / components
│   └── Agent: frontend-expert (nextjs-react)
│       Skills: react-19-compiler, tailwind-css-4
│
├── Server actions / API routes / database ops
│   └── Agent: nextjs-backend-engineer (nextjs-react)
│       Skills: server-actions, t3-env-validation, structured-logging, error-handling, toast-notifications
│
├── Database design / data modeling / migrations
│   └── Agent: database-architect (firebase-auth)
│       Skills: firebase-firestore, db-migration
│
├── Authentication / Clerk / session management
│   └── Skill: clerk-auth-proxy (firebase-auth)
│
├── Writing tests
│   ├── Planning test strategy → Agent: testing-strategist (testing)
│   ├── Component / Storybook tests → Agent: storybook-test-architect (testing)
│   │   Skills: storybook-testing, builder-factory
│   ├── Unit tests (Vitest) → Skill: unit-testing (testing)
│   ├── API / E2E tests → Skill: api-test, playwright-cli (testing)
│   └── Accessibility audit → Skill: accessibility-audit (testing)
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
└── Developer experience / safety
    └── Plugin: dev-experience (statusline, hooks)
```

### Quick Reference

| I want to...               | Use this                         |
| -------------------------- | -------------------------------- |
| Build a React component    | `frontend-expert` agent          |
| Create a server action     | `nextjs-backend-engineer` agent  |
| Write Storybook tests      | `storybook-test-architect` agent |
| Plan which tests to write  | `testing-strategist` agent       |
| Write unit tests           | `/unit-testing` skill            |
| Review code quality        | `code-reviewer` agent            |
| Optimize performance       | `performance-analyzer` agent     |
| Run an accessibility audit | `/accessibility-audit` skill     |
| Design a database schema   | `database-architect` agent       |
| Write a migration script   | `/db-migration` skill            |
| Set up Clerk auth          | `/clerk-auth-proxy` skill        |
| Update npm packages        | `library-updater` agent          |
| Add environment variables  | `/t3-env-validation` skill       |
| Add logging to my code     | `/structured-logging` skill      |
| Handle errors properly     | `/error-handling` skill          |
| Test an API endpoint       | `/api-test` skill                |

## How Plugins Work

### Agents

Agents are specialized AI assistants defined as Markdown files with YAML frontmatter. They have a specific role, model preference, available tools, and skills they can invoke.

```
.claude/agents/frontend-expert.md
```

Use them in Claude Code by referencing the agent name — Claude will pick up the agent definition automatically.

### Skills

Skills are reusable knowledge modules — collections of patterns, examples, and best practices. Each skill is a directory with:

- `SKILL.md` — main documentation and instructions
- `examples.md` — practical code examples
- `patterns.md` — best practices (optional)
- Additional reference files as needed

Invoke a skill with `/skill-name` (e.g., `/server-actions`) in Claude Code.

### Assets (dev-experience)

The dev-experience plugin provides configuration files (statusline script, hooks) rather than agents/skills. These are installed into your `.claude/` directory.

## Repository Structure

```
claude-plugins/
  .claude-plugin/
    marketplace.json                # Marketplace manifest
  plugins/
    nextjs-react/                   # React & Next.js development
      plugin.json
      agents/
      skills/
    testing/                        # Testing & QA
      plugin.json
      agents/
      skills/
    code-quality/                   # Code review & performance
      plugin.json
      agents/
      skills/
    firebase-auth/                  # Firebase & Clerk auth
      plugin.json
      agents/
      skills/
    dev-experience/                 # Statusline & hooks
      plugin.json
      install.sh
      statusline/
      hooks/
```

## Compatibility

- **Claude Code** CLI
- Agents use `model: sonnet` by default (configurable in frontmatter)
- Skills are framework-aware — most target **Next.js 16+**, **React 19+**, **TypeScript 5.9+**
- dev-experience statusline requires **bash** (jq optional but recommended)

## License

MIT

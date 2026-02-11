# Szum-Tech Claude Plugins

Shared skills, agents, and developer tools for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the CLI-based AI coding assistant.

## Available Plugins

| Plugin | What's inside | Install |
|--------|--------------|---------|
| [**nextjs-react**](./plugins/nextjs-react/) | 2 agents + 7 skills for React 19 & Next.js full-stack development | [Guide](./plugins/nextjs-react/README.md) |
| [**testing**](./plugins/testing/) | 2 agents + 5 skills for Storybook, Playwright, accessibility, test strategy | [Guide](./plugins/testing/README.md) |
| [**code-quality**](./plugins/code-quality/) | 3 agents + 1 skill for code review, performance, dependency management | [Guide](./plugins/code-quality/README.md) |
| [**firebase-auth**](./plugins/firebase-auth/) | 1 agent + 3 skills for Firebase Firestore, migrations, Clerk auth | [Guide](./plugins/firebase-auth/README.md) |
| [**dev-experience**](./plugins/dev-experience/) | Statusline (cost/tokens/context tracking), safety hooks, auto-formatting | [Guide](./plugins/dev-experience/README.md) |

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/JanSzewczyk/claude-plugins.git
```

### 2. Install a plugin

Each plugin has its own installation guide. The general process:

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

### 3. Verify installation

```bash
ls your-project/.claude/agents/   # Should show agent .md files
ls your-project/.claude/skills/   # Should show skill directories
```

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

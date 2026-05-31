# react

React development — an agent and skills for building modern React 19 user interfaces with the React Compiler, new hooks, and component-driven architecture.

## Contents

### Agents

| Agent               | Description                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **frontend-expert** | Build UI components, style with Tailwind CSS, integrate design systems, fix UI bugs. Defaults to Server Components, uses React Compiler. |

### Skills

| Skill                 | Invoke with          | Description                                                       |
| --------------------- | -------------------- | ----------------------------------------------------------------- |
| **react-19-compiler** | `/react-19-compiler` | React 19 hooks, React Compiler optimization, memoization decisions |

## Installation

### 1. Copy the agent

```bash
cp plugins/react/agents/frontend-expert.md your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/react/skills/react-19-compiler your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/frontend-expert.md
ls your-project/.claude/skills/react-19-compiler/SKILL.md
```

## Usage

**Frontend work** — Claude will use the `frontend-expert` agent automatically for UI tasks, or you can invoke it directly:

> "Use frontend-expert to build a user profile card"

**Skills** — invoke directly:

> `/react-19-compiler` — opens React 19 hooks and Compiler optimization guidance

## Tech Stack Compatibility

| Technology | Minimum Version |
| ---------- | --------------- |
| React      | 19+             |
| TypeScript | 5.7+            |

## Troubleshooting

| Problem                                          | Solution                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Agent doesn't pick up project conventions        | Ensure `.claude/project-context.md` exists and describes your design system and component layout  |
| Agent references skills from other plugins       | `frontend-expert` also uses skills from the **design** and **testing** plugins — install them too |
| React Compiler guidance assumes a Next.js setup  | The patterns apply to any React 19 toolchain; adapt the build config to your bundler              |

## Related Plugins

- [**design**](../design/) — Szum-Tech design system, Tailwind CSS v4, component conventions
- [**nextjs**](../nextjs/) — App Router, Server Actions, error handling
- [**testing**](../testing/) — Storybook tests, Playwright E2E, accessibility audits
- [**code-quality**](../code-quality/) — Code review, performance analysis

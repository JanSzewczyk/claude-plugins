# product-management

Product management orchestration — parse PRD/TDD documents and coordinate specialist agents across implementation phases.

## Contents

### Agents

| Agent             | Description                                                                                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **product-owner** | Multi-phase orchestrator. Reads PRD/TDD documents, breaks them into a task breakdown, maps each task to the right specialist agent, generates ready-to-use delegation prompts, and guides execution task by task. |

### Skills

| Skill        | Invoke with | Description                                                                                      |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------ |
| **prd-spec** | `/prd-spec` | Standard PRD and TDD document formats, agent mapping rules, task priority ordering, and examples |

## Installation

### Via Marketplace

```bash
/plugin install product-management@szum-tech
```

### Manual

#### 1. Copy agent

```bash
cp plugins/product-management/agents/product-owner.md  your-project/.claude/agents/
```

#### 2. Copy skills

```bash
cp -r plugins/product-management/skills/*  your-project/.claude/skills/
```

#### 3. Verify

```bash
ls your-project/.claude/agents/product-owner.md
ls your-project/.claude/skills/prd-spec/SKILL.md
```

## Usage

### Starting an orchestration session

Invoke the `product-owner` agent and pass a PHASE prefix:

**PHASE 1 — Parse a PRD and get a task breakdown:**

> `@product-owner PHASE 1: Parse docs/prd-budget-tracker.md`

> `@product-owner PHASE 1: Parse docs/prd-auth.md docs/tdd-auth.md`

The agent reads the documents, generates a breakdown table (task / agent / dependencies / priority), and asks for your approval before proceeding.

**PHASE 2 — Generate delegation prompts:**

After approving the breakdown, the agent generates a self-contained, ready-to-paste prompt for each task:

> `@product-owner PHASE 2: Approved breakdown: [paste approved tasks]. Generate delegation prompts.`

**PHASE 3 — Execute task by task:**

> `@product-owner PHASE 3: Execute`

The agent presents the first task's prompt, waits for you to run it with the specialist agent, then moves to the next when you report back.

### PRD/TDD templates

Use the included templates as starting points:

- `skills/prd-spec/prd-template.md` — copy and fill in for a new feature PRD
- `skills/prd-spec/tdd-template.md` — copy and fill in for a technical design

### Agent mapping

The `product-owner` maps PRD/TDD signals to these specialist agents:

| Signal                               | Agent                      |
| ------------------------------------ | -------------------------- |
| UI components, forms, styling        | `frontend-expert`          |
| Server Actions, Route Handlers, API  | `nextjs-backend-engineer`  |
| Firestore schema, data model         | `database-architect`       |
| Test strategy, coverage planning     | `testing-strategist`       |
| Storybook stories, interaction tests | `storybook-test-architect` |
| Performance, bundle analysis         | `performance-analyzer`     |
| Code review checkpoint               | `code-reviewer`            |

## Related Plugins

- [**nextjs-react**](../nextjs-react/) — frontend-expert and nextjs-backend-engineer agents
- [**firebase**](../firebase/) — database-architect agent
- [**testing**](../testing/) — testing-strategist and storybook-test-architect agents
- [**code-quality**](../code-quality/) — code-reviewer and performance-analyzer agents

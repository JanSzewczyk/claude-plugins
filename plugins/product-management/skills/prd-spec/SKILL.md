# PRD Spec Skill

Defines standard document formats for Product Requirements Documents (PRD) and Technical Design Documents (TDD), and provides mapping rules from document content to specialist agents.

---

## Document Formats

### PRD — Product Requirements Document

```markdown
# Feature: [name]

## Overview

[Business goal, 2-3 sentences. Why are we building this?]

## User Stories

- As a [role], I can [action] so that [benefit]
- As a [role], I can [action] so that [benefit]

## Acceptance Criteria

- [ ] Story 1: [specific, testable condition]
- [ ] Story 2: [specific, testable condition]

## Out of Scope

- [What is explicitly NOT included in this feature]
- [Deferred items for future iterations]

## Technical Constraints

- [Auth required: e.g., user must be authenticated]
- [Existing schema: e.g., must use current Firestore collections]
- [Performance: e.g., page load < 2s]
- [Integration: e.g., must work with existing error handling pattern]
```

### TDD — Technical Design Document

````markdown
# Technical Design: [name]

## Architecture

[Which files/folders are involved or need to be created]

- `src/features/[feature]/` — feature module
- `src/components/[component]/` — shared components

## Data Model

[Firestore collections, TypeScript types]

```typescript
type ExampleEntity = {
  id: string;
  // ...fields
};
```
````

## API Contracts

[Server Actions + Route Handler signatures]

```typescript
// Server Action
async function createEntity(input: CreateEntityInput): Promise<Result<Entity, ServiceError>>

// Route Handler
GET /api/entities → Entity[]
```

## Security

[Auth/authz rules per operation]

- Read: authenticated users only
- Write: owner only

## Error Handling

[How errors are handled per layer]

- Server Actions: return ServiceError with typed code
- UI: display via toast notification
- Validation: Zod schema at action boundary

```

---

## Agent Mapping

Use this table to determine which specialist agent handles each type of task extracted from PRD/TDD:

| Signal in PRD/TDD | Agent |
|---|---|
| UI components, forms, styling, client-side state | `frontend-expert` |
| Server Actions, Route Handlers, API endpoints, middleware | `nextjs-backend-engineer` |
| Firestore schema, data model, indexes, migrations | `database-architect` |
| Test strategy, coverage planning, test type selection | `testing-strategist` |
| Storybook stories, interaction tests, visual tests | `storybook-test-architect` |
| Performance, bundle analysis, Core Web Vitals | `performance-analyzer` |
| Code review checkpoint, quality gate | `code-reviewer` |

### Mapping Examples

**PRD signal → agent:**
- "Users can submit a form with name and email" → `frontend-expert` (form UI) + `nextjs-backend-engineer` (Server Action)
- "Data must persist across sessions" → `database-architect` (schema)
- "Must load in under 2 seconds" → `performance-analyzer`
- "All form states must be documented" → `storybook-test-architect`

**TDD signal → agent:**
- `## Data Model` section with new types → `database-architect`
- `## API Contracts` section → `nextjs-backend-engineer`
- `## Architecture` with new components → `frontend-expert`
- `## Security` rules → `nextjs-backend-engineer` (middleware/guards)

---

## Task Priority Rules

When building the breakdown table, apply these defaults:

1. **Data model / schema** tasks come first (other tasks depend on types)
2. **Backend (Server Actions / API)** comes after schema
3. **Frontend (UI components)** comes after API contracts are defined
4. **Tests** come after implementation
5. **Code review** is always last

Dependencies should be explicit in the breakdown: `Depends on: #N`.

---

## Breakdown Table Format

When `product-owner` generates a task breakdown, use this format:

| # | Task | Agent | Depends on | Priority |
|---|---|---|---|---|
| 1 | Define Firestore schema for `[entity]` | `database-architect` | — | P0 |
| 2 | Implement Server Action `create[Entity]` | `nextjs-backend-engineer` | #1 | P0 |
| 3 | Build `[EntityForm]` component | `frontend-expert` | #2 | P1 |
| 4 | Write Storybook stories for `[EntityForm]` | `storybook-test-architect` | #3 | P1 |
| 5 | Plan test strategy | `testing-strategist` | #3 | P2 |
| 6 | Final code review | `code-reviewer` | All | P2 |
```

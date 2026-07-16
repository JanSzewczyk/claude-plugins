# testing

Testing strategies, Vitest unit tests, Storybook interaction tests, Playwright E2E, API testing, accessibility audits, test data builders, and DOM-based automated test generation.

## Contents

### Agents

| Agent                        | Description                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **testing-strategist**       | Plan test strategies, analyze coverage gaps, select appropriate test types (unit/integration/E2E). Follows the Testing Trophy model.                                     |
| **storybook-tester**         | Writes Storybook stories and interaction tests for React components in CSF Next format — play functions, component variants, edge cases, and the `.test()` method. |
| **unit-tester**              | Writes Vitest unit tests for utilities, Zod schemas, hooks, and Server Actions (with mocked dependencies). Phased, autonomous, SDD-aware — derives cases from acceptance criteria. |

### Skills

| Skill                   | Invoke with            | Description                                                                                                                     |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **storybook-testing**   | `/storybook-testing`   | Component testing with Storybook play functions — CSF Next format, `preview.meta()`, `.test()` method, API reference, templates |
| **builder-factory**     | `/builder-factory`     | Test data builders with `mimicry-js` — factory patterns, field mappings, mock data generation                                   |
| **api-test**            | `/api-test`            | Testing Next.js Route Handlers with Playwright — real HTTP requests, response validation                                        |
| **accessibility-audit** | `/accessibility-audit` | WCAG accessibility audits — automated checks, manual review checklists, ARIA patterns                                           |
| **playwright-cli**      | `/playwright-cli`      | Browser automation — web testing, screenshots, form filling, request mocking, tracing, video recording                          |
| **true-dom-tester**     | `/true-dom-tester`     | Accessibility-tree-based Playwright test generation — semantic locators, faster/cheaper than screenshots, optional Firecrawl     |
| **unit-testing**        | `/unit-testing`        | Vitest unit tests for TypeScript — mocking, async testing, parameterized tests, server action testing, coverage                 |
| **coverage-gaps**       | `/coverage-gaps`       | Finds and ranks the coverage gaps that matter — weights uncovered branches, critical paths, and git churn over line percentages |

## Installation

### 1. Copy agents

```bash
cp plugins/testing/agents/testing-strategist.md  your-project/.claude/agents/
cp plugins/testing/agents/storybook-tester.md     your-project/.claude/agents/
cp plugins/testing/agents/unit-tester.md          your-project/.claude/agents/
```

### 2. Copy skills

```bash
cp -r plugins/testing/skills/*  your-project/.claude/skills/
```

### 3. Verify

```bash
ls your-project/.claude/agents/testing-strategist.md
ls your-project/.claude/skills/storybook-testing/SKILL.md
ls your-project/.claude/skills/playwright-cli/SKILL.md
```

## Usage

**Plan a test strategy** for a feature:

> "Use testing-strategist to plan tests for the checkout flow"

**Create Storybook tests** for a component:

> "Use storybook-tester to create stories and tests for components/Button.tsx"

The `storybook-tester` writes CSF Next stories with play-function interaction
tests — covering component variants, edge cases, and form/validation states —
using the `.test()` method. It leans on the `storybook-testing` and
`builder-factory` skills for patterns and mock data.

**Write unit tests** for non-UI logic:

> "Use unit-tester to write tests for src/utils/format-currency.ts"

The `unit-tester` works in four phases (analyze → implement → run → optimize),
mocks only at module boundaries, runs `npm run test:unit` and self-corrects, and
leans on the `unit-testing` and `builder-factory` skills. In an SDD flow it derives
test cases from the PRD acceptance criteria and reports coverage back to the
`product-owner`.

**Invoke skills directly:**

> `/storybook-testing` — CSF Next patterns and API reference
> `/playwright-cli` — browser automation commands and patterns
> `/accessibility-audit` — run a WCAG audit on a component

## Testing Infrastructure

This plugin assumes the following test setup (adapt commands to your project):

| Type      | Tool               | Command                  |
| --------- | ------------------ | ------------------------ |
| Unit      | Vitest             | `npm run test:unit`      |
| Component | Storybook + Vitest | `npm run test:storybook` |
| E2E       | Playwright         | `npm run test:e2e`       |

## Troubleshooting

| Problem                               | Solution                                                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run test:storybook` fails        | Verify Storybook 10+ is installed and `experimentalTestSyntax: true` is set in `.storybook/main.ts`                   |
| `userEvent` interactions don't work   | **Never import `userEvent`** — destructure it from the test function parameter: `async ({ canvas, userEvent }) => {}` |
| `.test()` method not recognized       | Ensure you're on Storybook 10+ with CSF Next format (`preview.meta()` pattern)                                        |
| Builder factories produce wrong data  | Check that your builder uses functions `() => ...` for values that must be unique per instance                        |
| Playwright tests timeout              | Increase timeout in config or check that the dev server is running before tests                                       |
| Accessibility audit misses issues     | Automated checks (axe-core) catch ~30-50% of issues. Always supplement with manual checklist from the skill           |
| storybook-tester misses component props | Point it at the component file directly and ensure prop types are exported so it can enumerate variants               |

## Related Plugins

- [**react**](../react/) — React UI skills referenced by test agents
- [**nextjs**](../nextjs/) — Next.js skills referenced by test agents
- [**design**](../design/) — Design-system skills referenced by test agents
- [**code-quality**](../code-quality/) — Code review agent can verify test quality
- [**product-management**](../product-management/) — `product-owner` orchestrates these agents in the SDD (PRD/TDD) flow

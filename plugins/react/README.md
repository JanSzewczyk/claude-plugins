# react

React development — agents and skills for building modern React 19 user interfaces: the React Compiler and new hooks, Storybook stories with interaction tests in CSF Next, and WCAG accessibility audits. Builds on the **typescript** layer; the **nextjs** layer builds on this one.

## Contents

### Agents

| Agent                | Description                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **frontend-expert**  | Build UI components, style with Tailwind CSS, integrate design systems, fix UI bugs. Defaults to Server Components, uses React Compiler.                            |
| **storybook-tester** | Writes Storybook stories and interaction tests for React components in CSF Next format — play functions, component variants, edge cases, and the `.test()` method. |

### Skills

| Skill                   | Invoke with            | Description                                                                                                                              |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **react-19-compiler**   | `/react-19-compiler`   | React 19 hooks, React Compiler optimization, memoization decisions                                                                       |
| **create-stories**      | `/create-stories`      | Create or update a component's `.stories.tsx` — setup check, CSF Next stories per state, `.test()` interaction tests, mocking            |
| **accessibility-audit** | `/accessibility-audit` | WCAG accessibility audits — automated checks, manual review checklists, ARIA patterns                                                    |
| **storybook-rules**     | — (preloaded)          | Generated background knowledge: the Storybook story and interaction-test rules, preloaded by `storybook-tester` and `testing-strategist` |

`storybook-rules`, the `references/rules.md` file and the `BEGIN:knowledge` block in
`create-stories` are generated from `knowledge/` at the repo root. Edit the notes there and run the
`knowledge-dev` build; never edit the generated files.

## Installation

```bash
/plugin install react@szum-tech
```

This also installs **typescript**, **testing** and **design**, whose skills the agents preload.

## Usage

**Frontend work** — Claude will use the `frontend-expert` agent automatically for UI tasks, or you can invoke it directly:

> "Use frontend-expert to build a user profile card"

**Create Storybook tests** for a component:

> "Use storybook-tester to create stories and tests for components/Button.tsx"

The `storybook-tester` runs the `create-stories` procedure: it checks the Storybook setup, writes
(or updates) CSF Next stories per state with `.test()` interaction tests, runs them, and reports
what it kept, fixed and added.

**Skills** — invoke directly:

> `/react-19-compiler` — React 19 hooks and Compiler optimization guidance
> `/create-stories` — create or update the stories and interaction tests for a component
> `/accessibility-audit` — run a WCAG audit on a component

## Tech Stack Compatibility

| Technology | Minimum Version |
| ---------- | --------------- |
| React      | 19+             |
| TypeScript | 5.7+            |
| Storybook  | 10+ (CSF Next)  |

## Troubleshooting

| Problem                                         | Solution                                                                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Agent doesn't pick up project conventions       | Ensure `CLAUDE.md` describes your design system and component layout                                                  |
| frontend-expert does not know Server Actions    | Server Action patterns live in the **nextjs** plugin — install it in Next.js projects                                 |
| React Compiler guidance assumes a Next.js setup | The patterns apply to any React 19 toolchain; adapt the build config to your bundler                                  |
| `npm run test:storybook` fails                  | Verify Storybook 10+ is installed and `experimentalTestSyntax: true` is set in `.storybook/main.ts`                   |
| `userEvent` interactions don't work             | **Never import `userEvent`** — destructure it from the test function parameter: `async ({ canvas, userEvent }) => {}` |
| Accessibility audit misses issues               | Automated checks (axe-core) catch ~30-50% of issues. Always supplement with the manual checklist from the skill       |

## Related Plugins

- [**typescript**](../typescript/) — language layer: Vitest, builder rules, dependency tooling
- [**design**](../design/) — Szum-Tech design system, Tailwind CSS v4, component conventions
- [**nextjs**](../nextjs/) — App Router, Server Actions, code review, performance
- [**testing**](../testing/) — Playwright and test data builders

# testing

Technology-agnostic testing core — Playwright browser automation, accessibility-tree DOM test generation and a black-box QA engineer agent. Everything here works whatever language or framework the project uses; technology-specific testing lives in the technology's plugin (Vitest and `mimicry-js` builders in **typescript**, Storybook and accessibility audits in **react**, API route tests and test strategy in **nextjs**).

## Contents

### Agents

| Agent           | Description                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **qa-engineer** | Senior QA: runs a given list of flows and checks — or builds one from the spec — against the running app (web, API, CLI, library) and reports pass/fail per flow |

### Skills

| Skill               | Invoke with        | Description                                                                                                                          |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **playwright-cli**  | `/playwright-cli`  | Browser automation — web testing, screenshots, form filling, request mocking, tracing, video recording                               |
| **true-dom-tester** | `/true-dom-tester` | Accessibility-tree-based Playwright test generation — semantic locators, faster/cheaper than screenshots, optional Firecrawl          |

## Installation

```bash
/plugin install testing@szum-tech
```

The **typescript**, **react** and **nextjs** plugins depend on this one and install it automatically.

## Usage

> "Use qa-engineer to test the invoice export" — it finds the spec, picks the most important flows, runs them and reports each one
> "Use qa-engineer to run the checklist in `docs/qa/checkout.md` against http://localhost:3000" — it runs exactly those flows

> `/playwright-cli` — browser automation commands and patterns
> `/true-dom-tester` — generate and run DOM-snapshot-based browser tests for a page

## qa-engineer

**Input:** the flows and checks, or a path or link to where they are (test plan, acceptance criteria, issue, PR), or just the feature to test with how to start it. With no flows given it builds a short list of the most important ones from the spec, OpenAPI, README or the app itself, and names its source.

**Surfaces:** web through `playwright-cli`, API through `curl`, CLI through its command line, library through a throwaway script. Every artifact (snapshots, screenshots, scripts, logs) goes to a temp directory, never into the repository; tests are written into the project only when asked.

**Report:** first line `Result: PASS | FAIL | SKIPPED`, then a table of every flow (pass, fail, flaky, not run) with evidence, a "To fix" list with reproduction steps, and what was not checked. `SKIPPED` means the app or the tools were unavailable, so some or all flows could not be judged; a run with no failure but unrun flows is also `SKIPPED`, never `PASS`.

### Use in SDD

The agent knows nothing about SDD; it fits the extra-check contract of `/sdd:review` (an agent returning `PASS | FAIL | SKIPPED`). In `specs/capabilities.yml`:

```yaml
review:
  checks: [agent:testing:qa-engineer]
```

- `/sdd:review` briefs the check with the spec's acceptance criteria, the touched projects and how to start the app — these are the flows to run.
- Each project needs a `dev` command in the constitution's §2 table, otherwise the app cannot be started and the check returns `SKIPPED`.
- Install `testing@szum-tech` in the project. `FAIL` blocks READY and cannot be accepted; `SKIPPED` never blocks.

## Troubleshooting

| Problem                              | Solution                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `qa-engineer` returns `SKIPPED` | The app did not start or `playwright-cli` is missing — give it the start command and URL, or run `playwright-cli install-browser` |
| Playwright tests timeout             | Increase timeout in config or check that the dev server is running before tests                |

## Related Plugins

- [**typescript**](../typescript/) — Vitest unit tests, `mimicry-js` builders, coverage gaps, `unit-tester` agent
- [**react**](../react/) — Storybook interaction tests, accessibility audits, `storybook-tester` agent
- [**nextjs**](../nextjs/) — API route tests, `nextjs-developer`, `nextjs-tester` and `code-reviewer` agents
- [**python**](../python/) — `factory_boy` rules for Python tests

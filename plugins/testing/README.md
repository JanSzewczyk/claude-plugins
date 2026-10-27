# testing

Technology-agnostic testing core — Playwright browser automation, accessibility-tree DOM test generation, and test data builders that detect the stack. Everything here works whatever language or framework the project uses; technology-specific testing lives in the technology's plugin (Vitest in **typescript**, Storybook and accessibility audits in **react**, API route tests and test strategy in **nextjs**).

## Contents

### Skills

| Skill               | Invoke with        | Description                                                                                                                          |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **playwright-cli**  | `/playwright-cli`  | Browser automation — web testing, screenshots, form filling, request mocking, tracing, video recording                               |
| **true-dom-tester** | `/true-dom-tester` | Accessibility-tree-based Playwright test generation — semantic locators, faster/cheaper than screenshots, optional Firecrawl          |
| **builder-factory** | `/builder-factory` | Test data builders — reads `package.json` or `pyproject.toml`, then writes `mimicry-js` builders for TypeScript or `factory_boy` factories for Python |

The `references/rules.md` file and the `BEGIN:knowledge` block in `builder-factory` are generated
from `knowledge/` at the repo root. Edit the notes there and run the `knowledge-dev` build; never
edit the generated files.

## Installation

```bash
/plugin install testing@szum-tech
```

The **typescript**, **react** and **nextjs** plugins depend on this one and install it automatically.

## Usage

> `/playwright-cli` — browser automation commands and patterns
> `/true-dom-tester` — generate and run DOM-snapshot-based browser tests for a page
> `/builder-factory` — create a typed builder for a type or model

## Troubleshooting

| Problem                              | Solution                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Builder factories produce wrong data | Check that your builder uses functions `() => ...` for values that must be unique per instance |
| Playwright tests timeout             | Increase timeout in config or check that the dev server is running before tests                |
| builder-factory picks the wrong language | Run it from the project root so it finds `package.json` or `pyproject.toml`                 |

## Related Plugins

- [**typescript**](../typescript/) — Vitest unit tests, coverage gaps, `unit-tester` agent
- [**react**](../react/) — Storybook interaction tests, accessibility audits, `storybook-tester` agent
- [**nextjs**](../nextjs/) — API route tests, `testing-strategist` agent
- [**python**](../python/) — `factory_boy` rules for Python tests

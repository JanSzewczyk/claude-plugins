# testing

Technology-agnostic testing core — Playwright browser automation and accessibility-tree DOM test generation. Everything here works whatever language or framework the project uses; technology-specific testing lives in the technology's plugin (Vitest and `mimicry-js` builders in **typescript**, Storybook and accessibility audits in **react**, API route tests and test strategy in **nextjs**).

## Contents

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

> `/playwright-cli` — browser automation commands and patterns
> `/true-dom-tester` — generate and run DOM-snapshot-based browser tests for a page

## Troubleshooting

| Problem                              | Solution                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Playwright tests timeout             | Increase timeout in config or check that the dev server is running before tests                |

## Related Plugins

- [**typescript**](../typescript/) — Vitest unit tests, `mimicry-js` builders, coverage gaps, `unit-tester` agent
- [**react**](../react/) — Storybook interaction tests, accessibility audits, `storybook-tester` agent
- [**nextjs**](../nextjs/) — API route tests, `testing-strategist` agent
- [**python**](../python/) — `factory_boy` rules for Python tests

# Storybook Setup for CSF Next + `.test()`

What a project needs before the stories this skill writes can run, how to check each piece, and the
fix for each gap. Verified against the Storybook 10 docs (CSF Next, `main-config-features`,
`vitest-addon`, `nextjs-vite`). CSF Next and `.test()` are marked **preview / experimental** upstream —
their API may still change.

## Checklist

Run once per project. Each row: what to look at → what "OK" looks like.

| #   | Check                     | Where                                    | OK when                                                                                     |
| --- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Vite-based framework      | `package.json`, `.storybook/main.*`      | `@storybook/nextjs-vite` (Next.js ≥ 14.1) or `@storybook/react-vite`                        |
| 2   | CSF Next main config      | `.storybook/main.*`                      | `export default defineMain({...})` imported from `@storybook/<framework>/node`              |
| 3   | `.test()` enabled         | `.storybook/main.*`                      | `features: { experimentalTestSyntax: true }`                                                |
| 4   | CSF Next preview          | `.storybook/preview.*`                   | `export default definePreview({...})` imported from `@storybook/<framework>`                 |
| 5   | Vitest addon              | `package.json`, `.storybook/main.*`      | `@storybook/addon-vitest` installed and listed in `addons`                                  |
| 6   | Vitest project            | `vitest.config.*` (or `vitest.workspace.*` for Vitest < 3.2) | a project using `storybookTest()` with browser mode (Playwright, Chromium)       |
| 7   | Test script               | `package.json` `scripts`                 | a script running `vitest --project=storybook` — note its name (`test-storybook`, `test:storybook`, …) |
| 8   | Preview import path       | existing `*.stories.tsx`                 | one consistent path to `.storybook/preview` — reuse it in new files                         |

Record the test command (#7) and the preview import path (#8) — the skill uses both later.

## Reference shapes

### `.storybook/main.ts`

```ts
import { defineMain } from "@storybook/nextjs-vite/node";

export default defineMain({
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  features: {
    experimentalTestSyntax: true, // enables Story.test()
  },
});
```

Swap `nextjs-vite` for `react-vite` outside Next.js. Keep the project's own `stories` globs.

### `.storybook/preview.tsx`

```tsx
import { definePreview } from "@storybook/nextjs-vite";
import addonA11y from "@storybook/addon-a11y";

export default definePreview({
  addons: [addonA11y()], // official addons: default import, called
  parameters: {
    nextjs: { appDirectory: true }, // App Router projects — needed for next/navigation
  },
  decorators: [
    /* global providers — see mocking.md */
  ],
});
```

- `definePreview` lives **only** here, never in a story file.
- Community addons are imported as a whole module (`import * as addonX from "..."`) and called.
- Global module mocks (`sb.mock(...)`) are registered in this file — see [mocking.md](./mocking.md).

### Vitest project (`vitest.config.ts`)

Installed and wired by `npx storybook add @storybook/addon-vitest`. The shape it produces:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: playwright({}),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
```

The `playwright({})` provider function is the Vitest 4 form; on Vitest 3.x the provider is the
string `"playwright"`, and below 3.2 the projects live in a `vitest.workspace.ts` (`defineWorkspace`).
Do not hand-write this file when the addon command can generate it for the installed versions.

Requirements: Vitest ≥ 3.0, Playwright Chromium binaries, MSW ≥ 2 if MSW is used. When the
project already has a unit-test project in the same config, add this one next to it — never replace
it.

**Setup file.** With CSF Next and the Vitest addon the old `.storybook/vitest.setup.ts` with
`setProjectAnnotations` is no longer needed and can be removed. If the project still runs portable
stories through it, it becomes:

```ts
import { beforeAll } from "vitest";
import preview from "./preview";

beforeAll(preview.composed.beforeAll);
```

### Test script

```json
{
  "scripts": {
    "test-storybook": "vitest --project=storybook"
  }
}
```

Use the name the project already has. Scope a run to one file with
`npx vitest --project=storybook path/to/component.stories.tsx` (add `--run` to skip watch mode).

### Preview import path

Story files import the preview object, and the path must not break when files move. In order of
preference:

1. Whatever existing stories already use — consistency beats preference.
2. A `package.json` subpath import (Storybook's recommendation):
   ```json
   { "imports": { "#*": ["./*", "./*.ts", "./*.tsx"] } }
   ```
   → `import preview from "#.storybook/preview";`
3. A tsconfig / Vite alias already defined for the project root (e.g. `~/*`) →
   `import preview from "~/.storybook/preview";` (the form used in this skill's examples).

Never a deep relative path (`../../../.storybook/preview`).

## Fixing gaps

- Propose the exact diff for each failing check and apply it only after the user accepts. Running
  as a subagent: report the failing checks, do not edit.
- No Storybook at all → stop; the install (`npm create storybook@latest`) is the user's call.
- CSF 3 config (`StorybookConfig` / `Preview` types, `export default config`) → upgrade via
  [migration.md](./migration.md); `npx storybook automigrate csf-factories` converts config and
  stories together.
- Missing Vitest addon → `npx storybook add @storybook/addon-vitest` (installs, registers, writes
  the Vitest project, offers to install Playwright).
- Missing flag → add `features.experimentalTestSyntax: true` to `defineMain`.

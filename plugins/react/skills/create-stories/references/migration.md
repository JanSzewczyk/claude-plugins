# Migrating CSF 3 → CSF Next

A file is either CSF 3 or CSF Next — never both. When update mode meets a CSF 3 file, migrate the
whole file before touching individual tests.

## Automatic (whole project)

Project config and stories together, after upgrading Storybook — this is a project-wide change,
so propose it to the user rather than running it unasked:

```bash
npx storybook@latest upgrade
npx storybook automigrate csf-factories
```

Monorepos: run once per config directory (`-c apps/admin/.storybook`). CSF 2 files must first go
to CSF 3: `npx storybook migrate csf-2-to-3 --glob="**/*.stories.tsx" --parser=tsx`.

The codemod converts syntax only. It does not turn `play`-based test stories into `.test()` calls —
that is the manual part below.

## Manual (one file)

| CSF 3                                       | CSF Next                                 |
| ------------------------------------------- | ---------------------------------------- |
| `import type { Meta, StoryObj }`            | `import preview from "<preview path>"`   |
| `const meta = { } satisfies Meta<typeof C>` | `const meta = preview.meta({ })`         |
| `export default meta`                       | — (none)                                 |
| `type Story = StoryObj<typeof meta>`        | — (inferred)                             |
| `export const S: Story = { }`               | `export const S = meta.story({ })`       |
| separate story per test + `play`            | `S.test("…", async (ctx) => { })`        |

1. **Syntax** — apply the table row by row, and drop `userEvent` / `within` from the
   `storybook/test` import.
2. **Collapse test stories** — stories whose args equal another story's and exist only to run a
   `play` with assertions are folded into that story.
3. **`play` → `.test()`** — each independent assertion group in a `play` becomes its own
   `S.test("<behaviour>", async ({ canvas, userEvent, args }) => { ... })`. Replace
   `within(canvasElement)` with the destructured `canvas`.
4. **Keep `play`** only for a demo (no assertions) or a genuinely dependent flow; keep
   `step()` only where it marks 3+ phases.
5. **Run** — every converted test must pass on its own; one failing test must not block the rest.

## Before / after

```tsx
// CSF 3
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Toggle } from "./toggle";

const meta = { component: Toggle } satisfies Meta<typeof Toggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ClickTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("switch"));
    await expect(canvas.getByRole("switch")).toBeChecked();
  },
};
```

```tsx
// CSF Next
import { expect } from "storybook/test";
import preview from "~/.storybook/preview";
import { Toggle } from "./toggle";

const meta = preview.meta({ title: "Components/Toggle", component: Toggle });

export const ToggleStory = meta.story({ name: "Toggle" });

ToggleStory.test("Clicking the switch turns it on", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("switch"));
  await expect(canvas.getByRole("switch")).toBeChecked();
});
```

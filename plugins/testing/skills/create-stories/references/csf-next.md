# CSF Next — File Shape

## The factory chain

```
definePreview (.storybook/preview.tsx) → preview.meta (story file) → meta.story → Story.test()
```

- Import the preview object with the path existing stories already use (`~/.storybook/preview`,
  `#.storybook/preview`, …) — never a deep relative path.
- **No default export** — the `meta` object is never exported.
- **No type annotations** — no `Meta`, `StoryObj`, `satisfies`. Types are inferred from `component`
  and `args`.
- Derive a variant from an existing story with `Story.extend({ args: {...} })` instead of copying
  its config.
- Custom args that are not component props: `preview.type<{ args: Extra }>().meta({...})`.

## File layout

```tsx
// components/submit-button.stories.tsx  — next to the component
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { SubmitButton } from "./submit-button";

const meta = preview.meta({
  title: "Components/Submit Button",
  component: SubmitButton,
  args: { onClick: fn() },
});

export const SubmitButtonStory = meta.story({ name: "Submit Button" });

SubmitButtonStory.test("Clicking the button calls onClick", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
  await expect(args.onClick).toHaveBeenCalledOnce();
});
```

Order inside the file: imports (`storybook/test`, then third-party, then preview, then local) →
`meta` → each story followed directly by its `.test()` calls.

File name: the component's file name + `.stories.tsx`, in the same directory.

## `title`

Human-readable, space-separated words matching the component's display name, grouped by area:
`"Components/Country Select"`, `"Features/Invoices/Invoice Table"` — not `"Components/CountrySelect"`.
If the project's existing stories follow a different grouping, follow theirs.

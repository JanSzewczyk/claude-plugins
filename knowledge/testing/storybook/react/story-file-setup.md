---
title: Put a React story next to its component and import the typed preview
summary: component.stories.tsx beside the component, preview imported through the project's alias, no default export.
impact: high
applies: [typescript, react, storybook@>=10]
implements: testing/storybook/principles/use-csf-next-factories
sources: [https://storybook.js.org/docs/api/csf/csf-next]
---

## Rule

Create `<component>.stories.tsx` in the component's folder. Import the preview with the alias the
project's existing stories already use (`~/.storybook/preview`, `#.storybook/preview`, …), never
a deep relative path, and build the meta with `preview.meta({ ... })`.
Export stories as `meta.story({ ... })` and let TypeScript infer every type.

## Why

The typed preview is what makes `meta.story()` know the component's props. A story file that
imports `Meta` from the framework package falls back to CSF 3 and loses `.test()`.

## Incorrect

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { component: SubmitButton } satisfies Meta<typeof SubmitButton>;
export default meta;
export const Primary: StoryObj<typeof meta> = {};
```

## Correct

```tsx
import preview from "~/.storybook/preview";

import { SubmitButton } from "./submit-button";

const meta = preview.meta({ title: "Components/Submit Button", component: SubmitButton });
export const SubmitButtonStory = meta.story({ name: "Submit Button" });
```

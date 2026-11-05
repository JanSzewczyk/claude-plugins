---
title: Put a Vue story next to its component and import the typed preview
summary: Component.stories.ts beside the .vue file, preview imported from .storybook/preview, no default export.
impact: high
applies: [typescript, vue, storybook@>=10]
implements: testing/storybook/principles/use-csf-next-factories
sources: [https://storybook.js.org/docs/api/csf/csf-next]
---

## Rule

Create `<Component>.stories.ts` in the component's folder. Import the preview from the project's `.storybook/preview` file, never from `@storybook/vue3-vite`, and build the meta with `preview.meta({ component })`.
Export stories as `meta.story({ ... })` and let TypeScript infer the props.

## Why

The typed preview is what makes `meta.story()` check `args` against the component's props. A story file that imports `Meta` from the framework package falls back to CSF 3 and loses `.test()`.

## Incorrect

```ts
import type { Meta, StoryObj } from "@storybook/vue3-vite";
import Button from "./Button.vue";

const meta = { component: Button } satisfies Meta<typeof Button>;
export default meta;
export const Primary: StoryObj<typeof meta> = { args: { primary: true } };
```

## Correct

```ts
import preview from "../.storybook/preview";

import Button from "./Button.vue";

const meta = preview.meta({ component: Button });

export const Primary = meta.story({ args: { primary: true } });
```

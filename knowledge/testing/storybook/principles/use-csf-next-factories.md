---
title: Write stories with CSF Next factories, not CSF 3 objects
summary: preview.meta() and meta.story() give inferred types and the .test() method; CSF 3 objects give neither.
impact: high
applies: [storybook@>=10]
expects: [react, vue]
sources: [https://storybook.js.org/docs/api/csf/csf-next]
---

## Rule

Build every story through the chain `definePreview` → `preview.meta()` → `meta.story()`.
`definePreview` lives only in the Storybook preview file. A story file has no default export and
no hand-written `Meta` or `StoryObj` types. How the preview is imported and what the story file is
called depends on the framework; each framework has its own note implementing this one.

## Why

CSF 3 objects (`satisfies Meta<typeof C>`, `export default meta`) cannot carry `.test()`, and
their types are annotated by hand, so they drift from the component's props. Mixing both formats
in one project makes every new story a guess.

---
title: Derive a story variant with Story.extend instead of copying its config
summary: A variant of an existing story extends it and sets only what differs.
impact: low
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/api/csf/csf-next]
---

## Rule

When a story differs from another only in a few args or parameters, derive it with
`Story.extend({ args: { ... } })` and set only what differs. Keep shared defaults in `meta.args`.

## Why

A copied story config drifts from its original on the next change, and the reader has to diff two
blocks to see what makes the variant different.

## Incorrect

```ts
export const FilledForm = meta.story({ args: { defaultValues: filled, layout: "wide" } });
export const FilledDisabled = meta.story({ args: { defaultValues: filled, layout: "wide", disabled: true } });
```

## Correct

```ts
export const FilledForm = meta.story({ args: { defaultValues: filled, layout: "wide" } });
export const FilledDisabled = FilledForm.extend({ args: { disabled: true } });
```

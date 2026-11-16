---
title: Ship every component with a stories file beside it
summary: Each {component}.tsx gets a {component}.stories.tsx in the same folder, created in the same change.
impact: medium
applies: [typescript, react, storybook]
sources: [https://storybook.js.org/docs/writing-stories]
---

## Rule

Create `{component}.stories.tsx` next to every `{component}.tsx` in the same change that adds the component. How the story file is set up is in `testing/storybook/react/story-file-setup`.

## Why

Components added without a story have no rendered example and no place for interaction tests, so their states are first seen in the running app and regressions in them go unnoticed.

## Incorrect

```text
features/projects/components/
├── project-card.tsx
├── project-card.stories.tsx
└── project-status-badge.tsx
```

## Correct

```text
features/projects/components/
├── project-card.tsx
├── project-card.stories.tsx
├── project-status-badge.tsx
└── project-status-badge.stories.tsx
```

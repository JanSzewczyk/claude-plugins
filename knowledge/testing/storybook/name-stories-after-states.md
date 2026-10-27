---
title: Name stories after component states and tests after behaviours
summary: Stories are states (EmptyForm, Loading), tests are sentences; never Default, Basic or Test 1.
impact: low
applies: [typescript, storybook@>=10]
sources: [https://storybook.js.org/docs/writing-stories]
---

## Rule

Name each story after the state it shows, as a bare state name (`EmptyForm`, `FilledForm`,
`Loading`); add a `State` suffix only where the bare name would shadow a global (`ErrorState`). A
component with a single story gets `<Component>Story` plus a `name:` field, so it does not collide
with the imported component. Never name a story after a behaviour (`ClickTest`): that is a test. Name each test as a sentence describing one behaviour. Write titles
as space-separated words: `"Components/Country Select"`.

## Why

Generic names say nothing in the sidebar or in a failing CI line. A failing test called "Shows
validation error on empty submit" tells the reader what broke without opening the file.

## Incorrect

```ts
export const Default = meta.story({});
Default.test("Test 1", async ({ canvas }) => {});
```

## Correct

```ts
export const SubmitButtonStory = meta.story({ name: "Submit Button" });
SubmitButtonStory.test("Disabled button prevents submission", async ({ canvas }) => {});
```

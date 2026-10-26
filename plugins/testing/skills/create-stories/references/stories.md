# Stories — What Becomes a Story

A story is one **state** of the component, defined by its args (and, where needed, its mocks). Tests
hang off stories; stories are never created just to hold a test.

## From component to stories

1. List the states the component can be in, from step 3 of the procedure (props, branches, async
   status).
2. **Different args or mocks → separate story. Same args → one story with several `.test()` calls.**
3. Keep it minimal: 1–2 stories per distinct state. A Button with variants gets one story per
   variant; a Button whose only difference is "clicked" gets one story and a test.

## State checklist

Consider each; create a story only where the component actually has that state.

- initial / empty
- prefilled / with data
- loading (pending request, `aria-busy`)
- error — validation and server/network
- success / confirmation
- disabled / read-only
- edge cases — long text, zero items, many items, missing optional props
- variants — size, intent, theme
- responsive — only when layout changes behaviour (use viewport parameters)

Interaction, keyboard and accessibility are **tests** on these stories, not stories of their own.

## Args

- Shared defaults (callbacks, required props) go in `meta.args`; a story sets only what makes it
  that state.
- Callback props are always `fn()` in `meta.args` so every test shares one spy — see
  [mocking.md](./mocking.md).
- Values a test asserts against are deterministic: set them explicitly in args, never rely on
  random generator output.
- Derive variants with `Story.extend({ args })` rather than copying the full config.

## Data — builders over inline objects

Typed object props (a `User`, a list of `Invoice`s, nested structures of 3+ fields) come from
`mimicry-js` builders, not hand-written literals.

- Search for an existing `*.builder.ts` (or the project's builders folder) first.
- None exists and the data is non-trivial → create it with the `builder-factory` skill.
- `builder.one()` for a single object, `builder.many(n)` for a list.
- Pass overrides for every value a test asserts on: `userBuilder.one({ overrides: { name: "Ada Lovelace" } })`;
  use traits for named variants: `userBuilder.one({ traits: "admin" })`.
- Primitive props or fewer than 3 fields → inline values are fine.

## Placement and scope

- One `.stories.tsx` per exported component, next to it.
- No stories for private sub-components unless asked — they are covered through their parent.
- Do not modify the component to make it storyable; mock its dependencies instead.

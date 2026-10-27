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

## Naming

A story is named after the state it renders, never after what a test does with it.

- **Only one story for the component** → `ComponentNameStory` with a `name:` field. The `Story`
  suffix avoids colliding with the imported component binding.
  `export const UserCardStory = meta.story({ name: "User Card" })`
  This holds when the story only exists to carry interaction tests: `FormStory`, not
  `FormSubmission` — the behaviour belongs in the `.test()` name.
- **Several stories** → plain state names, no suffix: `EmptyForm` / `FilledForm`, `Loading` /
  `Idle`, `Primary` / `Secondary` / `Destructive`.
- **`State` suffix** only where the bare name would shadow a global: `ErrorState`, not `Error`;
  but `Loading`, not `LoadingState`.
- **Never generic**: `Default`, `Basic`, `Example`, `Test1`, `Story2`.
- **Never behaviour names**: `ClickTest`, `ValidationStory`, `TabNavigation` — that is a
  `.test()`, not a story.
- **A story with `play`** is still a state — name it after the state it ends in (`FilledForm`,
  `SubmittedForm`), not after the interaction.

## Args

- Shared defaults (callbacks, required props) go in `meta.args`; a story sets only what makes it
  that state. Callbacks are `fn()` spies — see `mocking.md`.
- Values a test asserts against are deterministic: set them explicitly in args, never rely on
  random generator output.
- A variant of another story derives from it (`Story.extend`, `csf-next.md`) rather
  than copying its config.

## Data — builders over inline objects

Typed object props (a `User`, a list of `Invoice`s, nested structures of 3+ fields) come from
`mimicry-js` builders, not hand-written literals.

- Search for an existing `*.builder.ts` (or the project's builders folder) first.
- None exists and the data is non-trivial → create it with the `builder-factory` skill.
- `builder.one()` for a single object, `builder.many(n)` for a list.
- Pass overrides for every value a test asserts on: `userBuilder.one({ overrides: { name: "Ada Lovelace" } })`;
  use traits for named variants: `userBuilder.one({ traits: "admin" })`.
- Primitive props or fewer than 3 fields → inline values are fine.

## Scope

- One story file per exported component (file name and location: `csf-next.md`).
- No stories for private sub-components unless asked — they are covered through their parent.

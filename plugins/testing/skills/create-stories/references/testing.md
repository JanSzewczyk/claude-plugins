# Testing with `.test()` and `play`

`Story.test(name, fn)` attaches an independent test to a story. Each test renders the story fresh,
runs in the browser through the Vitest addon, and reports on its own in the Storybook UI and the
test run. It is the default for every assertion — `play` is the exception (last section).

Requires `features.experimentalTestSyntax: true` in `.storybook/main.ts`.

## The test function

```tsx
EmptyForm.test("Shows an error on empty submit", async ({ canvas, userEvent, args, step }) => {
  await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  await expect(await canvas.findByText(/email is required/i)).toBeVisible();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});
```

The full context it receives is in `api-reference.md`.

## Queries, `canvas` vs `screen`, assertions

Which query variant to use, querying like a user, portal content through `screen`, awaiting every
interaction and asserting what the user perceives are rules in `rules.md`. The portal pattern in
short: trigger inside `canvas`, then find the overlay with `screen.findBy*`.

```tsx
await userEvent.click(canvas.getByRole("button", { name: /delete/i }));
const dialog = await screen.findByRole("dialog");
await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
```

Elements that may legitimately not exist (mobile-only, feature-flagged) → `queryBy*` first, then
assert conditionally.

## What to test, and how to group it

Group by **category**, not by element. One `.test()` per element is an anti-pattern.

| Category        | Tests per story                         | Name pattern                                   |
| --------------- | --------------------------------------- | ---------------------------------------------- |
| Content         | one — all text, headings, labels        | `"Renders all expected content"`               |
| Accessibility   | one — roles, ARIA, focus order          | `"Is accessible: roles, labels and focus"`     |
| Interaction     | one per distinct action                 | `"Clicking the card calls onSelect"`           |
| Validation      | one per rule                            | `"Shows an error for an invalid email"`        |
| Keyboard        | one per key behaviour                   | `"Escape closes the dialog"`                   |
| Async / states  | one per outcome                         | `"Shows the server error and keeps the input"` |

- Skip the content test when the behaviour tests already exercise every element.
- A full WCAG audit is `accessibility-audit`'s job; here, test the a11y contract of the component.

## What to test per component kind

| Kind | Stories | Tests | Watch for |
| --- | --- | --- | --- |
| Button | one per variant, `Disabled`, `Loading` | click calls the `fn()` once; Enter (and Space) activates it from focus; disabled and loading ignore clicks | loading sets `aria-busy="true"`, shows a `progressbar` and disables |
| Dialog / modal | `Open`, `Closed`, one per visual variant | title and message render; `aria-modal="true"`, `aria-labelledby` (and `aria-describedby` with body copy); confirm / cancel call the right callback and not the other; Tab order reaches the actions; Escape calls `onCancel` | focus is trapped while open and returns to the trigger on close (`waitFor` + `toHaveFocus()`); closed case asserts with `queryByRole("dialog")` + `not.toBeInTheDocument()` |
| Select / combobox (portal) | one | open the trigger in `canvas`, pick the option with `screen.findByRole("option")`, assert `onChange` value | native `<select>` has no portal: `userEvent.selectOptions` + `toHaveValue` |
| List / table | `EmptyList`, `PopulatedList` (`builder.many(n)`), `LoadingList` | empty message; row count is `items.length` (+1 when there is a header row); clicking a row calls back with that item | count from `args.items`, never a hard-coded number |
| Input / text field | `EmptyInput`, `ErrorInput`, `DisabledInput` | label and placeholder render; typing updates the value and calls `onChange`; error text shows and `aria-invalid="true"` | — |
| Tabs | one | first tab has `aria-selected="true"`; clicking another selects it and shows its panel | — |
| Tooltip / popover (portal) | one | hover the trigger → `screen.findByRole("tooltip")` has the text; unhover → `waitFor` it is gone | query through `screen`, not `canvas` |
| Toast / alert | one per outcome | `status` / `alert` role has the message | auto-dismisses on a timer: assert removal with `waitFor(…, { timeout: 6000 })`; portal depends on the library |
| Purely presentational (card, badge) | one per visual variant | none — the stories are the documentation | do not invent tests to justify a story |

Add these wherever the component has the behaviour, on the story whose state it belongs to:

- **Prefilled values** — fields show the values from `args` (`toHaveValue(args.defaultValues.email)`),
  and a prefilled value can be cleared and retyped.
- **Server / submit error** — a story whose `onSubmit` resolves to an error; after submitting, the
  message appears (`waitFor` or `findBy*`) **and** the entered data is still in the fields.
- **Double submission** — three rapid clicks on submit still call `onSubmit` exactly once.

## Test names

A sentence describing one behaviour, present tense, from the user's point of view — the naming rule
is in `rules.md`.

## `step()`

Labels phases inside a test; the labels show in the test output (comments do not).

- Use for **3+ phases** (fill → submit → verify).
- Skip for 1–2 line tests.

```tsx
FormStory.test("Submits valid data", async ({ canvas, userEvent, args, step }) => {
  await step("Fill the form", async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "secret123");
  });
  await step("Submit", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  });
  await step("Verify", async () => {
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  });
});
```

## Independence

Every test passes alone and in any order (`rules.md`). Mocks are configured and reset in
`beforeEach` — see `mocking.md`.

## `play` — the exception

`play` runs once after a story renders, in the Storybook UI and in the test run. With `.test()`
available it has exactly two jobs:

| Need                                                            | Use                       |
| --------------------------------------------------------------- | ------------------------- |
| An independent check of behaviour                               | `.test()` — always        |
| Show the component **after** an interaction in the docs (demo)  | `play`, no assertions     |
| ONE flow whose steps genuinely depend on each other             | `play` with `step()`      |

Rough split: `.test()` ≈ 90 %, `play` ≈ 10 %. Never put independent assertions in `play` — one
failing assertion hides every later one, and the story itself turns red in the docs.

### (a) Demo — a state reached by interaction

```tsx
export const FilledForm = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/email/i), "ada@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "secret123");
  },
});

// Tests still go through .test() — they run after play
FilledForm.test("Enables submit once both fields are filled", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /sign in/i })).toBeEnabled();
});
```

### (b) One dependent narrative

```tsx
// onSubmit: fn() is set in meta.args
export const SubmittedForm = meta.story({
  play: async ({ canvas, userEvent, args, step }) => {
    await step("Fill the registration form", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "ada@example.com");
      await userEvent.click(canvas.getByRole("checkbox", { name: /accept terms/i }));
    });
    await step("Submit", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /sign up/i }));
    });
    await step("Verify submission", async () => {
      await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    });
  },
});
```

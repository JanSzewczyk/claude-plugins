# Testing with `.test()`

`Story.test(name, fn)` attaches an independent test to a story. Each test renders the story fresh,
runs in the browser through the Vitest addon, and reports on its own in the Storybook UI and the
test run. It is the default for every assertion — `play` is the exception ([play.md](./play.md)).

Requires `features.experimentalTestSyntax: true` ([setup.md](./setup.md)).

## The test function

```tsx
LoginForm.test("Shows an error on empty submit", async ({ canvas, userEvent, args, step }) => {
  await userEvent.click(canvas.getByRole("button", { name: /sign in/i }));
  await expect(await canvas.findByText(/email is required/i)).toBeVisible();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});
```

Context (same as `play`): `canvas` (queries scoped to the story root), `canvasElement`, `userEvent`,
`args`, `step`. Always destructure — never import `userEvent`, `within` or `canvas`.

## Queries

- **Semantic first**: `getByRole` (with `name`) → `getByLabelText` → `getByText` /
  `getByPlaceholderText`. Never `getByTestId`, never `querySelector`.
- **`getBy*`** — element must be there now.
- **`queryBy*`** — for asserting absence (`not.toBeInTheDocument()`); `getBy*` would throw first.
- **`findBy*` / `waitFor()`** — anything that appears after an interaction, a request, or an animation.
- Elements that may legitimately not exist (mobile-only, feature-flagged) → `queryBy*` first, then
  assert conditionally.

## `canvas` vs `screen`

- **`canvas`** — everything rendered inside the story root. Default.
- **`screen`** (imported from `storybook/test`) — portal content rendered to `document.body`:
  dialogs, tooltips, popovers, menus, select/combobox option lists, most toasts.
- **Pattern**: trigger inside `canvas`, then find the portal content with `screen.findBy*`.
- `canvasElement` — raw DOM, rarely needed.

```tsx
await userEvent.click(canvas.getByRole("button", { name: /delete/i }));
const dialog = await screen.findByRole("dialog");
await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
```

The role/portal table for common elements is in [api-reference.md](./api-reference.md#common-element-patterns).

## Assertions

- Assert what the user sees or can do: `toBeVisible`, `toBeDisabled`, `toHaveTextContent`,
  `toHaveValue`, `toHaveFocus`, `toHaveAttribute("aria-…")`, `toHaveBeenCalledWith` on callback spies.
- Never assert internal state, class-name implementation details that carry no meaning for the
  user, or snapshot markup.
- `await` every `expect` and every `userEvent` call.

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

## Test names

A sentence describing one behaviour, present tense, from the user's point of view.

- ✅ `"Shows validation error on empty submit"`, `"Disabled button prevents submission"`
- ❌ `"Test 1"`, `"Works correctly"`, `"Validation"`, `"should work"`

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

- Every test must pass alone and in any order — never rely on what an earlier test clicked.
- Reset or reconfigure mocks in `beforeEach` ([mocking.md](./mocking.md#setup-with-beforeeach)).
- Repeated setup (fill a form to a valid state) → a small helper function in the story file, not
  a shared mutable variable.

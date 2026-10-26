# Examples — One Worked File and Patterns by Component Kind

The worked file shows the whole shape once. The pattern table says what to cover for other kinds of
component — apply it with the same shape rather than copying a second file.

## Worked file — LoginForm

Covers: shared `fn()` in `meta.args`, a layout decorator, a content test, `step()` for a 3-phase
flow, `findByText` for async validation, asserting a callback is **not** called, and a second story
for a different state.

```tsx
// components/login-form.stories.tsx
import { expect, fn } from "storybook/test";

import preview from "~/.storybook/preview";

import { LoginForm } from "./login-form"; // Zod + react-hook-form; emits onSubmit({ email, password })

const meta = preview.meta({
  title: "Components/Login Form",
  component: LoginForm,
  parameters: { layout: "centered" },
  args: { onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
});

export const EmptyForm = meta.story({});

EmptyForm.test("Renders email and password fields", async ({ canvas }) => {
  await expect(canvas.getByLabelText(/email/i)).toBeVisible();
  await expect(canvas.getByLabelText(/password/i)).toBeVisible();
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeVisible();
});

EmptyForm.test("Submits with valid credentials", async ({ canvas, userEvent, args, step }) => {
  await step("Fill in valid credentials", async () => {
    await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  });
  await step("Submit", async () => {
    await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
  });
  await step("onSubmit called with form data", async () => {
    await expect(args.onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
  });
});

EmptyForm.test("Shows error for invalid email and blocks submit", async ({ canvas, userEvent, args }) => {
  await userEvent.type(canvas.getByLabelText(/email/i), "invalid-email");
  await userEvent.type(canvas.getByLabelText(/password/i), "password123");
  await userEvent.click(canvas.getByRole("button", { name: /log in/i }));

  await expect(await canvas.findByText(/invalid email address/i)).toBeInTheDocument();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});

EmptyForm.test("Shows errors for empty fields", async ({ canvas, userEvent, args }) => {
  await userEvent.click(canvas.getByRole("button", { name: /log in/i }));
  await expect(await canvas.findByText(/invalid email address/i)).toBeInTheDocument();
  await expect(await canvas.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  await expect(args.onSubmit).not.toHaveBeenCalled();
});

export const Loading = meta.story({ args: { isLoading: true } });

Loading.test("Disables submit while loading", async ({ canvas }) => {
  await expect(canvas.getByRole("button", { name: /log in/i })).toBeDisabled();
});
```

## Patterns by component kind

| Kind | Stories | Tests | Watch for |
| --- | --- | --- | --- |
| Button | one per variant, `Disabled`, `Loading` | click calls the `fn()` once; Enter (and Space) activates it from focus; disabled and loading ignore clicks | loading sets `aria-busy` and disables |
| Dialog / modal | `Open`, `Closed`, one per visual variant | title and message render; `aria-modal="true"` and `aria-labelledby`; confirm / cancel call the right callback and not the other; Tab order reaches the actions; Escape calls `onCancel` | closed case asserts with `queryByRole("dialog")` + `not.toBeInTheDocument()` |
| Select / combobox (portal) | one | open the trigger in `canvas`, pick the option with `screen.findByRole("option")`, assert `onChange` value | native `<select>` has no portal: `userEvent.selectOptions` + `toHaveValue` |
| List / table | `EmptyList`, `PopulatedList` (`builder.many(n)`), `LoadingList` | empty message; row count is `items.length` (+1 when there is a header row); clicking a row calls back with that item | count from `args.items`, never a hard-coded number |
| Input / text field | `EmptyInput`, `ErrorInput`, `DisabledInput` | label and placeholder render; typing updates the value and calls `onChange`; error text shows and `aria-invalid="true"` | — |
| Tabs | one | first tab has `aria-selected="true"`; clicking another selects it and shows its panel | — |
| Tooltip / popover (portal) | one | hover the trigger → `screen.findByRole("tooltip")` has the text; unhover → `waitFor` it is gone | query through `screen`, not `canvas` |
| Purely presentational (card, badge) | one per visual variant | none — the stories are the documentation | do not invent tests to justify a story |

## Cross-cutting behaviours

Add these wherever the component has the behaviour, on the story whose state it belongs to:

- **Prefilled values** — fields show the values from `args` (`toHaveValue(args.defaultValues.email)`),
  and a prefilled value can be cleared and retyped.
- **Server / submit error** — a story whose `onSubmit` resolves to an error; after submitting, the
  message appears (`waitFor` or `findBy*`) **and** the entered data is still in the fields.
- **Double submission** — three rapid clicks on submit still call `onSubmit` exactly once.

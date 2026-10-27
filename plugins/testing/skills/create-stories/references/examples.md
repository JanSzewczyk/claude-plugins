# Examples — One Worked Story File

The worked file shows the whole shape once. What to cover for other kinds of component is in
`testing.md` — apply it with this shape rather than
copying a second file.

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

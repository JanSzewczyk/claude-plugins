# `play` — When, and Only When

`play` runs once after a story renders, in the Storybook UI and in the test run. With `.test()`
available it has exactly two jobs. Everything else is a `.test()`.

| Need                                                            | Use                       |
| --------------------------------------------------------------- | ------------------------- |
| An independent check of behaviour                               | `.test()` — always        |
| Show the component **after** an interaction in the docs (demo)  | `play`, no assertions     |
| ONE flow whose steps genuinely depend on each other             | `play` with `step()`      |

Rough split: `.test()` ≈ 90 %, `play` ≈ 10 %. Never put independent assertions in `play` — one
failing assertion hides every later one, and the story itself turns red in the docs.

## (a) Demo — a state reached by interaction

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

## (b) One dependent narrative

```tsx
export const CompleteSignUpFlow = meta.story({
  args: { onSubmit: fn() },
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

## Rules

- Same context as `.test()` (`canvas`, `userEvent`, `args`, `step`, plus `globals`, `parameters`,
  `viewMode`); same rules — destructure `userEvent`, `await` everything, semantic queries.
- A story with `play` is still a state; name it after the state it ends in, not after the test.
- Converting an old CSF 3 file: each `play` holding independent assertions becomes one or more
  `.test()` calls ([migration.md](./migration.md)).

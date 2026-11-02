---
title: Drive interactions with user-event, not fireEvent
summary: user-event plays the whole event sequence a user causes; fireEvent dispatches one event and skips the rest.
impact: medium
applies: [typescript, react, testing-library]
sources: [https://testing-library.com/docs/user-event/intro, https://kentcdodds.com/blog/common-mistakes-with-react-testing-library]
---

## Rule

Drive every interaction with `@testing-library/user-event`, creating the instance with
`userEvent.setup()` before `render` and awaiting each call.

## Why

`fireEvent` dispatches a single event, so a handler on `keydown` goes unexercised and a test can type into
a field a real user could not reach.

## Incorrect

```tsx
render(<SignupForm />);
fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.co" } });
```

## Correct

```tsx
const user = userEvent.setup();
render(<SignupForm />);
await user.type(screen.getByLabelText(/email/i), "a@b.co");
```

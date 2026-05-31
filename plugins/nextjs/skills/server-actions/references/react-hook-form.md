# React Hook Form + Server Actions

Use RHF for forms richer than a native `<form action>`: typed fields, client validation, dynamic arrays, wizards. The
action still returns the standard contract; RHF maps `fieldErrors` onto inputs.

```bash
npm install react-hook-form @hookform/resolvers zod
```

## Action as a prop (preferred)

The page (Server Component) binds context to the action and passes it down; the form stays decoupled from how data
loads. This is also how edit forms work — load the record, pass `defaultValues`, bind an update action.

```typescript
// app/users/new/page.tsx — Server Component
export default async function NewUserPage() {
  const { userId } = await auth();
  async function handleCreate(data: CreateUserInput) {
    "use server";
    return createUser(data, userId!);
  }
  return <UserForm onSubmitAction={handleCreate} />;
}
```

```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { createUserSchema, type CreateUserInput } from "../schemas/user";
import type { ActionResponse } from "~/lib/action-types";
import type { User } from "../types/user";

type UserFormProps = {
  onSubmitAction(data: CreateUserInput): ActionResponse<User>;
  defaultValues?: Partial<CreateUserInput>;
};

export function UserForm({ onSubmitAction, defaultValues }: UserFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema), defaultValues });

  function onSubmit(data: CreateUserInput) {
    startTransition(async () => {
      const result = await onSubmitAction(data);
      if (result.success) return form.reset();
      applyServerErrors(form, result); // helper below
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} disabled={isPending} aria-invalid={!!form.formState.errors.name} />
      {form.formState.errors.name ? <span className="text-error">{form.formState.errors.name.message}</span> : null}

      <input type="email" {...form.register("email")} disabled={isPending} />
      {form.formState.errors.email ? <span className="text-error">{form.formState.errors.email.message}</span> : null}

      {form.formState.errors.root ? <p role="alert">{form.formState.errors.root.message}</p> : null}

      <button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</button>
    </form>
  );
}
```

> Include **nullable** fields in `defaultValues` explicitly (`bio: user.bio ?? ""`). Omitting them leaves the input
> uncontrolled, and a Zod `z.nullable()` field rejects `undefined`.

For a `RedirectAction` form, the call only returns on failure (a redirect throws) — so `onSubmit` just runs
`applyServerErrors(form, result)`.

## Mapping server errors to fields

Factor the repeating pattern into one helper:

```typescript
function applyServerErrors<T extends Record<string, unknown>>(
  form: UseFormReturn<T>,
  result: { error: string; fieldErrors?: Record<string, string[]> }
) {
  if (result.fieldErrors) {
    Object.entries(result.fieldErrors).forEach(([field, messages]) =>
      form.setError(field as Path<T>, { type: "server", message: messages[0] })
    );
  } else {
    form.setError("root", { message: result.error });
  }
}
```

Clear a server error as the user edits so it doesn't linger:
`{...form.register("email", { onChange: () => form.clearErrors("email") })}`.

## Dynamic fields (useFieldArray)

```typescript
const schema = z.object({
  tasks: z.array(z.object({ title: z.string().min(1, "Title is required") })).min(1, "Add at least one task")
});
type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { tasks: [{ title: "" }] } });
const { fields, append, remove } = useFieldArray({ control: form.control, name: "tasks" });

// fields.map((field, i) => <input key={field.id} {...form.register(`tasks.${i}.title`)} /> … )
// append({ title: "" }) / remove(i)
```

For nested arrays, render a child component that calls `useFieldArray` with the parent index in its `name`
(`categories.${i}.items`), passing `control` down.

## Multi-step wizard

One `useForm` over a merged schema; validate only the current step's fields with `trigger` before advancing.
`FormProvider` + `useFormContext` share the form with step components.

```typescript
const fullSchema = step1Schema.merge(step2Schema);
const methods = useForm<FormData>({ resolver: zodResolver(fullSchema), mode: "onChange" });

async function next() {
  const fields = Object.keys(steps[step].shape) as Array<keyof FormData>;
  if (await methods.trigger(fields)) setStep((s) => s + 1);
}
// wrap steps in <FormProvider {...methods}>; submit only on the last step
```

## Binding to a UI library

Native inputs work with `register`. Controlled components (most design-system inputs/selects/ checkboxes) need
`Controller`, which bridges RHF's `value`/`onChange` to the component's props:

```typescript
<Controller
  name="role"
  control={control}
  render={({ field }) => <Select {...field} error={!!errors.role} options={roleOptions} />}
/>

// checkboxes/switches don't use the native value convention — remap:
<Controller
  name="newsletter"
  control={control}
  render={({ field: { value, onChange, ...field } }) => (
    <Checkbox {...field} checked={value} onCheckedChange={onChange} />
  )}
/>
```

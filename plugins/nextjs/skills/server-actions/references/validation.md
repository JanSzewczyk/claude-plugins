# Zod Validation

Validation is the security boundary of an action. One schema per input, infer the type from it (single source of truth),
and return `error.flatten().fieldErrors` so forms show per-field messages.

> **Zod version:** a few APIs differ across majors — custom messages moved from `{ required_error }` / `errorMap` (v3)
> to `{ error }` / `{ message }` (v4), and `z.nativeEnum` → `z.enum` for TS enums. Follow the project's installed
> version where they diverge.

## Schemas

```typescript
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address"),
  age: z.number().int().min(18, "Must be 18 or older")
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// derive instead of repeating
export const updateUserSchema = createUserSchema.partial();
```

Common validators: `.regex()`, `.url()`, `.uuid()`, `.trim()`, `.positive()`, `.min/.max`, `z.enum([...])`,
`z.literal(true, { message })` (terms), `z.coerce.date()`. `z.coerce.*` converts strings to the target type — essential
for `FormData`, where every value arrives as a string.

## Cross-field validation

`.refine()` validates relationships; `path` puts the error on the right field.

```typescript
export const passwordSchema = z
  .object({ password: z.string().min(8), confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
```

## Arrays, nesting, unions

```typescript
z.object({
  tags: z.array(z.string().min(1)).min(1, "Add at least one tag").max(10),
  billingAddress: addressSchema, // reuse nested schemas
  shippingAddress: addressSchema.optional()
});

// different shape per variant
z.discriminatedUnion("method", [
  z.object({ method: z.literal("card"), cardNumber: z.string().length(16) }),
  z.object({ method: z.literal("paypal"), paypalEmail: z.string().email() })
]);
```

## Parsing FormData

Values are strings (or `File`). Coerce where the schema expects another type.

```typescript
const parsed = postSchema.safeParse({
  title: formData.get("title"),
  published: formData.get("published") === "true"
});
// or, with a coercing schema: postSchema.safeParse(Object.fromEntries(formData.entries()))
```

File validation:

```typescript
z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= 5 * 1024 * 1024, "Max 5MB")
    .refine((f) => ["image/jpeg", "image/png"].includes(f.type), "Only JPG/PNG")
});
```

## Error handling & type inference

`.flatten()` splits issues into form-level and field-level — the exact shape `fieldErrors` expects:

```typescript
const flat = parsed.error.flatten();
return { success: false, error: flat.formErrors[0] ?? "Validation failed", fieldErrors: flat.fieldErrors };
```

Infer types from the schema rather than declaring them twice. `z.input` = raw form values (before transforms);
`z.output` / `z.infer` = the validated result your action and data layer use. To reshape, assign the derived schema to a
const first:

```typescript
const userEmailSchema = userSchema.pick({ email: true });
type UserEmail = z.infer<typeof userEmailSchema>;
```

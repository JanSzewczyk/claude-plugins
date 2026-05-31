# Server Action Examples

Placeholder modules — `~/auth` (auth provider), `~/lib/logger` (logging), a `[error, data]` tuple data layer,
`~/lib/toast` (client toast). Swap each for what the project uses; the structure is the point.

## Create / Update / Delete

```typescript
// features/posts/server/actions/create-post.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "~/auth";
import { createLogger } from "~/lib/logger";
import type { ActionResponse } from "~/lib/action-types";
import { createPostInDb } from "../db/posts";
import { postSchema, type CreatePostInput } from "../../schemas/post";
import type { Post } from "../../types/post";

const logger = createLogger({ module: "posts-actions" });

export async function createPost(data: CreatePostInput): ActionResponse<Post> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Authentication required" };

  const parsed = postSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [error, post] = await createPostInDb({ ...parsed.data, authorId: userId });
  if (error) {
    logger.error({ userId, operation: "createPost", errorCode: error.code }, "Failed to create post");
    return { success: false, error: "Could not create the post" };
  }

  revalidatePath("/posts");
  return { success: true, data: post, message: "Post created" };
}
```

**Update** adds an ownership check before mutating (fetch the row, compare owner, then validate + update). **Delete** is
the same minus validation, returning `ActionResponse<void>` with `data: undefined`. The ownership guard:

```typescript
const [fetchError, existing] = await getPostById(postId);
if (fetchError) return { success: false, error: "Post not found" };
if (existing.authorId !== userId) {
  logger.warn({ userId, postId }, "Unauthorized attempt");
  return { success: false, error: "Not authorized" };
}
```

> **Reads are not actions.** Fetch in the Server Component directly:
> `const [error, post] = await getPostById(id); if (error?.isNotFound) notFound();` — no action, no HTTP round-trip.

## Redirect form (with page binding)

The page binds loaded context to the action so the form component stays generic.

```typescript
// features/onboarding/server/actions/submit-preferences.ts
"use server";

import { redirect } from "next/navigation";
import { auth } from "~/auth";
import type { RedirectAction } from "~/lib/action-types";
import { updateOnboarding } from "../db/onboarding";
import { preferencesSchema, type PreferencesInput } from "../../schemas/preferences";
import type { Onboarding } from "../../types/onboarding";

export async function submitPreferences(data: PreferencesInput, onboarding: Onboarding): RedirectAction {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Authentication required" };

  const parsed = preferencesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid preferences", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [error] = await updateOnboarding(onboarding.id, { currentStep: "budget", preferences: parsed.data });
  if (error) return { success: false, error: "Could not save preferences" };

  redirect("/onboarding/budget"); // never returns
}
```

```typescript
// app/onboarding/preferences/page.tsx
export default async function PreferencesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [error, onboarding] = await getOnboardingByUser(userId);
  if (error?.isNotFound) redirect("/onboarding/welcome");
  if (error) throw error;

  async function handleSubmit(data: PreferencesInput) {
    "use server";
    return submitPreferences(data, onboarding); // bind the loaded record
  }

  return <PreferencesForm onSubmitAction={handleSubmit} defaultValues={onboarding.preferences} />;
}
```

For a **post-redirect toast**, set a short-lived cookie _before_ `redirect()` and read it on the destination page
(`await setToastCookie("Saved", "success"); redirect("/done")`). That cookie mechanism is a separate concern — this only
shows where in the action it goes.

## Client-side toast (non-redirect)

Don't set a server cookie when staying on the page — return `message`/`error`, fire the toast client-side.

```typescript
// action: revalidatePath("/settings"); return { success: true, data: profile, message: "Profile updated" };
```

```typescript
// features/settings/components/profile-form.tsx
"use client";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "~/lib/toast";
import { profileSchema, type ProfileInput } from "../schemas/profile";
import { updateProfile } from "../server/actions/update-profile";

export function ProfileForm({ defaultValues }: { defaultValues?: Partial<ProfileInput> }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues });

  function onSubmit(data: ProfileInput) {
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) return toast.success(result.message);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([f, m]) =>
          form.setError(f as keyof ProfileInput, { type: "server", message: m[0] })
        );
      }
      toast.error(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* fields */}
      <button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save"}</button>
    </form>
  );
}
```

## useActionState (native form)

Action takes `(previousState, formData)`; reads come off `FormData`.

```typescript
"use server";
import { z } from "zod";
import type { ActionResponse } from "~/lib/action-types";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

type ContactState = Awaited<ActionResponse<{ sent: boolean }>>;

export async function sendContactMessage(
  _prev: ContactState | null,
  formData: FormData
): ActionResponse<{ sent: boolean }> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message")
  });
  if (!parsed.success) {
    return { success: false, error: "Please fix the errors below", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  // … send, then:
  return { success: true, data: { sent: true }, message: "Message sent" };
}
```

Client wiring is in [hooks.md](./hooks.md).

## File upload

Validate type and size before touching storage; if storage + DB are two writes, guard against orphaning the blob when
the DB insert fails.

```typescript
"use server";
import { auth } from "~/auth";
import type { ActionResponse } from "~/lib/action-types";
import { uploadToStorage, createFileRecord } from "../db/files";
import type { UploadedFile } from "../../types/file";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function uploadFile(formData: FormData): ActionResponse<UploadedFile> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "Authentication required" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };
  if (!TYPES.includes(file.type)) return { success: false, error: "Unsupported file type" };
  if (file.size > MAX) return { success: false, error: "File is larger than 5MB" };

  const [uploadError, url] = await uploadToStorage(file, userId);
  if (uploadError) return { success: false, error: "Could not upload the file" };

  const [recordError, record] = await createFileRecord({ userId, fileName: file.name, fileType: file.type, url });
  if (recordError) return { success: false, error: "Could not save the file record" };

  return { success: true, data: record, message: "File uploaded" };
}
```

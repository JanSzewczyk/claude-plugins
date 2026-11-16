# Server action result types

Rules for writing actions: `nextjs-rules` (server action notes). This module installs only the shared result
contract and the form packages. Paths are relative to the source root.

## Install

```bash
npm install zod
npm install react-hook-form @hookform/resolvers   # only when the project builds forms with React Hook Form
```

Zod 4 uses `z.flattenError(parsed.error).fieldErrors`; on Zod 3 it is `parsed.error.flatten().fieldErrors`.

## Result types

1. Search for an existing definition: `grep -rl "ActionResponse" lib src app`.
2. If one exists, use it as is and note its import path; report it if it is not `~/lib/action-types`.
3. If none exists, copy `assets/action-types.ts` to `lib/action-types.ts`.

| Export | Use |
| --- | --- |
| `ActionResponse<T>` | Action returns data: `{ success: true, data, message? }` or `{ success: false, error, fieldErrors? }` |
| `RedirectAction` | Action ends in `redirect()`; the only value it can return is a failure |
| `isActionSuccess`, `isActionFailed` | Type guards for a result in a client component |

```ts
import type { ActionResponse } from "~/lib/action-types";

export async function createBudget(input: BudgetInput): ActionResponse<Budget> {
  // authenticate, authorize, validate, mutate, revalidate, return: see nextjs-rules
}
```

## Where actions live

`features/<feature>/server/actions/<verb>-<noun>.ts`, one action per file, starting with `"use server"`.
Run `/generate-feature-package <feature>` to create the folders.

## Verify

Type-check. Search for actions declared as `Promise<{ ok ... }>` or returning bare data and report them.

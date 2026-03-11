# PRD → Agent Breakdown Examples

Practical examples of how `product-owner` parses PRDs and maps them to specialist agents.

---

## Example 1: Budget Tracker Feature

### Input PRD

```markdown
# Feature: Budget Tracker

## Overview

Allow users to create and manage monthly budgets, tracking spending against limits.
Users need visibility into which categories are over/under budget.

## User Stories

- As a user, I can create a budget with a name, amount, and category
- As a user, I can see a list of all my budgets with current spending
- As a user, I can edit or delete existing budgets

## Acceptance Criteria

- [ ] Budget form validates required fields (name, amount > 0, category)
- [ ] Budget list shows progress bar (spent / limit)
- [ ] Delete requires confirmation dialog
- [ ] Changes persist immediately (optimistic UI)
- [ ] Error toast shown on save failure

## Technical Constraints

- Auth: authenticated users only, own budgets only
- Existing schema: must integrate with existing `transactions` collection
- Performance: list must render < 50 budgets without virtualization
```

### Generated Breakdown

| #   | Task                                                                          | Agent                      | Depends on | Priority |
| --- | ----------------------------------------------------------------------------- | -------------------------- | ---------- | -------- |
| 1   | Define `Budget` Firestore schema + TypeScript types                           | `database-architect`       | —          | P0       |
| 2   | Implement Server Actions: `createBudget`, `updateBudget`, `deleteBudget`      | `nextjs-backend-engineer`  | #1         | P0       |
| 3   | Build `BudgetForm` component with Zod validation                              | `frontend-expert`          | #2         | P1       |
| 4   | Build `BudgetList` component with progress bars                               | `frontend-expert`          | #2         | P1       |
| 5   | Build `DeleteConfirmDialog` component                                         | `frontend-expert`          | #2         | P1       |
| 6   | Write Storybook stories for `BudgetForm`, `BudgetList`, `DeleteConfirmDialog` | `storybook-test-architect` | #3, #4, #5 | P1       |
| 7   | Plan test strategy (unit tests for validation logic)                          | `testing-strategist`       | #3, #4     | P2       |
| 8   | Final code review                                                             | `code-reviewer`            | All        | P2       |

---

## Example 2: Authentication Flow (PRD + TDD)

### Input PRD

```markdown
# Feature: Email/Password Authentication

## Overview

Add email/password sign-in and sign-up using Firebase Auth.
New users see onboarding; returning users go directly to dashboard.

## User Stories

- As a visitor, I can sign up with email and password
- As a user, I can sign in with email and password
- As a user, I can reset my forgotten password

## Out of Scope

- Social login (Google, GitHub) — deferred
- 2FA — separate ticket
```

### Input TDD (excerpt)

```markdown
## Architecture

- `src/features/auth/` — auth module
- `src/middleware.ts` — route protection

## Security

- All `/app/*` routes require authentication
- Redirect unauthenticated users to `/login`
```

### Generated Breakdown

| #   | Task                                                                  | Agent                      | Depends on | Priority |
| --- | --------------------------------------------------------------------- | -------------------------- | ---------- | -------- |
| 1   | Define auth user types + Firestore `users` collection schema          | `database-architect`       | —          | P0       |
| 2   | Implement middleware for route protection + Firebase Auth integration | `nextjs-backend-engineer`  | #1         | P0       |
| 3   | Implement Server Actions: `signUp`, `signIn`, `resetPassword`         | `nextjs-backend-engineer`  | #1         | P0       |
| 4   | Build `SignInForm` component                                          | `frontend-expert`          | #3         | P1       |
| 5   | Build `SignUpForm` component                                          | `frontend-expert`          | #3         | P1       |
| 6   | Build `ResetPasswordForm` component                                   | `frontend-expert`          | #3         | P1       |
| 7   | Write Storybook stories for all auth forms                            | `storybook-test-architect` | #4, #5, #6 | P1       |
| 8   | Write E2E tests for sign-in → dashboard flow                          | `testing-strategist`       | #4, #5     | P2       |
| 9   | Final code review                                                     | `code-reviewer`            | All        | P2       |

---

## Example 3: PRD with Performance Constraint

### Input PRD (excerpt)

```markdown
## Technical Constraints

- Performance: dashboard must achieve LCP < 2.5s
- Bundle: no new dependencies > 50KB gzipped
```

### Extra task added to breakdown

| #   | Task                                           | Agent                  | Depends on         | Priority |
| --- | ---------------------------------------------- | ---------------------- | ------------------ | -------- |
| N   | Bundle analysis + Core Web Vitals optimization | `performance-analyzer` | All implementation | P2       |

---

## Delegation Prompt Format

For each task in the breakdown, `product-owner` generates a ready-to-paste prompt:

```
**Task #3 → @frontend-expert**

Context: We are building a Budget Tracker feature. The Firestore schema and Server Actions
are already implemented (Tasks #1 and #2 are done).

Your task: Build the `BudgetForm` React component.

Requirements:
- Fields: name (text), amount (number, > 0), category (select: Food/Transport/Entertainment/Other)
- Validation with Zod (client-side, matching the server schema)
- Submit calls the `createBudget` / `updateBudget` Server Action
- Show loading state during submission
- On success: reset form and show success toast
- On error: show error toast with message from ServiceError
- Reusable for both create and edit modes (prop: `initialValues?`)

Files to create:
- `src/features/budgets/components/budget-form.tsx`
- `src/features/budgets/schemas/budget-schema.ts`

Reference: existing error handling pattern in `.claude/project-context.md`
```

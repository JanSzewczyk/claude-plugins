# Step gates

Used by `run-nextjs-task`. A gate is what a hand-off must contain before the next step runs. A
failed gate is resent once with what is missing; a second failure stops the flow and the report
says so.

| Step | Agent | Prompt asks for | Gate |
| --- | --- | --- | --- |
| Build | developer | the files changed by kind (route, page or layout, server action or service, server component, client component, story, test); each `'use client'` with its reason; each acceptance criterion with its test file and layer (unit, component, story, E2E); which checks it ran (type-check, lint, unit tests, story tests) with their summary lines; commit the work and return the hash | every criterion mapped to a test or marked untested with a reason, and every check stated as run or not run; either missing fails the gate |
| Test | tester | the criteria, the developer's mapping and files, the environment note | a Result line, one green command per layer it touched, the run time, and a defects table |
| Fix | developer | the tester's defects table, in its order | every number comes back fixed or disputed with a reason; run the tester's green commands yourself |
| Review | reviewer | the developer's latest hand-off, the tester's files and green commands, the diff base, which pass | a verdict, a scorecard and a findings table whose rows each cite a rule or a reproduction |
| Fix again | developer, then reviewer | the finding numbers, in the reviewer's order | every number comes back fixed or disputed with a reason, and the green commands pass before the reviewer sees the diff; the reviewer then sees only what changed |

## Commands

- **Never a watching command.** A script without `run` (`vitest --project=storybook`) waits for
  input and never returns. Run `npx vitest run --project=<project> <files>` instead, and name that
  as the green command.
- **The constitution's `test` may cover one layer only.** When it runs unit tests alone, story and
  component tests that the task added need their own command; the tester names it.
- **`next build`** only when the diff touches `next.config`, `proxy.ts` (or `middleware`), route
  segment config, metadata, dynamic route params, or a `'use client'`, `'use server'` or
  `server-only` boundary. Otherwise it is listed under Not checked.
- **E2E** is Not checked by default. Run it only when a criterion is a flow across pages, a build
  passed, the test server's port is free (`lsof -i :<port>`) and `CI=1` is set, so Playwright starts
  its own server instead of reusing one another worktree started.

A defect the tester marks as a stricter reading of an ambiguous criterion is the developer's call:
it is fixed or disputed, and the report lists it as a decision taken.

Only 🔴 and 🟡 findings are fixed; 🔵 ones go to the report as follow-ups. After the second review
stop and report: open findings are listed, not looped on.

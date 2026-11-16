# Budgets

Used by `run-nextjs-task`. A task is a sub-step of a larger piece of work, and a later audit
(`/sdd:review`) covers the whole feature. So:

- Each agent gets about 25 minutes. A step that overruns hands back what it has; an unfinished
  proof is listed under Not checked, not run to the end.
- The developer iterates on the tests it changed and runs type-check, lint and the touched layers
  once before each commit. The tester and the reviewer run each layer once at the commit they were
  given, and quote a green result at the same commit instead of repeating it.
- The tester makes **one pass**: it runs each touched layer once, runs browser tests (Storybook in
  a browser, E2E) at most once, and does not chase coverage, rerun for flakiness or hunt for rare
  defects.
- No Lighthouse, no visual regression, no bundle analysis. Accessibility comes from the Storybook
  a11y addon on the stories the task touched.
- Installing packages in a fresh worktree counts against the developer's budget, not as extra time.

---
title: Adopt the React Compiler and stop hand-writing memoization
summary: Compile every component, lint for what it skips, and keep manual memoization only for four documented cases.
impact: high
applies: [typescript, react, react-compiler]
decides: [style/typescript/react/leave-memoization-to-the-react-compiler, style/typescript/react/fail-lint-on-react-compiler-diagnostics, style/typescript/react/call-hooks-only-at-the-top-level]
sources: [https://react.dev/learn/react-compiler/introduction, https://react.dev/learn/react-compiler/installation, https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler, https://react.dev/reference/eslint-plugin-react-hooks, https://react.dev/reference/react/Profiler]
---

## Decision

Run the React Compiler on the whole app (`compilationMode: "infer"`, the default) and write components as plain code: no `useMemo`, `useCallback` or `memo` except the four documented cases (a callback for a non-React library, a context provider value, a measured expensive computation, a subscription handler), each with a JSDoc comment. Lint with the `recommended` preset of `eslint-plugin-react-hooks`, which carries the compiler rules, and fix what it reports instead of disabling rules. Call hooks only at the top level, since the compiler skips code that breaks the Rules of Hooks.

## Options

| Option | Fits when | Cost |
| --- | --- | --- |
| `reactCompiler: true` (infer mode, all components) | new code, or an app whose lint is clean | slightly slower builds; components that break the rules are skipped silently unless linted |
| `reactCompiler: { compilationMode: "annotation" }` with `"use memo"` per component | a large legacy app adopted one module at a time | every component must be opted in by hand; easy to forget |
| compiler off | the app cannot install the Babel plugin | every memoization is manual and its dependency arrays drift |

`"use no memo"` inside a component opts it out. Use it only as a temporary escape hatch for a component that misbehaves when compiled, with a JSDoc comment naming the bug, and remove it once the code is fixed.

`reactCompiler.environment.enablePreserveExistingMemoizationGuarantees` decides whether the compiler keeps the guarantees of `useMemo`/`useCallback` already in the code. Its default differs between compiler versions, so set it explicitly when you rely on it.

## Evolution

**Enable it (Next.js 16).** Install `babel-plugin-react-compiler` as a dev dependency and set the top-level `reactCompiler: true` in `next.config.ts`. Before Next.js 16 the key was `experimental.reactCompiler`; move it when upgrading. Outside Next.js, add the Babel plugin first in the plugin list.

**Lint it.** Install `eslint-plugin-react-hooks` and add `reactHooks.configs.flat.recommended` to `eslint.config.js`. It replaces the older `eslint-plugin-react-compiler`; remove that plugin and its `react-compiler/react-compiler` rule. `preserve-manual-memoization` checks that memoization already in the code can be kept by the compiler; it does not flag memoization as unnecessary.

**Verify it is active.** In development, React DevTools shows a "Memo ✨" badge next to compiled components. In build output, compiled modules import `react/compiler-runtime`. A component without the badge was skipped: read the lint output for it.

**Migrate one module at a time.**

1. Fix the lint diagnostics in the module so the compiler stops skipping its components.
2. Remove `useMemo`, `useCallback` and `memo` from it.
3. Keep only the four exception cases and add the JSDoc comment that names each.
4. Run the module's tests and stories, then move to the next module.

**Profile before adding memoization back.** Record the interaction in the React DevTools Profiler, or wrap the subtree in `<React.Profiler id="..." onRender={...}>` and send the durations to the project logger or a test assertion. Add manual memoization only when the profile shows a component rendering more than about 10 times a second, a render over 16 ms, or a computation over 100 ms, and write the measured figure in its JSDoc comment.

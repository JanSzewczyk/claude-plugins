---
title: Fix React Compiler lint diagnostics instead of switching the rules off
summary: The recommended preset carries the React Compiler rules; a disabled rule hides code the compiler silently skips.
impact: medium
applies: [typescript, react, react-compiler]
sources: [https://react.dev/reference/eslint-plugin-react-hooks, https://react.dev/learn/react-compiler/installation, https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks]
---

## Rule

Lint React code with the `recommended` preset of `eslint-plugin-react-hooks`, which includes the React Compiler rules, and run that lint in CI. Fix a compiler diagnostic in the code; do not set the rule to `off` or silence it with `eslint-disable`.

## Why

When a component breaks a compiler rule the compiler skips it without failing the build, so the component silently loses its memoization and the reason is visible only in the lint output.

## Incorrect

```js
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([
  reactHooks.configs.flat.recommended,
  { rules: { "react-hooks/refs": "off", "react-hooks/immutability": "off" } },
]);
```

## Correct

```js
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";

export default defineConfig([reactHooks.configs.flat.recommended]);
```

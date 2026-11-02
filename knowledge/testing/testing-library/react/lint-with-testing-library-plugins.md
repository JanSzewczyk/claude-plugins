---
title: Lint tests with the Testing Library and jest-dom ESLint plugins
summary: The plugins catch unawaited queries, wrong query variants and weak matchers before review does.
impact: medium
applies: [typescript, react, testing-library]
sources: [https://testing-library.com/docs/ecosystem-eslint-plugin-testing-library, https://testing-library.com/docs/ecosystem-eslint-plugin-jest-dom]
---

## Rule

Turn on `eslint-plugin-testing-library` with its React preset and `eslint-plugin-jest-dom` with its
recommended rules, for test files only.

## Why

Without them, a misused query or a weak matcher reaches review or stays in the suite for good, even though
a linter can flag and often autofix it on save.

## Incorrect

```ts
// eslint.config.ts: test files get only the general rules
export default [...tseslint.configs.recommended];
```

## Correct

```ts
export default [
  ...tseslint.configs.recommended,
  { files: ["**/*.test.tsx"], ...testingLibrary.configs["flat/react"] },
  { files: ["**/*.test.tsx"], ...jestDom.configs["flat/recommended"] },
];
```

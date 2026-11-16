---
title: In tests, skip env validation in setup and stub variables with vi.stubEnv before import
summary: SKIP_ENV_VALIDATION in the Vitest setup; vi.stubEnv, vi.resetModules, then a dynamic import; never set process.env.
impact: medium
applies: [typescript, nextjs, t3-env, vitest]
sources: [https://vitest.dev/api/vi.html, https://env.t3.gg/docs/nextjs]
---

## Rule

Set `SKIP_ENV_VALIDATION` and the variables most tests need in the Vitest setup file. To test another value, call `vi.stubEnv`, then `vi.resetModules()`, then import the module under test dynamically; restore with `vi.unstubAllEnvs()` or `unstubEnvs: true`. Never assign to `process.env` directly.

## Why

`env` is built once, when `data/env/server.ts` is first imported, so a value stubbed after a static import changes nothing and the test silently runs on the old one; a direct `process.env` assignment also leaks into the next test.

## Incorrect

```ts
import { templatesUrl } from "~/lib/formlens-api";

test("calls the configured API", () => {
  process.env.FORMLENS_API_URL = "http://api.test";
  expect(templatesUrl()).toBe("http://api.test/templates");
});
```

## Correct

```ts
test("calls the configured API", async () => {
  vi.stubEnv("FORMLENS_API_URL", "http://api.test");
  vi.resetModules();
  const { templatesUrl } = await import("~/lib/formlens-api");
  expect(templatesUrl()).toBe("http://api.test/templates");
});
```

## Exceptions

With validation skipped, `env` holds raw strings: no default or transform runs. When the code needs a converted value (a boolean flag, a number), mock the env module with `vi.mock("~/data/env/server", () => ({ env: { ... } }))` instead.

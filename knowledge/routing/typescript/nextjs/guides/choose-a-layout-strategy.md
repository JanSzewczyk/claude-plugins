---
title: Choose how a Next.js route loads data, guards access and renders chrome
summary: Pages own guard, reads and failure responses in loadData; layouts render chrome and read only what it needs.
impact: high
applies: [typescript, nextjs]
decides: [routing/typescript/nextjs/load-page-data-in-a-load-data-function, routing/typescript/nextjs/guard-every-protected-page-in-its-own-load-data, routing/typescript/nextjs/answer-each-page-failure-with-its-own-response, routing/typescript/nextjs/never-throw-or-redirect-in-generate-metadata, routing/typescript/nextjs/use-static-metadata-unless-the-title-needs-route-data, routing/typescript/nextjs/keep-pages-and-layouts-async-server-components, routing/typescript/nextjs/await-params-once-and-pass-plain-values-down, routing/typescript/nextjs/type-pages-and-layouts-with-generated-route-props, routing/typescript/nextjs/validate-search-params-in-load-data, routing/typescript/nextjs/compose-the-page-from-feature-components, routing/typescript/nextjs/pass-server-actions-to-client-components-as-props, routing/typescript/nextjs/load-only-chrome-data-in-a-layout, routing/typescript/nextjs/let-non-critical-chrome-data-fail-silently, routing/typescript/nextjs/keep-a-layout-without-chrome-data-synchronous, routing/typescript/nextjs/render-per-resource-chrome-in-the-page]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/layout, https://nextjs.org/docs/app/guides/authentication]
---

## Decision

Every `page.tsx` and `layout.tsx` is a Server Component typed with `PageProps` or `LayoutProps`. A page that reads data does it in one `loadData` function that checks the session first, reads, and answers failures with `notFound()`, `unauthorized()` or a throw; the page itself only composes feature components. A layout exists only when several routes share chrome: it is synchronous when the chrome needs no data, and otherwise its `loadData` reads chrome data only. A layout never stands in for a page's auth guard.

## Options

| Situation | Strategy |
| --- | --- |
| Several routes share the same chrome | `layout.tsx` in the route group |
| Chrome needs no data | synchronous layout, no `loadData` |
| Chrome needs data from route params | `async` layout whose `loadData` checks the session and reads chrome data |
| Chrome needs non-critical data | `async` layout, that read's error ignored and the chrome degrades |
| One route, or chrome built from the page's resource | no `layout.tsx`; the page renders chrome inline |
| Route is public (`proxy.ts` lets it through) | no guard, unless the data the page reads belongs to a user |

## Evolution

- Start a new route group with pages only. Add `layout.tsx` when a second route renders the same chrome.
- When chrome that used to be static starts showing user data, make the layout `async`, add `loadData` with the session check, and decide per read whether its failure is critical.
- When chrome turns per-resource (branding from the loaded resource), move it out of the layout into each page and delete the layout if nothing shared remains.

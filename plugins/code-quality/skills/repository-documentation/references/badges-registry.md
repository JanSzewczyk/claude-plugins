# Badges Registry

Curated shields.io badges for the README header and inline sections.
Pick 2-5 for the header (signal + status + meta) and use the rest inline
in their relevant sections.

## Header badges (pick 2-5)

### Always-good defaults

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/{owner}/{repo}?style=social)](https://github.com/{owner}/{repo}/stargazers)
```

Replace `MIT` with actual license from `LICENSE` file.

### Web app

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=github&utm_campaign={repo})
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/{owner}/{repo})
```

### npm package

```markdown
[![npm version](https://img.shields.io/npm/v/{package-name}.svg)](https://www.npmjs.com/package/{package-name})
[![npm downloads](https://img.shields.io/npm/dm/{package-name}.svg)](https://www.npmjs.com/package/{package-name})
[![bundle size](https://img.shields.io/bundlephobia/minzip/{package-name})](https://bundlephobia.com/package/{package-name})
[![Types](https://img.shields.io/npm/types/{package-name})](https://www.npmjs.com/package/{package-name})
```

### Mobile app (Expo)

```markdown
[![Expo](https://img.shields.io/badge/Expo-1B1F23?logo=expo&logoColor=white)](https://expo.dev/)
[![iOS](https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)](#)
```

### CLI tool

```markdown
[![npm version](https://img.shields.io/npm/v/{package-name}.svg)](https://www.npmjs.com/package/{package-name})
[![Node.js Version](https://img.shields.io/node/v/{package-name})](https://www.npmjs.com/package/{package-name})
```

### Monorepo

```markdown
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
```

## CI / quality badges (inline near workflows section)

```markdown
[![CI](https://github.com/{owner}/{repo}/actions/workflows/pr-check.yml/badge.svg)](https://github.com/{owner}/{repo}/actions/workflows/pr-check.yml)
[![CodeQL](https://github.com/{owner}/{repo}/actions/workflows/codeql.yml/badge.svg)](https://github.com/{owner}/{repo}/actions/workflows/codeql.yml)
[![Coverage](https://img.shields.io/codecov/c/github/{owner}/{repo})](https://codecov.io/gh/{owner}/{repo})
```

## Dependency version badges (REQUIRED for tech stack / dependencies)

When listing dependencies, key libraries, or the tech stack — render each
one as a shields.io badge showing the **actual version pinned in the
project's `package.json`** (not a static colour chip).

Use the `github/package-json/dependency-version` endpoint — it auto-updates
as the project bumps its dependencies. Format:

```
https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/{kind?}/{scope?}/{package}
```

- `{kind}` — omit for `dependencies`; use `dev` for `devDependencies`,
  `peer` for `peerDependencies`, `optional` for `optionalDependencies`
- `{scope}` — only for scoped packages, e.g. `@types`, `@radix-ui`
- Append `?logo={slug}&logoColor=white&label={Label}` to brand the badge

### Examples (use these patterns, fill in real owner/repo/package)

```markdown
<!-- regular dependency -->
[![Next.js](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/next?logo=nextdotjs&logoColor=white&label=Next.js)](https://nextjs.org/)
[![React](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/react?logo=react&logoColor=white&label=React)](https://react.dev/)
[![TypeScript](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/dev/typescript?logo=typescript&logoColor=white&label=TypeScript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/dev/tailwindcss?logo=tailwindcss&logoColor=white&label=Tailwind%20CSS)](https://tailwindcss.com/)

<!-- scoped package, e.g. @t3-oss/env-nextjs -->
[![T3 Env](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/@t3-oss/env-nextjs?label=t3-env)](https://env.t3.gg/)

<!-- devDependency under a scope, e.g. @types/node -->
[![@types/node](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/dev/@types/node?label=@types/node)](https://www.npmjs.com/package/@types/node)

<!-- peer dependency -->
[![React peer](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/peer/react?label=React%20(peer))](https://react.dev/)
```

### Fallback when there's no GitHub repo or package.json on a default branch

Use the npm registry endpoint (shows the latest published version, not the
pinned one):

```markdown
[![Next.js](https://img.shields.io/npm/v/next?logo=nextdotjs&logoColor=white&label=Next.js)](https://www.npmjs.com/package/next)
```

### Logo slugs cheat-sheet (use with `?logo={slug}&logoColor=white`)

Common: `nextdotjs`, `react`, `typescript`, `tailwindcss`, `vite`,
`astro`, `remix`, `svelte`, `vue`, `nuxt`, `expo`, `flutter`, `nodedotjs`,
`bun`, `pnpm`, `yarn`, `vitest`, `jest`, `playwright`, `cypress`,
`storybook`, `prisma`, `postgresql`, `mongodb`, `firebase`, `supabase`,
`vercel`, `eslint`, `prettier`, `radixui`, `framer`.

Logos are from [Simple Icons](https://simpleicons.org/) — any slug listed
there works.

### Static fallback (use only when no version info applies)

Static colour-chip badges are acceptable **only** for things that aren't a
package (platforms, services, concepts):

```markdown
[![iOS](https://img.shields.io/badge/iOS-000000?logo=apple&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white)](#)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
```

Never use a static badge for a dependency that exists in `package.json` —
the whole point is that the badge stays current as the project upgrades.

## License badges

Match actual license:

| License | Badge |
|---------|-------|
| MIT | `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)` |
| Apache-2.0 | `[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)` |
| GPL-3.0 | `[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)` |
| ISC | `[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)` |
| BSD-3-Clause | `[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)` |

## Rules

- Header: max 5 badges (more becomes noise)
- License badge must match the actual `LICENSE` file
- Skip badges that point to non-existent services (e.g., no Codecov badge if there's no Codecov setup)
- Tech stack badges: include only tools mentioned in Features — don't pad
- All badge URLs must be valid; if uncertain about a package name, use a plain text alternative

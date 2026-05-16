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

## Tech stack badges (inline in Features or dedicated section)

```markdown
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Storybook](https://img.shields.io/badge/Storybook-FF4785?logo=storybook&logoColor=white)](https://storybook.js.org/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
```

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

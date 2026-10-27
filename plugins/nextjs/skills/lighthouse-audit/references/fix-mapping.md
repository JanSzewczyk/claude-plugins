# Audit ID → Next.js Fix Mapping

Maps Lighthouse audit IDs to concrete Next.js 15+ code changes.
Use this during Step 8 (action plan generation) in SKILL.md.

## Performance

### `largest-contentful-paint` — LCP too slow

Identify the LCP element from `details.items[0]` in the audit JSON.

| Root Cause | Fix |
|------------|-----|
| Hero image not preloaded | Add `priority` prop to `<Image>` component in the page/layout |
| LCP is text (font swap) | Use `next/font` with `display: 'swap'`; add `preload: true` |
| Slow server response | Move data fetching to RSC; enable Next.js full-route cache |
| Large image payload | Use `<Image>` with correct `width`/`height`; add `sizes` prop for responsive |

```tsx
// Before
<img src="/hero.jpg" />

// After
import Image from 'next/image'
<Image src="/hero.jpg" alt="..." width={1200} height={600} priority />
```

---

### `cumulative-layout-shift` — CLS layout shifts

| Root Cause | Fix |
|------------|-----|
| Images without dimensions | Always provide `width` + `height` on `<Image>` |
| Fonts causing FOUT/FOIT | Use `next/font` — it inlines CSS and eliminates font layout shifts |
| Dynamic content injected above fold | Use skeleton/placeholder with fixed height |
| Ads or embeds | Wrap in container with `min-height` |

```tsx
// next/font eliminates font-related CLS
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })
```

---

### `total-blocking-time` / `interaction-to-next-paint` — Long tasks / slow INP

| Root Cause | Fix |
|------------|-----|
| Heavy JS on main thread | Move logic to RSC; use `dynamic()` imports |
| Large third-party scripts | Use `<Script strategy="lazyOnload">` or `"afterInteractive"` |
| Expensive event handlers | Wrap with `startTransition` for non-urgent updates |
| Large lists | Virtualize with `@tanstack/react-virtual` |

```tsx
import dynamic from 'next/dynamic'
const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false })

import { Script } from 'next/script'
<Script src="https://analytics.example.com/script.js" strategy="lazyOnload" />
```

---

### `unused-javascript` — Dead JS in bundles

| Root Cause | Fix |
|------------|-----|
| Entire library imported | Use named imports: `import { format } from 'date-fns'` |
| Component loaded eagerly | Use `dynamic()` for below-fold or conditional components |
| Large client component tree | Convert leaf components to RSC; push `'use client'` down |

---

### `render-blocking-resources` — Blocking CSS/JS

| Root Cause | Fix |
|------------|-----|
| External CSS in `<head>` | Move to CSS Modules or inline critical CSS |
| Synchronous third-party scripts | Add `async`/`defer` or use `next/script` |

---

### `uses-optimized-images` / `modern-image-formats` — Unoptimized images

Always use `next/image` — it auto-converts to WebP/AVIF and serves responsive sizes.

```tsx
// Replaces <img> tags
import Image from 'next/image'
<Image src={src} alt={alt} width={800} height={600} />
```

---

### `server-response-time` — Slow TTFB

| Root Cause | Fix |
|------------|-----|
| Slow data fetch in RSC | Cache with `unstable_cache` or `revalidate` option |
| No full-route cache | Add `export const revalidate = 3600` to page |
| Waterfall fetches | Use `Promise.all()` for parallel fetches |

```tsx
import { unstable_cache } from 'next/cache'
const getData = unstable_cache(async () => fetch('/api/data').then(r => r.json()), ['data'], { revalidate: 3600 })
```

---

### `uses-text-compression` — Missing gzip/brotli

Enabled automatically in Next.js production. If missing, check custom server config
or middleware that bypasses Next.js compression.

---

## Accessibility

### `color-contrast` — Insufficient contrast

Check `details.items` for specific elements. Increase foreground/background contrast
ratio to ≥ 4.5:1 (normal text) or ≥ 3:1 (large text / UI components).

Use the `szum-tech-design-system` skill — the design system's semantic color tokens
are WCAG AA compliant by default.

---

### `image-alt` — Images missing alt text

```tsx
// All <Image> and <img> need meaningful alt
<Image src={src} alt="Description of image content" />

// Decorative images use empty alt
<Image src={decorative} alt="" aria-hidden />
```

---

### `aria-*` / `label` audits — Missing ARIA labels

```tsx
// Form inputs
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// Or aria-label for icon buttons
<button aria-label="Close dialog"><XIcon /></button>
```

---

### `heading-order` — Skipped heading levels

Ensure `<h1>` → `<h2>` → `<h3>` sequence is never skipped. Use a single `<h1>` per page.

---

### `focus-traps` / `tabindex` — Keyboard navigation issues

Never set `tabIndex > 0`. Avoid `tabIndex={-1}` on interactive elements unless
managing focus programmatically (modals, drawers).

---

## Best Practices

### `uses-http2` — Not using HTTP/2

Vercel and most Next.js hosts enable HTTP/2 by default. Check your custom server or proxy.

---

### `no-vulnerable-libraries` — Outdated dependencies with CVEs

Run `/update-deps` to update all packages. Check `npm audit` for specific CVEs.

---

### `js-libraries` — Outdated JS libraries

```bash
npx npm-check-updates -u
npm install
```

---

### `errors-in-console` — JS errors on load

Check browser console errors during audit. Common Next.js causes:
- Hydration mismatch (RSC/client boundary issues)
- Missing `key` prop on lists
- Unhandled promise rejections in RSC

---

## SEO

### `meta-description` — Missing meta description

```tsx
// app/<route>/page.tsx
export const metadata = {
  description: 'Concise 150-160 char description of this page for search engines.',
}
```

---

### `document-title` — Missing or generic title

```tsx
export const metadata = {
  title: 'Page Title | Site Name',
}
```

---

### `robots-txt` — Missing robots.txt

Create `app/robots.ts`:
```tsx
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://example.com/sitemap.xml',
  }
}
```

---

### `canonical` — Missing canonical URL

```tsx
export const metadata = {
  alternates: { canonical: 'https://example.com/page' },
}
```

---

## PWA

PWA audits are lower priority for most Next.js apps unless PWA is a project goal.
Key requirements: HTTPS, service worker, web manifest.

Use `next-pwa` package for service worker support:
```bash
npm install next-pwa
```

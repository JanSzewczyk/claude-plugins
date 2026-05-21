# Section Standards (Szum-Tech README)

The canonical structure derived from `nextjs-szumplate/README.md`. Every
generated README follows this skeleton; per-type templates add or omit
specific sections but preserve the overall flow and style.

## Canonical section order

1. **Header block** (centered)
2. `---` separator
3. **Hello there!** (intro)
4. **Features** (grouped)
5. **Table of Contents**
6. `---`
7. **Getting Started** (Prerequisites + numbered installation)
8. `---`
9. **Per-type sections** (see each template)
10. **Project Structure**
11. **Contributing**
12. **License**
13. **Acknowledgments**
14. **Contact & Support**
15. `---`
16. **Footer** (centered, "Back to Top" link)

## Header block

```markdown
<div align="center">

# {emoji} {Project Name}

[![Badge 1](url)](link)
[![Badge 2](url)](link)
[![Badge 3](url)](link)

**{One-line tagline describing what it is and who it's for}**

[Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-table-of-contents) • [Deployment](#-deployment)

</div>

---
```

**Rules:**
- Title emoji should reflect project type: `🚀` web/template, `📱` mobile, `📦` npm, `⚙️` cli, `🧩` plugin, `🏗️` monorepo
- Minimum 2 badges, max 5 in header (more go in dedicated section if needed)
- Tagline in `**bold**`, single line, 6-15 words
- Nav links: 3-5 items, point to actual H2 anchors

## Style rules

### Emojis on headings

- Every H2: leading emoji + space + title
- Every H3: leading emoji + space + title (smaller, more functional)
- H4+: emoji optional

Common emoji map:
- Features: ✨
- Core/Tech: 🏗️ or 🛠️
- Testing: 🧪
- Quality: 🧹
- DevOps/CI: 🚀 or 🤖
- DX: 💻
- Performance: 🏆 or ⚡
- Getting Started: 🎯
- Prerequisites: 📋
- Installation: 📦
- Deployment: 🚀
- Scripts: 📃
- Styling: 🎨
- Env vars: 💻 or 🔐
- Logging: 📝
- Security: 🔒
- Project Structure: 📁
- Contributing: 🤝
- License: 📜
- Acknowledgments: 🙏
- Contact: 📧

### Features section format

Group features into sub-sections by category. Each feature line:

```markdown
- **{emoji} [Name](url)** — {one-line benefit, sentence case, no period}
```

### Dependencies / tech stack rendering

Whenever the README enumerates project dependencies, the **Tech Stack**, the
"Core Technologies" sub-section of Features, or any list of libraries the
project depends on — render every entry as a **shields.io dependency-version
badge** that auto-reflects the version pinned in `package.json`. Static
colour-chip badges are forbidden for anything that exists as a package in
`package.json`.

Use the format from `badges-registry.md` →
*Dependency version badges*:

```
https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/{kind?}/{scope?}/{package}?logo={slug}&logoColor=white&label={Label}
```

For grouped bullet lists, place the badge before the description:

```markdown
- [![Next.js](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/next?logo=nextdotjs&logoColor=white&label=Next.js)](https://nextjs.org/) — App Router, Server Components, Server Actions
- [![Tailwind CSS](https://img.shields.io/github/package-json/dependency-version/{owner}/{repo}/dev/tailwindcss?logo=tailwindcss&logoColor=white&label=Tailwind%20CSS)](https://tailwindcss.com/) — utility-first styling with design tokens
```

For a compact "Tech Stack" line, render badges inline:

```markdown
[![Next.js](…/next?…)](…) [![React](…/react?…)](…) [![TypeScript](…/dev/typescript?…)](…)
```

Use `npm/v/{package}` only as a fallback when there's no public GitHub repo
to read `package.json` from.

### Code blocks

- Always specify language: ` ```bash`, ` ```typescript`, ` ```json`, ` ```env`, ` ```tsx`
- Bash blocks: one command per line, no `$` prefix
- For multi-command setup, use numbered steps with one fenced block per step

### Tables

Use sparingly. Good for:
- Scripts overview (when > 10 scripts and grouping needed)
- Monorepo packages list
- Comparison tables in npm packages

Skip tables for: features (use grouped lists), simple key-value pairs (use bullet `**key** — value`).

### Links

- Inline markdown links `[label](url)`, never reference-style `[label][1]`
- External links to docs of every tool/framework on first mention
- Internal anchors lowercase-kebab-case matching heading text without emoji/punctuation

## Getting Started skeleton

```markdown
## 🎯 Getting Started

### 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version {X}.x or higher)
- **{Package manager}** (npm/pnpm/yarn/bun)
- **Git** for version control
{type-specific prerequisites}

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone {repo-url}
cd {project-name}
```

#### 2. Install Dependencies

```bash
{install command}
```

#### 3. {Configure environment / Setup} {if applicable}

#### 4. {Run dev server / Build / Test}
```

## Project Structure skeleton

```markdown
## 📁 Project Structure

```
{project-name}/
├── {dir1}/              # {purpose}
├── {dir2}/              # {purpose}
...
```

### Key Directories

- **`{dir1}/`** — {longer explanation}
- **`{dir2}/`** — {longer explanation}

### Important Configuration Files

- **`{file1}`** — {what it configures}
- **`{file2}`** — {what it configures}
```

## Footer

```markdown
<div align="center">

**Made with ❤️ by [{Author}]({author-url})**

If this {project type} helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{slugified-title})

</div>
```

## Anti-patterns (do NOT do)

- ❌ Multiple H1 headings (only the title is H1)
- ❌ Inline HTML beyond `<div align="center">`, `<br>`, `<img>` (no `<table>`, no custom styling)
- ❌ Emoji shortcodes (`:rocket:`) — use literal emoji (`🚀`)
- ❌ Trailing whitespace, multiple blank lines between sections (max 1 blank line, plus separator `---` where the skeleton calls for it)
- ❌ Hard-coded line breaks (`<br>`) inside paragraphs
- ❌ Generic filler text like "This project is awesome" — every sentence carries information
- ❌ Sections with only "TODO" or empty body — omit the section instead

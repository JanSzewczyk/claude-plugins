# Template: web-app

For: Next.js, Vite + React, Astro, Remix, SvelteKit, Gatsby, any
deployable web frontend.

## Required metadata

- `{{name}}` — project name
- `{{title}}` — display title (often same as name, properly cased)
- `{{tagline}}` — one-line description
- `{{owner}}`, `{{repo}}` — GitHub coordinates
- `{{license}}` — from LICENSE file
- `{{node_version}}` — from engines.node or .nvmrc
- `{{package_manager}}` — npm / pnpm / yarn / bun
- `{{install_cmd}}` — `npm ci` / `pnpm i --frozen-lockfile` / etc.
- `{{dev_cmd}}` — `npm run dev`
- `{{framework}}` — Next.js / Vite / Astro / etc.
- `{{deployment_target}}` — Vercel / Netlify / Cloudflare / self-hosted

## Ask the user if missing

- Deployment target (if no `vercel.json` / `netlify.toml`)
- Whether project uses a custom design system

## Template

````markdown
<div align="center">

# 🚀 {{title}}

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_source=github&utm_campaign={{repo}})
[![GitHub stars](https://img.shields.io/github/stars/{{owner}}/{{repo}}?style=social)](https://github.com/{{owner}}/{{repo}}/stargazers)
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-table-of-contents) • [Deployment](#-deployment)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

### 🏗️ Core Technologies

{{core_tech_list}}

### 🧪 Testing & Quality

{{testing_list}}

### 🤖 Automation & DevOps

{{devops_list}}

### 🔧 Developer Experience

{{dx_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🎯 Getting Started](#-getting-started)
- [🚀 Deployment](#-deployment)
- [📃 Scripts Overview](#-scripts-overview)
- [🧪 Testing](#-testing)
- [🎨 Styling](#-styling)
- [💻 Environment Variables](#-environment-variables)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 🎯 Getting Started

### 📋 Prerequisites

- **Node.js** (version {{node_version}} or higher)
- **{{package_manager}}** package manager
- **Git** for version control

### 📦 Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/{{owner}}/{{repo}}.git
cd {{repo}}
```

#### 2. Install Dependencies

```bash
{{install_cmd}}
```

#### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
{{env_example}}
```

#### 4. Start Development Server

```bash
{{dev_cmd}}
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🚀 Deployment

{{deployment_section}}

---

## 📃 Scripts Overview

{{scripts_grouped}}

---

## 🧪 Testing

{{testing_section}}

---

## 🎨 Styling

{{styling_section}}

---

## 💻 Environment Variables

{{env_section}}

---

## 📁 Project Structure

```
{{project_tree}}
```

### Key Directories

{{key_directories}}

### Important Configuration Files

{{key_config_files}}

---

## 🤝 Contributing

Contributions are welcome! See the [Contributing](#-contributing) flow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **{{license}} License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

{{acknowledgments}}

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/{{owner}}/{{repo}}/issues)
- ⭐ [Star this repository](https://github.com/{{owner}}/{{repo}})
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/{{owner}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

If this project helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{{title_slug}})

</div>
````

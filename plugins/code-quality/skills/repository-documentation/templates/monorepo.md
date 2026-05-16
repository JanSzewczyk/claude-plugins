# Template: monorepo

For: Turborepo, Nx, pnpm workspaces, Lerna repositories.

## Required metadata

- Standard set
- `{{monorepo_tool}}` — Turborepo / Nx / pnpm / Lerna
- `{{packages_table}}` — table of packages with paths and purposes
- `{{apps_table}}` — table of apps (if `apps/` exists)

## Template

````markdown
<div align="center">

# 🏗️ {{title}}

[![Turborepo](https://img.shields.io/badge/{{monorepo_tool}}-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Apps](#-apps) • [Packages](#-packages) • [Getting Started](#-getting-started) • [Documentation](#-table-of-contents)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

{{features_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [📱 Apps](#-apps)
- [📦 Packages](#-packages)
- [🎯 Getting Started](#-getting-started)
- [📃 Scripts Overview](#-scripts-overview)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 📱 Apps

{{apps_table}}

---

## 📦 Packages

{{packages_table}}

---

## 🎯 Getting Started

### 📋 Prerequisites

- **Node.js** (version {{node_version}} or higher)
- **{{package_manager}}** package manager
- **Git** for version control

### 📦 Installation

```bash
git clone https://github.com/{{owner}}/{{repo}}.git
cd {{repo}}
{{install_cmd}}
```

### 🚀 Run All Apps in Dev Mode

```bash
{{dev_cmd}}
```

### 🎯 Run a Specific App

```bash
{{filter_cmd}}
```

---

## 📃 Scripts Overview

{{scripts_grouped}}

---

## 🧪 Testing

{{testing_section}}

---

## 🚀 Deployment

{{deployment_section}}

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

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add a [Changeset](https://github.com/changesets/changesets): `pnpm changeset`
4. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a Pull Request

---

## 📜 License

This monorepo is licensed under the **{{license}} License**. See the [LICENSE](LICENSE) file for details.

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

[⬆ Back to Top](#-{{title_slug}})

</div>
````

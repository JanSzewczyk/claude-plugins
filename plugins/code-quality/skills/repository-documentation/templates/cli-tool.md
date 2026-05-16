# Template: cli-tool

For: command-line tools published to npm with a `bin` entry.

## Required metadata

- Standard set
- `{{package_name}}` — package name
- `{{binary_name}}` — actual command users type
- `{{commands_list}}` — main commands with one-line descriptions
- `{{example_usage}}` — realistic invocation example

## Template

````markdown
<div align="center">

# ⚙️ {{title}}

[![npm version](https://img.shields.io/npm/v/{{package_name}}.svg)](https://www.npmjs.com/package/{{package_name}})
[![npm downloads](https://img.shields.io/npm/dm/{{package_name}}.svg)](https://www.npmjs.com/package/{{package_name}})
[![Node.js Version](https://img.shields.io/node/v/{{package_name}})](https://www.npmjs.com/package/{{package_name}})
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Installation](#-installation) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Configuration](#-configuration)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

{{features_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Commands](#-commands)
- [🔧 Configuration](#-configuration)
- [💡 Examples](#-examples)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 📦 Installation

### Global

```bash
npm install -g {{package_name}}
```

### One-off (no install)

```bash
npx {{package_name}} --help
```

### As a project dev dependency

```bash
npm install --save-dev {{package_name}}
```

---

## 🚀 Quick Start

```bash
{{example_usage}}
```

---

## ⚙️ Commands

{{commands_section}}

Run `{{binary_name}} --help` to see all available commands and flags.

---

## 🔧 Configuration

{{configuration_section}}

---

## 💡 Examples

{{examples_section}}

---

## 📁 Project Structure

```
{{project_tree}}
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a Pull Request

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
- 📦 [View on npm](https://www.npmjs.com/package/{{package_name}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

[⬆ Back to Top](#-{{title_slug}})

</div>
````

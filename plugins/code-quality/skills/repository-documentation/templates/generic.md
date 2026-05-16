# Template: generic (fallback)

Used when no specific type matches (Python, Go, Rust, mixed-stack,
unknown). Keep it minimal but consistent with the Szum-Tech standard.

## Required metadata

- `{{title}}`, `{{tagline}}`, `{{owner}}`, `{{repo}}`, `{{license}}`
- `{{language}}` — primary language
- `{{install_steps}}` — language-specific install steps

## Template

````markdown
<div align="center">

# 📚 {{title}}

[![GitHub stars](https://img.shields.io/github/stars/{{owner}}/{{repo}}?style=social)](https://github.com/{{owner}}/{{repo}}/stargazers)
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-table-of-contents)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

{{features_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🎯 Getting Started](#-getting-started)
- [🚀 Usage](#-usage)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 🎯 Getting Started

### 📋 Prerequisites

{{prerequisites_list}}

### 📦 Installation

```bash
git clone https://github.com/{{owner}}/{{repo}}.git
cd {{repo}}
```

{{install_steps}}

---

## 🚀 Usage

{{usage_section}}

---

## 📁 Project Structure

```
{{project_tree}}
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
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
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/{{owner}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

[⬆ Back to Top](#-{{title_slug}})

</div>
````

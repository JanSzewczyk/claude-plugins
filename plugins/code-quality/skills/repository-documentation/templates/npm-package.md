# Template: npm-package

For: published libraries, React component packages, utility packages,
SDKs, anything installable via `npm install`.

## Required metadata

- Standard set
- `{{package_name}}` — `package.json#name` (with scope if any)
- `{{peer_deps}}` — required peer dependencies
- `{{exports_summary}}` — what the package exports (main APIs)
- `{{usage_example}}` — minimal working snippet

## Ask the user if missing

- Primary usage example (if not obvious from exports)
- Whether package supports tree-shaking / SSR / both ESM and CJS

## Template

````markdown
<div align="center">

# 📦 {{title}}

[![npm version](https://img.shields.io/npm/v/{{package_name}}.svg)](https://www.npmjs.com/package/{{package_name}})
[![npm downloads](https://img.shields.io/npm/dm/{{package_name}}.svg)](https://www.npmjs.com/package/{{package_name}})
[![bundle size](https://img.shields.io/bundlephobia/minzip/{{package_name}})](https://bundlephobia.com/package/{{package_name}})
[![Types](https://img.shields.io/npm/types/{{package_name}})](https://www.npmjs.com/package/{{package_name}})
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api) • [Documentation](#-table-of-contents)

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
- [🚀 Usage](#-usage)
- [📚 API](#-api)
- [💡 Examples](#-examples)
- [🧪 Testing](#-testing)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 📦 Installation

```bash
npm install {{package_name}}
# or
pnpm add {{package_name}}
# or
yarn add {{package_name}}
```

### Peer Dependencies

{{peer_deps_block}}

---

## 🚀 Usage

```{{usage_lang}}
{{usage_example}}
```

---

## 📚 API

{{api_section}}

---

## 💡 Examples

{{examples_section}}

---

## 🧪 Testing

{{testing_section}}

---

## 📁 Project Structure

```
{{project_tree}}
```

### Key Directories

{{key_directories}}

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
4. Run tests: `npm test`
5. Open a Pull Request

---

## 📜 License

This package is licensed under the **{{license}} License**. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

{{acknowledgments}}

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/{{owner}}/{{repo}}/issues)
- ⭐ [Star this repository](https://github.com/{{owner}}/{{repo}})
- 📦 [View on npm](https://www.npmjs.com/package/{{package_name}})
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/{{owner}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

If this package helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{{title_slug}})

</div>
````

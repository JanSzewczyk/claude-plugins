# Template: claude-plugin

For: Claude Code marketplace repositories containing skills and/or agents.

## Required metadata

- Standard set
- `{{marketplace_name}}` — from `.claude-plugin/marketplace.json#name`
- `{{plugins_table}}` — table listing all plugins with their skills/agents
- `{{install_command}}` — `claude plugin marketplace add ...`

## Template

````markdown
<div align="center">

# 🧩 {{title}}

[![Claude Code](https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![GitHub stars](https://img.shields.io/github/stars/{{owner}}/{{repo}}?style=social)](https://github.com/{{owner}}/{{repo}}/stargazers)
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](https://opensource.org/licenses/{{license}})

**{{tagline}}**

[Plugins](#-plugins) • [Installation](#-installation) • [Usage](#-usage) • [Documentation](#-table-of-contents)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

{{features_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🧩 Plugins](#-plugins)
- [📦 Installation](#-installation)
- [🚀 Usage](#-usage)
- [📁 Repository Structure](#-repository-structure)
- [🛠️ Conventions](#-conventions)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📧 Contact & Support](#-contact--support)

---

## 🧩 Plugins

{{plugins_table}}

---

## 📦 Installation

Add this marketplace to your Claude Code:

```bash
claude plugin marketplace add {{owner}}/{{repo}}
```

Then install individual plugins:

```bash
claude plugin install <plugin-name>@{{marketplace_name}}
```

---

## 🚀 Usage

Once installed, plugin skills are auto-invoked by Claude Code based on
context, or you can trigger them explicitly with `/<skill-name>`. Agents
become available via the `Agent` tool.

{{usage_examples}}

---

## 📁 Repository Structure

```
{{project_tree}}
```

### Key Directories

- **`.claude-plugin/`** — Marketplace manifest (`marketplace.json`) listing all plugins
- **`plugins/<plugin-name>/`** — One directory per plugin
  - `plugin.json` — Plugin metadata
  - `agents/` — Agent definitions (`.md` with YAML frontmatter)
  - `skills/<skill-name>/SKILL.md` — Skill definitions + supporting docs

---

## 🛠️ Conventions

- Plugin names use **kebab-case**
- Agent files are Markdown with YAML frontmatter (`name`, `version`, `model`, `tools`, `skills`)
- Skill directories contain `SKILL.md` as the entry plus optional `references/`, `templates/`, `examples.md`
- Each `plugin.json` lists its agents and skills with paths relative to the plugin directory
- All paths in manifests are relative to the plugin directory

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-skill`)
3. Add your skill/agent following the conventions above
4. Update `plugin.json` and the README plugin table
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

[⬆ Back to Top](#-{{title_slug}})

</div>
````

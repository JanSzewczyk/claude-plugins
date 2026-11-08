# Template: python-service

Contents: required metadata · where the sections come from · audience markers · tests that read the README · ask the user · template · filling the lists.

For: a Python web service or API — FastAPI, Litestar, Django, Flask, Starlette — managed with
`pyproject.toml` and a lockfile (`uv.lock`, `poetry.lock`, `pdm.lock`), usually with a `Makefile`,
a `Dockerfile` and a generated OpenAPI document. Covers a GitHub template repository of such a
service too (`gh repo view --json isTemplate` is `true`).

A Python library or CLI with no web framework is not this type: use `generic`.

## Required metadata

- `{{title}}`, `{{tagline}}`, `{{owner}}`, `{{repo}}`, `{{license}}`, `{{author}}` — as in every template
- `{{name}}` — `[project].name` (the distribution, e.g. `fastapi-szumplate`)
- `{{package}}` — the import package, from `src/<package>/` or `[tool.hatch.build.targets.wheel].packages` (e.g. `fastapi_szumplate`)
- `{{default_branch}}` — `gh repo view --json defaultBranchRef`; needed by the badge URLs
- `{{python_version}}` — `.python-version`, else `[project].requires-python`
- `{{package_manager}}` — from the lockfile: `uv.lock` → uv, `poetry.lock` → Poetry, `pdm.lock` → PDM
- `{{lockfile}}` — that lockfile's name
- `{{install_cmd}}` — `make install` if the Makefile has it, else `uv sync --locked` / `poetry install --sync` / `pdm sync`
- `{{run_cmd}}` — `make run` if present, else the entry point (`uv run python -m {{package}}`, `uv run fastapi dev`, `uv run manage.py runserver`)
- `{{check_cmd}}` — the one target CI runs (`make check`); see Commands below
- `{{base_url}}` — host and port from `.env.example` / settings defaults (e.g. `http://127.0.0.1:8000`)
- `{{framework}}` — FastAPI / Litestar / Django / Flask, from `[project].dependencies`;
  `{{framework_badge_url}}` is its lockfile version badge, `{{framework_url}}` its docs
- `{{ci_workflow_file}}` — the workflow that runs `{{check_cmd}}` (e.g. `ci.yml`)
- `{{package_manager_url}}` — `https://docs.astral.sh/uv/`, `https://python-poetry.org/`, `https://pdm-project.org/`
- `{{optional_prerequisites}}` — tools only some commands need, each with that command: Docker
  (`make docker-build`, oasdiff), Node.js (`npx` for Spectral); omit when there are none
- `{{docs_exposure_sentence}}` — where the interactive docs live and whether they are on by default

## Where the sections come from

Read these before writing; never invent a command, a variable or an endpoint.

- **Commands** — every target in the `Makefile`'s `.PHONY` lines, written as `make <target>` in the
  table (a repo test may check that every target appears). No Makefile: `[tool.poe.tasks]`,
  `justfile`, `noxfile.py` sessions, or the `uv run …` commands CI calls.
- **Configuration** — every key of `.env.example`, with its default and meaning from the comment
  above it or from the settings class (`pydantic-settings` `BaseSettings`, `config.py`).
- **API** — docs endpoints and whether they are on by default (look for `docs_url`, `openapi_url`
  or a `DOCS_ENABLED`-style setting), a committed `openapi.json` and the script that generates it,
  the error format (`application/problem+json` handlers mean RFC 9457 Problem Details), health
  endpoints from the routers.
- **Testing** — `[tool.pytest.ini_options]` (markers, timeout), `[tool.coverage.report].fail_under`,
  test-only dependency groups (Hypothesis, factory-boy, Schemathesis, testcontainers).
- **Quality** — `[tool.ruff]`, `[tool.mypy]` (`strict = true`), `[tool.importlinter]` contracts.
- **Docker** — `Dockerfile` (multi-stage, non-root user, `HEALTHCHECK`), `compose.yaml`.
- **CI** — every job in `.github/workflows/*.yml` and what it runs; `.github/dependabot.yml`.
- **Documentation** — `docs/` grouped by kind (tutorials, how-to, reference, explanation) when it
  is laid out that way.
- **Use this template** — only when the repo is a GitHub template; a setup script such as
  `scripts/init_project.py` and its flags go here.

Drop a section whose source does not exist (no `Dockerfile` → no Docker section, no generated spec
→ no OpenAPI paragraph), and drop its Table of Contents line with it.

## Audience markers — keep them

A template repository may mark lines for a setup script that strips them in each copy, for example
`<!-- begin:template -->` … `<!-- end:template -->` around a block, `<!-- only:example -->` at the
end of a line, or `begin:bare` blocks that appear only after the example is removed. Before
regenerating a section, find every such comment in the old README and carry it into the new one
around the same content: a block marker around the same block, a line marker at the end of the
line that names the same thing (a table row, a sentence). Never drop, merge or rename a marker,
and keep `begin`/`end` pairs balanced. When unsure what a marker covers, read the script's
docstring (e.g. `scripts/init_project.py`).

## Tests that read the README

A Python service may test its own README: that every `make` target appears, or that a heading
such as `## Run it` survives the setup script while `## Use it` does not. Before writing, run
`grep -rn "README" tests/ scripts/` and treat every string a test asserts as fixed text: keep it
verbatim, even where that means a heading without the standard emoji, and say in the report which
headings were kept for that reason so the user can change test and heading together. Run those
tests on the new README when the environment allows (`uv run pytest <those test files>`).

## Ask the user if missing

- Deployment target, if nothing in the repo says where the service runs
- Whether the service is public, if docs exposure depends on it and the settings do not say

## Template

````markdown
<div align="center">

# 🐍 {{title}}

[![CI](https://img.shields.io/github/actions/workflow/status/{{owner}}/{{repo}}/{{ci_workflow_file}}?branch={{default_branch}}&logo=githubactions&logoColor=white&label=CI)](https://github.com/{{owner}}/{{repo}}/actions/workflows/{{ci_workflow_file}})
[![Python](https://img.shields.io/badge/dynamic/regex?url=https://raw.githubusercontent.com/{{owner}}/{{repo}}/{{default_branch}}/.python-version&search=(%5Cd%2B%5C.%5Cd%2B)&replace=%241&label=Python&logo=python&logoColor=white)](https://www.python.org/)
[![{{framework}}]({{framework_badge_url}})]({{framework_url}})
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](LICENSE)

**{{tagline}}**

[Features](#-features) • [Getting Started](#-getting-started) • [Commands](#-commands) • [API](#-api) • [Configuration](#-configuration)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

## ✨ Features

### 🏗️ Core Technologies

{{core_tech_list}}

### 📡 API Contract

{{api_contract_list}}

### 🧪 Testing & Quality

{{testing_quality_list}}

### 🤖 Automation & DevOps

{{devops_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🎯 Getting Started](#-getting-started)
- [🧩 Use This Template](#-use-this-template)
- [📃 Commands](#-commands)
- [🧪 Testing](#-testing)
- [📡 API](#-api)
- [🔧 Configuration](#-configuration)
- [🐳 Docker](#-docker)
- [🤖 CI](#-ci)
- [📁 Project Structure](#-project-structure)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [📧 Contact & Support](#-contact--support)

---

## 🎯 Getting Started

### 📋 Prerequisites

- **[Python](https://www.python.org/downloads/)** {{python_version}} — `{{package_manager}}` installs it for you when it is missing
- **[{{package_manager}}]({{package_manager_url}})** for dependencies and virtual environments
- **GNU Make** to run the commands below
- **Git** for version control
{{optional_prerequisites}}

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

This creates `.venv/` and installs the exact versions from `{{lockfile}}`.

#### 3. Configure the Environment

```bash
cp .env.example .env
```

#### 4. Start the Service

```bash
{{run_cmd}}
```

The API listens on {{base_url}}. {{docs_exposure_sentence}}

---

## 🧩 Use This Template

{{use_this_template_section}}

---

## 📃 Commands

| Command | Purpose |
| --- | --- |
{{commands_table_rows}}

`{{check_cmd}}` is what CI runs; run it before you push.

---

## 🧪 Testing

{{testing_section}}

---

## 📡 API

{{api_section}}

### 🚨 Errors

{{errors_section}}

---

## 🔧 Configuration

All settings come from the environment or `.env` (see `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
{{config_table_rows}}

---

## 🐳 Docker

```bash
{{docker_commands}}
```

{{docker_section}}

---

## 🤖 CI

{{ci_section}}

---

## 📁 Project Structure

```text
{{project_tree}}
```

### Key Directories

{{key_directories}}

### Important Configuration Files

{{key_config_files}}

---

## 📚 Documentation

{{documentation_section}}

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run `{{check_cmd}}` until it passes
4. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **{{license}} License**. See the [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- 🐛 [Open an issue](https://github.com/{{owner}}/{{repo}}/issues)
- ⭐ [Star this repository](https://github.com/{{owner}}/{{repo}})
- 👨‍💻 Check out the maintainer's [GitHub profile](https://github.com/{{owner}})

---

<div align="center">

**Made with ❤️ by [{{author}}](https://github.com/{{owner}})**

If this service helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{{title_slug}})

</div>
````

## Filling the lists

- `{{core_tech_list}}`, `{{api_contract_list}}`, `{{testing_quality_list}}` — one line per tool,
  each led by a lockfile version badge (`badges-registry.md` → *Python dependency version badges*):
  the framework, Pydantic, the settings library, the logger, the ASGI server; then Ruff, mypy,
  pytest, Hypothesis, import-linter, Schemathesis — only those in the lockfile.
- `{{devops_list}}` — Docker, GitHub Actions, Dependabot, pip-audit: static chips or plain links,
  since they are not locked packages.
- `{{use_this_template_section}}` — the **Use this template** button, the setup script with each
  flag, and the follow-up check (`uv sync && make openapi && make check`). Wrap the whole section
  in the repo's template-only marker when it has one, and drop it (with its ToC line) when the repo
  is not a template.
- `{{errors_section}}` — the media type, the fields every error carries and where the problem
  types are listed; drop the H3 when the service has no common error format.
- `{{project_tree}}` — the `src/<package>/` layout with one comment per module or package, then
  `tests/`, `scripts/`, `docs/`; verify every entry with `Glob`.

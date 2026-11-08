# Template: python-service

Contents: required metadata · where the sections come from · keep every fact · audience markers · tests that read the README · ask the user · template · writing the features · filling the other slots.

For: a Python web service or API — FastAPI, Litestar, Django, Flask, Starlette — managed with
`pyproject.toml` and a lockfile (`uv.lock`, `poetry.lock`, `pdm.lock`), usually with a `Makefile`,
a `Dockerfile` and a generated OpenAPI document. Covers a GitHub template repository of such a
service too (`gh repo view --json isTemplate` is `true`).

A Python library or CLI with no web framework is not this type: use `generic`.

The shape follows what the best-known service READMEs do — a capability-first feature list
(full-stack-fastapi-template, cookiecutter-django), a copy-paste quick start near the top
(litestar-fullstack), explicit scope and constraints (cookiecutter-django), a real request and
response, and the Install → Usage → Contributing → License spine of standard-readme.

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

Read these before writing; never invent a command, a variable, an endpoint or a response.

- **Features** — the code, not the dependency list: what `main.py` wires up (middleware, error
  handlers, routers), the modules under `src/<package>/`, the settings, the Dockerfile and CI. Every
  capability bullet must point at a file that implements it.
- **Commands** — every target in the `Makefile`'s `.PHONY` lines, written as `make <target>` in the
  table (a repo test may check that every target appears). No Makefile: `[tool.poe.tasks]`,
  `justfile`, `noxfile.py` sessions, or the `uv run …` commands CI calls.
- **Configuration** — every key of `.env.example`, with its default and meaning from the comment
  above it or from the settings class (`pydantic-settings` `BaseSettings`, `config.py`).
- **API** — the endpoints from the routers (method, path, `operation_id`, status codes), docs
  endpoints and whether they are on by default (look for `docs_url`, `openapi_url` or a
  `DOCS_ENABLED`-style setting), a committed `openapi.json` and the script that generates it, the
  error format (`application/problem+json` handlers mean RFC 9457 Problem Details).
- **Example request and response** — from the tests: the body a test asserts
  (`assert response.json() == {...}`) is the response you show, and the problem JSON shape comes
  from the error model (`problems.py`). Never write a response no test or schema backs.
- **Architecture** — `docs/explanation/`, `[tool.importlinter]` contracts (they name the layers and
  what may import what), the module shapes in `src/<package>/`.
- **Testing** — `[tool.pytest.ini_options]` (markers, timeout), `[tool.coverage.report].fail_under`,
  test-only dependency groups (Hypothesis, factory-boy, Schemathesis, testcontainers).
- **Quality** — `[tool.ruff]`, `[tool.mypy]` (`strict = true`), `[tool.importlinter]` contracts.
- **Security** — defaults in the settings (docs off, CORS off), log redaction, the Dockerfile's user
  and filesystem, `pip-audit` in CI, `SECURITY.md` if present.
- **Deployment** — `Dockerfile` (multi-stage, non-root user, `HEALTHCHECK`), `compose.yaml`, and
  every operational constraint the old README or the docs state (workers, replicas, forced env vars,
  minimum tool versions).
- **CI** — every job in `.github/workflows/*.yml` and what it runs; `.github/dependabot.yml`.
- **Documentation** — `docs/` grouped by kind (tutorials, how-to, reference, explanation) when it
  is laid out that way.
- **Changelog** — `CHANGELOG.md` or GitHub Releases.
- **Use this template** — only when the repo is a GitHub template; a setup script such as
  `scripts/init_project.py` and its flags go here.

Drop a section whose source does not exist (no `Dockerfile` → no Deployment section, no generated
spec → no OpenAPI paragraph), and drop its Table of Contents line with it.

## Keep every fact

"Regenerate fresh" means rewrite in the standard shape, not rewrite from scratch. Before writing,
list every fact the old README states — how to start the service and how not to, minimum tool
versions, workers and replicas, what is out of scope, error behaviour at the edges, which settings
are forced in Docker — and place each one in the new README (usually in Deployment, Scope or
Troubleshooting). A fact may move or be reworded; it may not disappear. Check the list off before
the quality bar.

## Audience markers — keep them

A template repository may mark lines for a setup script that strips them in each copy, for example
`<!-- begin:template -->` … `<!-- end:template -->` around a block, `<!-- only:example -->` at the
end of a line, or `begin:bare` blocks that appear only after the example is removed. Before
regenerating a section, find every such comment in the old README and carry it into the new one
around the same content: a block marker around the same block, a line marker at the end of the
line that names the same thing (a table row, a sentence). Never drop, merge or rename a marker,
and keep `begin`/`end` pairs balanced. When unsure what a marker covers, read the script's
docstring (e.g. `scripts/init_project.py`).

No marker count may drop. `begin`/`end` counts match the old README exactly; an `only:` count may
grow only by new lines that belong to that audience. Compare them before writing:

```bash
diff <(git show HEAD:README.md | grep -o '<!-- [a-z]*:[a-z]* -->' | sort | uniq -c) \
     <(grep -o '<!-- [a-z]*:[a-z]* -->' README.md | sort | uniq -c)
```

New content that belongs to one audience gets that audience's marker too: the *Use this template*
badge, ToC line and section are `template`; the example domain's endpoint rows and feature bullet
are `example`.

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

Every H2 below uses a single-code-point emoji, so its anchor is `#-<slug>`. Emoji with a variation
selector (⚙️, 🏛️, 🛠️) put an invisible character into the anchor and break the links.

````markdown
<div align="center">

# 🐍 {{title}}

[![CI](https://img.shields.io/github/actions/workflow/status/{{owner}}/{{repo}}/{{ci_workflow_file}}?branch={{default_branch}}&logo=githubactions&logoColor=white&label=CI)](https://github.com/{{owner}}/{{repo}}/actions/workflows/{{ci_workflow_file}})
[![Python](https://img.shields.io/badge/dynamic/regex?url=https://raw.githubusercontent.com/{{owner}}/{{repo}}/{{default_branch}}/.python-version&search=(%5Cd%2B%5C.%5Cd%2B)&replace=%241&label=Python&logo=python&logoColor=white)](https://www.python.org/)
[![{{framework}}]({{framework_badge_url}})]({{framework_url}})
[![License: {{license}}](https://img.shields.io/badge/License-{{license}}-yellow.svg)](LICENSE)
[![Use this template](https://img.shields.io/badge/Use%20this%20template-2ea44f?logo=github&logoColor=white)](https://github.com/{{owner}}/{{repo}}/generate)

**{{tagline}}**

[Features](#-features) • [Quick Start](#-quick-start) • [API](#-api) • [Configuration](#-configuration) • [Deployment](#-deployment)

</div>

---

## 👋 Hello there!

{{intro_paragraph}}

### ⚡ Quick Start

```bash
{{quick_start_commands}}
```

{{quick_start_result}}

## ✨ Features

### 🚀 What You Get

{{capabilities_list}}

### 🧱 Tech Stack

{{tech_stack_list}}

### 🧪 Quality Gates

{{quality_gates_list}}

### 🤖 Automation & DevOps

{{devops_list}}

### 🧭 Scope & Design Decisions

{{scope_list}}

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🎯 Getting Started](#-getting-started)
- [🧩 Use This Template](#-use-this-template)
- [📃 Commands](#-commands)
- [📡 API](#-api)
- [🧱 Architecture](#-architecture)
- [🧪 Testing](#-testing)
- [🔧 Configuration](#-configuration)
- [🔒 Security](#-security)
- [🚀 Deployment](#-deployment)
- [🤖 CI](#-ci)
- [📁 Project Structure](#-project-structure)
- [📚 Documentation](#-documentation)
- [🩺 Troubleshooting](#-troubleshooting)
- [📝 Changelog](#-changelog)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
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

#### 5. Check It Works

```bash
curl {{base_url}}{{health_path}}
```

```json
{{health_response}}
```

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

## 📡 API

### 🔌 Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
{{endpoints_table_rows}}

{{openapi_paragraph}}

### 🔎 Example

```bash
{{example_request}}
```

```json
{{example_response}}
```

### 🚨 Errors

{{errors_section}}

```json
{{problem_example}}
```

---

## 🧱 Architecture

{{architecture_paragraph}}

```mermaid
{{architecture_diagram}}
```

{{example_domain_section}}

---

## 🧪 Testing

{{testing_section}}

---

## 🔧 Configuration

All settings come from the environment or `.env` (see `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
{{config_table_rows}}

---

## 🔒 Security

{{security_list}}

---

## 🚀 Deployment

```bash
{{docker_commands}}
```

{{deployment_section}}

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

## 🩺 Troubleshooting

{{troubleshooting_list}}

---

## 📝 Changelog

{{changelog_sentence}}

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

If this service helped you, please consider giving it a ⭐ on GitHub!

[⬆ Back to Top](#-{{title_slug}})

</div>
````

## Writing the features

The feature section is what a visitor reads to decide whether the project is for them, so it
leads with outcomes and backs each one with evidence.

- **`{{capabilities_list}}` — what the service does out of the box.** 5–10 bullets in the house
  format `- **{emoji} {Capability}** — {benefit}`. Name the outcome, not the library: "Request id on
  every log line and response", not "structlog". Use the concrete number where the repo has one
  (95% branch coverage, 409 with its own problem type per rule). Each bullet maps to a file you
  read; drop any you cannot point at. Typical candidates for a service template: health and
  readiness endpoints, typed settings that fail fast, structured logs with redaction, one error
  format, pagination, a generated and checked OpenAPI contract, secure defaults, a removable example
  domain, a setup script.
- **`{{tech_stack_list}}` — one line per locked package**, led by its lockfile version badge
  (`badges-registry.md` → *Python dependency version badges*), then what it does here: the framework,
  Pydantic, the settings library, the logger, the ASGI server. A package from the lockfile as a plain
  link fails the quality bar.
- **`{{quality_gates_list}}` — what `{{check_cmd}}` enforces**, each tool with its badge and its
  threshold: Ruff (format and lint), mypy strict, import-linter contracts, pytest with the coverage
  floor, Hypothesis, Schemathesis.
- **`{{devops_list}}`** — Docker, GitHub Actions, Dependabot, pip-audit: static chips or bold names,
  since they are not locked packages.
- **`{{scope_list}}` — the opinions and the boundaries**, the way cookiecutter-django lists its
  constraints: what the project deliberately does (one error format, docs off by default, one
  worker) and what it leaves out (authentication, a database), each with where to start when you
  need it. Take only what the README, docs or code say.

## Filling the other slots

- `{{intro_paragraph}}` — 2–4 sentences: what it is, who it is for, the problem it removes, the
  stack in one clause. No "This project is…".
- `{{quick_start_commands}}` — the shortest path from clone to a running service, 3–5 lines
  (`git clone`, `cd`, `cp .env.example .env`, `{{install_cmd}}`, `{{run_cmd}}`);
  `{{quick_start_result}}` says where it listens. Getting Started repeats it step by step.
- `{{health_path}}`, `{{health_response}}` — the liveness route and the body its test asserts. Drop
  step 5 when the service has no health route.
- `{{use_this_template_section}}` — the setup script with each flag and the follow-up check
  (`uv sync && make openapi && make check`). Wrap the whole section, its ToC line and the header
  badge in the repo's template-only marker when it has one, and drop all three when the repo is not
  a template.
- `{{endpoints_table_rows}}` — every route, `operation_id` in the Purpose column when it reads
  well; an example domain's routes carry its marker. `{{openapi_paragraph}}` — where the spec lives,
  how it is regenerated, and the interactive docs. Add a screenshot only if the repo already holds
  one; never a placeholder.
- `{{example_request}}` / `{{example_response}}` — one representative call from the API tests,
  usually a create or a list; drop the H3 if no test asserts a body.
- `{{errors_section}}` / `{{problem_example}}` — the media type, the fields every error carries,
  what clients branch on and where the problem types are listed; the example uses the error
  model's fields and a real problem type, with `"..."` only for values made at runtime (`detail`,
  `request_id`). Drop the H3 when the service has no common error format.
- `{{architecture_paragraph}}`, `{{architecture_diagram}}` — the layers or module shapes and the
  rule between them, with a link to the explanation doc. The Mermaid `flowchart` draws only what
  the import contracts or docs state (GitHub renders it); drop the diagram when there is nothing to
  draw. `{{example_domain_section}}` — what the example shows, how to remove it (link the how-to),
  wrapped in the repo's example marker.
- `{{security_list}}` — the secure defaults and how to change each, plus how to report a
  vulnerability (`SECURITY.md`, else issues).
- `{{deployment_section}}` — the image's properties, Compose, and every operational constraint from
  *Keep every fact* (how to start it, workers and replicas, forced variables, tool minimums).
- `{{troubleshooting_list}}` — `**Symptom** — cause and fix`, only for pitfalls the repo already
  documents; drop the section when there are none.
- `{{acknowledgments}}` — preserved from the old README; drop the section when there is none.
- `{{changelog_sentence}}` — a link to `CHANGELOG.md` or to the GitHub Releases page, saying what
  it records; drop the section when there is neither.
- `{{project_tree}}` — the `src/<package>/` layout with one comment per module or package, then
  `tests/`, `scripts/`, `docs/`; verify every entry with `Glob`.

# Changelog

All notable changes to the plugins in this marketplace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and each plugin adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Headings are `## [<version> <plugin>] — <date>`.

Entries before 4.3.0 of `plugin-dev` were reconstructed from commit subjects and cover only the
newest three versions of each plugin.

## [1.6.0 typescript] — 2026-11-23

### Changed

- `builder-factory`, `builder-rules-ts` and `unit-testing`: a builder with traits types its fields as `FieldsConfiguration<T>` and calls `build({ fields, traits })` without `<T>`, so a misspelled trait name fails to compile. `build<T>()` stays for builders without traits.

## [1.7.0 skill-dev] — 2026-11-17

### Added

- `skill-audit` hands its 🔴 and 🟡 findings to `ReportFindings` when the session has the tool, so the desktop app shows them as cards. The reply keeps the verdict, scorecard, 🔵 rows, `Not checked` and `Next`. Without the tool the report is unchanged.

## [4.4.0 plugin-dev] — 2026-11-17

### Added

- `marketplace-creator` (audit mode), `plugin-creator` (Audit mode) and `mod-creator` hand their 🔴 and 🟡 findings to `ReportFindings` when the session has the tool, so the desktop app shows them as cards. Without the tool the reports are unchanged.

## [1.6.0 react] — 2026-11-17

### Added

- `accessibility-audit` hands its 🔴 and 🟡 findings to `ReportFindings` when the session has the tool, so the desktop app shows them as cards. Without the tool the report is unchanged.

### Changed

- The `accessibility-audit` references have contents lists, and `SKILL.md` no longer indexes `audit-guide.md` and `examples.md` twice.

## [1.5.0 typescript] — 2026-11-17

### Added

- `dead-code` and `coverage-gaps` hand their 🔴 and 🟡 findings to `ReportFindings` when the session has the tool, so the desktop app shows them as cards. Without the tool the reports are unchanged.

## [2.0.1 nextjs] — 2026-11-17

### Changed

- `lighthouse-audit` receives the new reporting rule and states that it does not use `ReportFindings` cards, because its findings are measurements per URL and not defects in files.

## [2.0.0 nextjs] — 2026-11-16

### Added

- `run-nextjs-task` skill: runs one planned task (an SDD `/sdd:implement` brief or a task id) through `nextjs-developer`, `nextjs-tester` and `code-reviewer`, with no questions and one fix round. Set `skill:nextjs:run-nextjs-task` in `specs/capabilities.yml`.
- `nextjs-developer` and `nextjs-tester` agents.
- `nextjs-rules` knowledge skill (generated from `knowledge/`): Server Components and the client boundary, page and layout data loading, feature folders and layer order, server actions, error tuples and ServiceError codes, LogLayer logging, T3 Env.
- `setup-app-infrastructure` skill: adds T3 Env validation, LogLayer logging, ServiceError and retry helper, server action result types and cookie toasts.

### Changed

- `code-reviewer` is rewritten: it returns a verdict, a scorecard, a findings table and an `SDD: PASS|FAIL|SKIPPED` line, works without a hand-off and is read-only.
- `devlogs` checks logs against the logging rules in `nextjs-rules`.
- Requires `react` ^1.5.0 and `typescript` ^1.4.0.

### Removed

- Skills `server-actions`, `error-handling`, `structured-logging`, `t3-env-validation` and `toast-notifications`. Their rules are in `nextjs-rules`, their setup steps and templates in `setup-app-infrastructure`.
- Agent `nextjs-backend-engineer`: use `nextjs-developer`. Agent `testing-strategist`: use `nextjs-tester`.

## [1.5.0 react] — 2026-11-16

### Added

- `react-rules` knowledge skill (generated): React component and hook rules, including no manual memoization under the React Compiler.

### Changed

- `react-19-compiler` is now a short procedure to enable, verify and migrate to the React Compiler; its rules moved to `react-rules`, and its `hooks.md` and `server-components.md` references are gone.
- `frontend-expert` preloads `react-rules` instead of `react-19-compiler`.

## [1.4.0 typescript] — 2026-11-16

### Added

- `typescript-rules` knowledge skill (generated): `function` declarations, `Array<T>`, const objects instead of enums, `unknown` instead of `any`, the `~/` alias, JSDoc comments.

## [1.2.0 shared-rules] — 2026-11-16

### Added

- Generated rules files for `sync-rules`: `nextjs-server-actions.md`, `nextjs-error-handling.md`, `nextjs-logging.md` and `nextjs-env.md`.

### Changed

- `typescript.md`, `react.md`, `nextjs-page-layout-patterns.md` and `feature-architecture.md` are generated from `knowledge/` and carry its rules; their `paths` now match monorepos (`**/app/**`, `**/features/**`). Projects that synced them will see `update`.

## [1.5.0 knowledge-dev] — 2026-11-16

### Added

- `rules-file` target: renders notes into one self-contained `.claude/rules` file with `paths:` frontmatter for `sync-rules` (D28).

## [1.1.0 firebase] — 2026-11-16

### Changed

- `database-architect` preloads `typescript-rules` and `nextjs-rules`; the ServiceError contract it implements is now defined in `nextjs-rules`.
- Requires `nextjs` ^2.0.0 and `typescript` ^1.4.0.

## [1.0.8 product-management] — 2026-11-16

### Changed

- Agent routing tables name `nextjs-developer` and `nextjs-tester` instead of `nextjs-backend-engineer` and `testing-strategist`.

## [3.1.1 testing] — 2026-11-16

### Changed

- README names the `nextjs` agents that replace `testing-strategist`.

## [3.1.0 testing] — 2026-11-16

### Added

- `qa-engineer` agent: black-box QA of any app (web, HTTP API, CLI, library). Runs a given list of flows and checks, or builds the most important ones from the spec, README or the app itself; drives the browser with `playwright-cli`; returns `Result: PASS | FAIL | SKIPPED` and a per-flow table with what to fix. Artifacts stay outside the repository.
- README section on using it as an SDD `review.checks` entry.

## [4.3.0 plugin-dev] — 2026-11-16

### Added

- `plugin-release` writes a `CHANGELOG.md` section for every bumped plugin, drafted from git history, and offers to create and backfill the file when there is none (`scripts/changelog.mjs`).
- `plugin-setup` offers the same, records a main plugin in the `CLAUDE.md` block and enables the CI check.
- `version-bump-check` action: `changelog` input fails a bump without its section.

## [4.2.1 plugin-dev] — 2026-11-13

### Added

- Make every CI check its own action and style the workflows with icons
- Write the version bump gate as its own job in the plugin-setup workflow
- Share skill-audit and plugin-evals as actions and let plugin-setup pick the CI jobs

### Changed

- Use another out-of-contract key in the conventions fixture

### Fixed

- Allow disable-model-invocation in the skill frontmatter contract

## [1.6.2 skill-dev] — 2026-11-13

### Fixed

- Allow disable-model-invocation in the skill frontmatter contract

## [3.3.0 python] — 2026-11-11

### Added

- Add a lean variant and time budgets to python-api-team

## [4.2.0 plugin-dev] — 2026-11-11

### Added

- Make version bumps manual and gate them in CI

## [1.4.2 knowledge-dev] — 2026-11-11

### Added

- Add writing plugin with the tight-writing skill

## [2.0.0 writing] — 2026-11-11

### Changed

- Rename human-writing skill to humanize
- Rename tight-writing skill to human-writing

## [1.0.0 writing] — 2026-11-11

### Added

- Add writing plugin with the tight-writing skill

## [3.5.0 code-quality] — 2026-11-08

### Added

- Add a Python service template to repository-documentation

## [3.2.0 python] — 2026-11-08

### Added

- Add rules on test design, test doubles and suite layout

## [1.4.0 react] — 2026-11-08

### Added

- Add rules on test design, test doubles and suite layout

## [1.3.0 typescript] — 2026-11-08

### Added

- Add rules on test design, test doubles and suite layout

## [1.0.1 github] — 2026-11-08

### Added

- Add github-repo-audit for existing repositories

### Fixed

- Stop github-repo-audit reading unreadable settings as off
- Restore github-repo-init files moved by mistake
- Treat a plugin added since the baseline as a first release

## [1.0.0 github] — 2026-11-08

### Added

- Add github plugin with the github-repo-init skill

## [3.1.2 python] — 2026-11-07

### Changed

- Run Ruff from the check target instead of pre-commit hooks

## [1.4.1 knowledge-dev] — 2026-11-07

### Changed

- Rename builder-rules-py and api-architecture to *-rules and ask open decisions first

## [1.4.0 knowledge-dev] — 2026-11-06

### Added

- Add API architecture guide, skill and two agents
- Make documentation and logging rules language-neutral and add Vue story note

## [3.4.4 code-quality] — 2026-11-05

### Added

- Add plugin-dev-setup, authoring rules and a bump check

### Fixed

- Cut three skill descriptions under the 1,024-character limit

## [1.5.1 nextjs] — 2026-11-05

### Fixed

- Cut three skill descriptions under the 1,024-character limit

## [1.6.1 skill-dev] — 2026-11-05

### Added

- Add plugin-creator and marketplace-creator with audit modes
- Share one report format across the audit skills

### Fixed

- Stop counting any bulleted intro as a table of contents

## [1.0.8 design] — 2026-11-05

### Added

- Add plugin-dev-setup, authoring rules and a bump check

### Fixed

- Cut three skill descriptions under the 1,024-character limit

## [1.5.0 nextjs] — 2026-11-04

### Added

- Share one report format across the audit skills

## [1.3.0 react] — 2026-11-04

### Added

- Share one report format across the audit skills

### Changed

- Rebuild component-test-rules after the source link fix

## [1.6.0 skill-dev] — 2026-11-04

### Added

- Give the skill-audit report a scannable format
- Add plugin-dev-setup, authoring rules and a bump check

## [1.2.0 typescript] — 2026-11-04

### Added

- Share one report format across the audit skills

## [3.4.3 code-quality] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [3.0.2 testing] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [3.0.1 testing] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

### Changed

- Move builder-factory out of the testing core

## [1.4.0 nextjs] — 2026-11-03

### Added

- Add component testing rules to the knowledge base
- Add plugin-dev-setup, authoring rules and a bump check

## [1.2.0 react] — 2026-11-03

### Added

- Add component testing rules to the knowledge base
- Add plugin-dev-setup, authoring rules and a bump check

## [1.0.8 firebase] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.6.2 git-workflow] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.0.7 design] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.0.7 firebase] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

### Changed

- Move builder-factory out of the testing core

## [1.0.7 product-management] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.6.1 git-workflow] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

## [1.0.6 design] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

## [1.0.6 product-management] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

## [1.1.3 shared-rules] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.0.6 ai-tools] — 2026-11-03

### Changed

- Move plugin manifests into .claude-plugin/

## [1.1.2 shared-rules] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

## [1.1.0 typescript] — 2026-11-03

### Added

- Add component testing rules to the knowledge base
- Add plugin-dev-setup, authoring rules and a bump check

## [1.0.5 ai-tools] — 2026-11-03

### Added

- Check and add $schema in plugin manifests

## [1.6.0 git-workflow] — 2026-11-02

### Added

- Add ship-task skill and hand update-deps flow to it

## [3.0.0 testing] — 2026-10-27

### Changed

- Reorganize plugins by technology
- Keep only mocking recipes in create-stories mocking.md

## [1.0.6 firebase] — 2026-10-27

### Changed

- Reorganize plugins by technology

## [1.0.5 product-management] — 2026-10-27

### Changed

- Reorganize plugins by technology

## [1.1.1 shared-rules] — 2026-10-13

### Added

- Add displayName and keywords to every plugin, with a doctor check for them

## [1.0.4 ai-tools] — 2026-10-13

### Added

- Add displayName and keywords to every plugin, with a doctor check for them

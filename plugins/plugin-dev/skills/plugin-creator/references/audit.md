# Audit a plugin: does it load, does it work, and is it ready to ship?

An audit reads an existing plugin and reports what is wrong with it, ranked, with a verdict. It
answers four questions in order: **does it load** (manifest, layout, paths), **does every
component do what it claims** (skills, agents, hooks, servers), **is what it can reach
justified** (commands, network, secrets), and **is it ready to release** (versions,
dependencies, evals, token cost). It changes nothing until the user asks.

## Contents

- [Own plugin or third-party](#own-plugin-or-third-party)
- [Steps](#steps)
- [Checklist P1–P9](#checklist-p1p9)
- [Severity and verdict](#severity-and-verdict)
- [Report format](#report-format)

## Own plugin or third-party

| | Own (the user wrote it or will maintain it) | Third-party (about to be installed) |
| --- | --- | --- |
| Runs `claude plugin validate --strict` | Yes | Yes |
| Runs `plugin details` | Yes | Yes, with `--plugin-dir`: loading for one session writes no settings, but hooks and monitors run, so only after P9 |
| Runs evals | Only if `evals/` exists, after asking (billed) | Never |
| Checklist | P1–P9 | P1, P9 first; P4 and P5 for what runs on the user's machine |
| After the report | Offers to fix; fixes follow the Extend steps | Never edits; ends with an install recommendation |

When it is unclear whose plugin it is, treat it as third-party: reading changes nothing, editing
would.

## Steps

1. **Inventory.** Read `.claude-plugin/plugin.json`, then list what is on disk: `skills/`,
   `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `bin/`, `settings.json`,
   `monitors/`, `output-styles/`, `themes/`, `workflows/`, `evals/`, `README.md`, any root
   `SKILL.md` or `CLAUDE.md`. Note `claude --version`. A `hooks.json` with `modules` is a mod:
   run mod-creator's audit for the module and keep this one for the rest.
2. **Validate.** `claude plugin validate <dir> --strict`. Record every error, warning and
   `Advice` line. A validation error is a finding in itself; keep going so the report is
   complete, not only the first failure. Inside a marketplace repo, also run the marketplace
   script and keep the issues for this plugin.
3. **Read the plugin** against the checklist below, component by component. Compare what each
   one does with what the plugin claims (README, `description`, the user's words).
4. **Measure and run.** `claude --plugin-dir <dir> plugin details <name>`: the inventory must match
   step 1, and the `Always-on` figure goes in the report. For an own plugin with `evals/`, ask,
   then `claude plugin eval <dir> --runs 1 --ablation none`, and record failing cases by name.
5. **Report** in the format below, then stop and wait.

## Checklist P1–P9

Each item names where the rule is explained; cite that section in the finding's fix. The
severity in brackets is the default unless the evidence says worse.

### P1. Manifest and layout — create.md → How to lay out the plugin directory, components.md → Component map

- `name` kebab-case, without `claude`, `anthropic` or `official`, and unchanged since the first
  release (🔴 when `validate` refuses it; a rename without `renames` is 🔴).
- Only `plugin.json` inside `.claude-plugin/`; components at the plugin root (🔴).
- Every manifest path starts with `./`, exists and stays inside the root (🔴).
- A "replaces" key (`commands`, `agents`, `outputStyles`, `workflows`, `experimental.themes`,
  `experimental.monitors`) lists every file that should load (🔴 for each file left out).
- `$schema`, `description`, `author`, `homepage`, `license`, `displayName`, `keywords` present
  (🟡; 🔵 for `displayName` and `keywords`).
- `README.md` at the root with what the plugin does and the install line `validate`'s `Advice`
  suggests, placeholder replaced (🟡).
- No `CLAUDE.md` at the plugin root (🟡: it is never loaded).

### P2. Skills and commands — components.md → How to add a skill

- New commands are skills under `skills/`; `commands/` only for migrated files (🔵).
- Every skill has a specific `description` that says when to use it (🟡; a missing one is 🔴).
- A root `SKILL.md` sets `name` (🟡: a marketplace install names it after its cache directory).
- `${CLAUDE_PLUGIN_ROOT}` in a skill body, not expected in the Bash environment (🔴 when a
  command depends on it).
- Deeper writing quality per skill: name `skill-audit` in `Next`; don't duplicate it here.

### P3. Agents — components.md → How to add a subagent

- Frontmatter uses only supported keys; `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`
  are ignored (🟡, 🔴 when the agent relies on one).
- Frontmatter parses: an agent named after its file with `Agent from <plugin> plugin` as
  description means it didn't (🔴).
- `skills:` preloads point at this plugin or a dependency it declares (🔴 when undeclared).

### P4. Hooks — components.md → How to add a hook

- Every `PreToolUse`/`PostToolUse` hook has a matcher narrowed to its tools (🟡).
- Bundled scripts are referenced as quoted `"${CLAUDE_PLUGIN_ROOT}/..."` or in exec form (🔴 for
  an unquoted path in shell form), exist, and are executable (🔴).
- Matchers on the plugin's own MCP tools use `mcp__plugin_<plugin>_<server>__<tool>` (🔴).
- `${user_config.*}` only in exec-form `args`; shell-form commands read `CLAUDE_PLUGIN_OPTION_<KEY>`
  (🔴).
- A rule the plugin promises always holds is a hook, not only skill text (🟡).
- A hooks file referenced from the manifest keeps the top-level `"hooks"` wrapper (🔴).

### P5. Servers and other components — components.md

- MCP: names and tool names as Claude Code shows them; servers needed on claude.ai or in Cowork
  are remote `https://` servers (🟡); a required MCPB `user_config` is documented (🟡).
- LSP: every entry valid (one bad entry skips the whole file and `validate` doesn't read
  `.lsp.json`, 🔴); the binary's install is documented (🟡); logs go to stderr (🔴).
- `bin/`: needed by the skills that call it; absent if the plugin must install on claude.ai or
  Cowork (🔴 then).
- `settings.json` sets only `agent` or `subagentStatusLine` (🟡: anything else is dropped).
- Monitors: `name`, `command`, `description`; no `${user_config.*}`; nothing that must run under
  `claude -p` (🟡).

### P6. Configuration and state — components.md → How to ask the user for configuration values, How to reference plugin paths

- Values the user supplies are `userConfig` options, not instructions to edit `settings.json`
  (🟡); tokens and passwords are `"sensitive": true` (🔴).
- `userConfig` `options` only when users are on v2.1.271 or later (🟡).
- State, caches and installed dependencies go in `${CLAUDE_PLUGIN_DATA}`, never in
  `${CLAUDE_PLUGIN_ROOT}` (🔴: lost on every update).

### P7. Dependencies — dependencies.md

- Every plugin whose skills, agents or tools this one calls is declared, with a tested range
  (🟡 for a bare name; 🔴 when undeclared).
- Ranges resolve: the dependency has `<name>--v<version>` tags in range, or the user is told the
  constraint is checked at load (🟡).
- No dependency cycle (🔴); a cross-marketplace dependency is allowlisted in the root
  marketplace or documented as a manual install (🔴).

### P8. Release readiness and cost — publish.md → How to prepare a release, measure.md

- One versioning policy: `version` bumped on each release, or omitted in a git-hosted
  marketplace (🟡); in a marketplace repo, the marketplace audit agrees on it.
- `evals/` exists with a routing case per skill and passes (🔵 when absent, 🔴 when a case
  fails).
- `Always-on` cost is reasonable for what the plugin does; above 2,000 tokens, name the largest
  contributors from `Per-component` (🔵, 🟡 above 2,000).
- Plugins installed from a local marketplace were tested before release (🔵 when nobody did).

### P9. Trust and scope — components.md, evals.md → security notes

Read this first for a third-party plugin.

- Everything that runs as the user is listed and justified by what the plugin claims: hook
  commands, monitor commands, MCP and LSP server commands, `bin/` executables, a `SessionStart`
  install step (🔴 for anything unexplained).
- Network destinations are fixed or user-configured; nothing reads secrets, env or files and
  sends them where they don't have to go (🔴).
- Monitors run outside the sandbox with full user permissions; their command is named in the
  report (🟡 when it reads beyond the project).
- `--plugin-url` and `archive` sources point only at hosts the user trusts (🟡).

## Severity and verdict

| Mark | Severity | Means | Examples |
| :-: | --- | --- | --- |
| 🔴 | **error** | It doesn't load, a component silently does nothing, or it reaches more than it should | Validation error; skills inside `.claude-plugin/`; unquoted hook path; unsensitive token; a failing eval case |
| 🟡 | **warning** | It loads but misleads users or misbehaves on some surface, version or update | Missing `description`; broad hook matcher; bare-name dependency; cost above 2,000 tokens |
| 🔵 | **note** | Works, but is harder to find, maintain or prove than it needs to be | No `displayName`; no evals; `commands/` for new work |
| 🟢 | nothing found | — | — |
| ⚪ | not checked | Needs a live session or a billed run that wasn't made | Hooks firing, MCP connecting, evals not run |

Verdict from the worst finding: 🔴 **not ready**, 🟡 **ready with warnings**, 🟢 **ready**;
🔵 notes alone still make it **ready**. For a third-party plugin, phrase it as the install
recommendation: **don't install**, **install after reading the warnings**, **safe to install**.

## Report format

Follow the reporting rules indexed at the end of SKILL.md. For a plugin audit that means:

```markdown
## 🧩 Plugin audit · `<plugin name>` (`<dir>`)

> 🔴 **Not ready** · 1 error · 2 warnings · 1 note
> Claude Code <version> · validate: passed with warnings · details: 4 skills, 1 agent, 1 hook · always-on ~620 tok · evals: not run

| Checklist | Status | Found |
| --- | :-: | --- |
| P1. Manifest and layout | 🟡 | 1 warning |
| P2. Skills and commands | 🟢 | — |
| P3. Agents | 🟢 | — |
| P4. Hooks | 🔴 | 1 error |
| P5. Servers and other components | ⚪ | none in this plugin |
| P6. Configuration and state | 🟢 | — |
| P7. Dependencies | 🟡 | 1 warning |
| P8. Release readiness and cost | 🔵 | 1 note |
| P9. Trust and scope | 🟢 | — |

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🔴 | `hooks/hooks.json:7` | `${CLAUDE_PLUGIN_ROOT}/scripts/fmt.sh` unquoted in a shell-form command | Quote it or use `args` (components.md → How to add a hook) |
| 2 | 🟡 | `.claude-plugin/plugin.json` | `dependencies: ["secrets-vault"]` has no range, and `review` calls its tools | `{ "name": "secrets-vault", "version": "~2.1.0" }` (dependencies.md) |

**What the plugin runs on your machine:** `scripts/fmt.sh` after every `Write`/`Edit`; no MCP servers, no monitors.

**Not checked:** the hook firing and evals need a live session or a billed run.

**Next:** say which numbers to fix, or `all`; then `/skill-audit` on each skill for writing quality.
```

For a third-party plugin, `Next` is the install recommendation, and no fix is offered.

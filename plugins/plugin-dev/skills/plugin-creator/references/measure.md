# Measure plugin cost and usage

Every session with a plugin enabled carries the names and descriptions of its skills, agents and commands in Claude's context, and those tokens count against the user's usage whether or not the plugin is used. This page covers how to see that figure for a plugin, how to lower it if you maintain the plugin, and where usage shows up so you can tell whether people still use it, from a single user's machine up to an organization-wide fleet. To measure how reliably a plugin changes Claude's behaviour rather than what it costs, see `evals.md`.

## Contents

- [How to see what a plugin costs](#how-to-see-what-a-plugin-costs)
- [How to lower the always-on figure](#how-to-lower-the-always-on-figure)
- [How to check whether a plugin is used](#how-to-check-whether-a-plugin-is-used)
- [How to measure across a fleet](#how-to-measure-across-a-fleet)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to see what a plugin costs

1. Make sure the plugin is loaded: installed, in a skills directory, or passed with `--plugin-dir` (or `--plugin-url`) in the same command.
2. In your shell (not at the Claude Code prompt), run:

   ```bash
   claude plugin details formatter
   # or, for a plugin you are developing:
   claude --plugin-dir ./formatter plugin details formatter
   ```

3. Read the three parts of the output:

   ```text
   Component inventory
     Skills (3)  format-all, format-code, lint-fix
     Agents (1)  style-reviewer
     Hooks (1)  PostToolUse  (harness-only — no model context cost)
     MCP servers (1)  formatter-tools  (tool schemas resolved at runtime; not counted)
     LSP servers (0)

   Projected token cost
     Always-on:   ~146 tok   added to every session

   Per-component (rounded)
     component       always-on  on-invoke
     format-code           ~40        ~30
     ...
   ```

   | Section | What it tells you |
   | :- | :- |
   | `Component inventory` | What Claude Code found. Commands are counted under `Skills`. Hooks and MCP servers get no estimate and no per-component row |
   | `Always-on` | Tokens the names and descriptions of skills, agents and commands add to every session with the plugin enabled. The number every user carries, and the one to reduce |
   | `Per-component (rounded)` | Each skill, agent or command split into its always-on share and its on-invoke cost (the body that loads only when it runs). Find the biggest always-on contributor here |

4. For MCP tools, which `details` does not count, run `/context` in a session with the plugin enabled and read the `MCP tools` category.

Token counts are estimates and may differ from actual usage.

## How to lower the always-on figure

The always-on figure counts each component's name plus its `description` and `when_to_use` frontmatter.

1. Use the `always-on` column to find the largest contributors.
2. Shorten those skill and agent descriptions.
3. If the plugin is large, split it so users install only the components they need.
4. Re-run `claude plugin details <name>` to confirm the drop.
5. Re-run your eval suite with a `tool_used: Skill` grader, because a shorter description can stop a skill triggering (see `evals.md`).

For what each component type contributes, see `components.md`.

### What users see before installing

Plugins in the official marketplace show a **Context cost** section in the `/plugin` details pane, with an `Every turn:` line and a `When invoked:` line; `Every turn:` is highlighted at 2,000 tokens or more. Plugins in your own marketplace have no **Context cost** section.

## How to check whether a plugin is used

Claude Code does not report usage back to the plugin author. Usage stays on each user's machine, so your options depend on your relationship to the users:

| Your situation | Where to look |
| :- | :- |
| You administer Claude Code for their organization | OpenTelemetry events and the Analytics API (see [How to measure across a fleet](#how-to-measure-across-a-fleet)) |
| They are teammates you can ask | Four commands each user runs at the Claude Code prompt on their own machine (below) |
| Neither | No usage signal from Claude Code |
| The plugin is listed in Anthropic's directory | [Track published plugin usage](https://claude.com/docs/connectors/building/after-publishing#track-published-plugin-usage) on claude.com |

Ask teammates to check:

1. **`/plugin`, Installed tab.** A marketplace-installed plugin unused for at least 14 days and 10 sessions moves under a **Not used recently** header, and its details show a `Last used:` line.
2. **`/skill-doctor`.** Shows each skill's cost and how often it is used, and flags skills in the listing that have never been invoked, including plugin skills. In an interactive session the report opens in the `/plugin` manager's **Stats** tab.
3. **`/doctor`.** Lists each user-installed skill, MCP server and plugin, and recommends disabling unused ones.
4. **`/usage`.** On Pro, Max, Ultra, Team or Enterprise plans, attributes recent usage to skills, subagents, plugins and MCP servers as a share of the total.

## How to measure across a fleet

As an administrator you can use either source.

### OpenTelemetry events

Configure an exporter (see [Monitoring usage](https://code.claude.com/docs/en/monitoring-usage)), then query your backend:

| Question | Event or attribute |
| :- | :- |
| Which plugins get installed, and from where | `claude_code.plugin_installed`, one per install |
| Which plugins are active, in how many sessions | `claude_code.plugin_loaded`, one per enabled plugin at session start |
| Which skills activate, and which plugin owns them | `claude_code.skill_activated`, with `plugin.name` and `marketplace.name` for plugin skills |
| What a plugin's hooks report | `claude_code.hook_plugin_metrics`, emitted only for hooks in official-marketplace plugins |
| What a plugin costs in API spend | `plugin.name` and `marketplace.name` on the cost counter, set when the active skill or subagent belongs to a plugin |

Only official-marketplace plugins report their names verbatim. Every other plugin, including one from your organization's own marketplace, is redacted or omitted by default. To get real names, set `OTEL_LOG_TOOL_DETAILS=1` on the exporting machines, for example in the `env` block of the managed settings that configure the exporter:

| Event | Default | With `OTEL_LOG_TOOL_DETAILS=1` |
| :- | :- | :- |
| `plugin_loaded` | `plugin.name` and `marketplace.name` are `third-party` | Real names |
| `plugin_installed`, `skill_activated` | `plugin.name` and `marketplace.name` omitted; `skill.name` is `custom_skill` on `skill_activated` | Real names |
| Cost counter | `plugin.name` is `third-party`; `marketplace.name` absent | Real `plugin.name`; `marketplace.name` still absent |

`plugin_id_hash` on `plugin_loaded` identifies each plugin even when redacted, so you can count distinct third-party plugins.

### Analytics API

On the Enterprise plan, `GET /v1/organizations/analytics/plugins` returns per-plugin, per-day install and invocation counts across Claude Code and Cowork from Anthropic's records, with no exporter. Group by user, RBAC group or product.

1. Have a Primary Owner create an API key with the `read:analytics` scope.
2. Call the endpoint with it; see the [endpoint reference](https://platform.claude.com/docs/en/api/admin/analytics/plugins/list) for parameters and response fields.
3. Expect activity without a plugin name in one aggregate `third-party` row.

## Best practices

- Check `claude plugin details` before each release, because the always-on figure is paid by every user in every session.
- Trim descriptions of the components with the largest always-on share first, because the per-component table shows where the tokens go.
- Re-run trigger evals after trimming, because the description is also what Claude matches requests against.
- Split large plugins into smaller ones, so users carry only the components they need.
- Keep an eye on 2,000 always-on tokens for an official-marketplace plugin, because at that level the `Every turn:` line is highlighted before install.
- Use `/context` for MCP tool cost, because `plugin details` does not count MCP tool schemas.
- Set `OTEL_LOG_TOOL_DETAILS=1` through managed settings when you need per-plugin telemetry for non-official plugins, because names are redacted by default.

## Pitfalls

- **``Plugin "formatter" not found. Run `claude plugin list` to see installed plugins, or pass --plugin-dir <path> to load one from disk.``** The command exits 1: the plugin is not loaded. Install it or pass `--plugin-dir` in the same command. `claude plugin details` takes no flags beyond `--help`.
- **Running `claude plugin details` at the Claude Code prompt.** It is a shell command.
- **Hook and MCP cost missing from the estimate.** Hooks are harness-only with no model context cost; MCP tool schemas are resolved at runtime and not counted. Use `/context`.
- **No Not used recently header.** It never appears for plugins loaded with `--plugin-dir` or from a skills directory, plugins enabled through managed settings or mounted from a seed directory, plugins with a theme, output style, monitor or workflow, or when the organization sets `strictKnownMarketplaces` (which also hides `Last used:`). An LSP plugin counts as used when its server delivers diagnostics or answers navigation requests.
- **Your organization's plugin shows as `third-party` or `custom_skill` in telemetry.** Expected default redaction; set `OTEL_LOG_TOOL_DETAILS=1`. `marketplace.name` stays absent on the cost counter even then.
- **No Context cost section for your plugin.** Only official-marketplace plugins show it.

## Sources

- https://code.claude.com/docs/en/plugins/measure (fetched 2026-11-05): [#measure-what-a-plugin-costs](https://code.claude.com/docs/en/plugins/measure#measure-what-a-plugin-costs), [#lower-the-always-on-figure](https://code.claude.com/docs/en/plugins/measure#lower-the-always-on-figure), [#cost-shown-to-users-before-install](https://code.claude.com/docs/en/plugins/measure#cost-shown-to-users-before-install), [#check-whether-a-plugin-is-used](https://code.claude.com/docs/en/plugins/measure#check-whether-a-plugin-is-used), [#measure-across-a-fleet](https://code.claude.com/docs/en/plugins/measure#measure-across-a-fleet), [#redacted-plugin-names-in-your-backend](https://code.claude.com/docs/en/plugins/measure#redacted-plugin-names-in-your-backend), [#query-the-analytics-api](https://code.claude.com/docs/en/plugins/measure#query-the-analytics-api)
- https://code.claude.com/docs/en/plugins/cli-reference#plugin-details
- https://code.claude.com/docs/en/monitoring-usage (OpenTelemetry event reference)
- Related: `evals.md`, `components.md`, `publish.md`

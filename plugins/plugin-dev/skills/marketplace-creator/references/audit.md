# Audit a marketplace: does it install, and does it describe itself truthfully?

An audit answers four questions in order: **is every manifest well-formed** (`claude plugin
validate`), **does the repo still describe itself truthfully** (the script: manifests, files on
disk and docs agree), **does every plugin load, install and stay affordable** (the CLI pass), and
**will it keep working for the people who install it** (the judgement checklist M1–M6: sources,
versions, renames, hosting, suggestions). It changes nothing until the
user asks, except `--fix`, which only inserts missing `$schema` lines.

## Contents

- [What the script checks, and what it leaves to you](#what-the-script-checks-and-what-it-leaves-to-you)
- [Own marketplace or someone else's](#own-marketplace-or-someone-elses)
- [Run the script](#run-the-script)
- [Ask the CLI: load, install, budget](#ask-the-cli-load-install-budget)
- [Steps](#steps)
- [Checklist M1–M6](#checklist-m1m6)
- [Severity and verdict](#severity-and-verdict)
- [Report format](#report-format)

## What the script checks, and what it leaves to you

`claude plugin validate <path> --strict` answers "is this manifest well-formed?": schema,
required fields, unknown keys, reserved names, a `renames` chain that doesn't resolve. The script
shells out to it when the CLI is on `PATH` and folds its output in; never reimplement it.

The script answers what the validator can't: **does the repo still describe itself
truthfully?** A `plugin.json` that lists two agents when three exist on disk is valid JSON, and
the third agent never loads. A README claiming 6 skills when there are 7 is valid Markdown, and
the seventh is invisible to readers. It also checks, across both manifest layers:

- **Attribution.** The browse view reads the entry, the installed view reads `plugin.json`; a
  value set in both must match. With conventions on, each layer carries `author`, `homepage` and
  `license` itself (checks.md → The attribution contract).
- **Dependencies.** An agent whose `skills:` names another plugin's skill makes its plugin
  depend on that one: declared, identical in both layers, satisfied by the dependency's version
  and by a release tag, never mutual (checks.md → The dependencies contract).
- **Display metadata.** `displayName` and `keywords` give a readable title and search in the
  `/plugin` browser; only ever warnings (checks.md → Display metadata).
- **`$schema`** on every manifest, and **the manifest in `.claude-plugin/`**, not the plugin root.

**House conventions are opt-in.** Drift is checked everywhere. Rules beyond what Claude Code
requires (closed frontmatter key sets, an explicit `agents` array, attribution and
`dependencies` in both manifests, a bold README row per skill) apply only to a repo that commits
`.marketplace-creator.json` (or the older `.marketplace-doctor.json`) with
`{ "conventions": true }`. Without it they stay quiet or drop to warnings, so don't tell the user
their repo breaks a rule it never adopted (checks.md → House conventions).

## Own marketplace or someone else's

| | Own (the user maintains it) | Someone else's (about to be added) |
| --- | --- | --- |
| Runs the script and `validate` | Yes | Yes, on a local clone |
| Checklist | M1–M6 | M1, M2, M5 first: what it installs and from where |
| CLI pass (`check-cli.mjs`) | All three checks; install runs in a throwaway config | `--load --budget` only: no install |
| After the report | Offers to fix; fixes go through the Add, Rename or Maintain steps | Never edits; ends with an add recommendation |

When it is unclear whose marketplace it is, treat it as someone else's.

## Run the script

The script ships with this skill, not with the repo you audit. The argument is the marketplace
repo root:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-marketplace.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--json` | Machine-readable report: full inventory plus every issue. Use it in CI or to diff two runs. |
| `--strict` | Warnings fail the run too (exit 1). Use in CI once the repo is clean. |
| `--fix` | Insert the missing `$schema` line into each manifest. The only flag that writes, and it changes nothing else in the file. |
| `--no-native` | Skip the `claude plugin validate` pass, when the CLI is unavailable or only doc drift matters. |

The text report opens with a banner and the counts, then a per-plugin checklist (`✓` clean, `⚠`
warnings, `✗` errors, with version, skill and agent counts), the issues grouped by plugin, and a
closing status line. Colour appears only on a terminal; set `NO_COLOR` to turn it off. Exit code
is 0 when clean, 1 when anything failed.

## Ask the CLI: load, install, budget

The second script asks Claude Code itself (checks.md → The CLI pass). It needs the CLI, takes
about half a minute for fifteen plugins, and never touches the user's own settings:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/check-cli.mjs" .
```

| Flag | Effect |
| --- | --- |
| `--load` / `--install` / `--budget` | Run only the named checks; with none named, all three run. |
| `--warn-at <n>` / `--fail-at <n>` | Always-on token limits, default 1,800 and 2,000. |
| `--offline-factor <f>` | How far the limits scale down when the CLI is signed out and only estimates (default 0.77). |
| `--json`, `--strict` | As in check-marketplace.mjs. |

## Steps

1. **Run the script first, before reading any file.** It is cheap and tells you which files are
   worth opening. Don't start by grepping the repo by hand. Then run `check-cli.mjs` when the
   CLI is installed; without it, the CLI pass goes under Not checked.
2. **Read checks.md for every issue class in the output.** Several repairs are not the obvious
   one: a "does not list the skill" error in `CLAUDE.md` is fixed in the table, never by deleting
   the skill.
3. **Review M1–M6** below against `marketplace.json`, the entries and `git log`. Each item names
   the reference that explains it; cite it in the finding's fix.
4. **Report** in the format below, then stop and wait, unless the request already asked for the
   fixes.
5. **When fixing:** fix the source of truth, not the report. Files on disk are the truth;
   manifests and docs follow them. Before removing a stale doc row, confirm with `git log` that
   the capability was deleted on purpose rather than moved. Group fixes by file (one edit per
   README beats seven), re-run the script, and bump the versions the repo's own rules require:
   the script checks versions only for semver and agreement between layers.

## Checklist M1–M6

The script prints none of these. Mark each finding with the severity in brackets unless the
evidence says worse.

### M1. The catalog — create.md → How to write marketplace.json

- `name` distinctive and not reserved or official-looking (🔴 when `validate` or `marketplace add`
  refuses it, 🟡 when it is generic enough to collide, such as `plugins` or `tools`).
- `description` on the marketplace and on every entry (🟡); `owner.name` present (🔴).
- No unknown top-level or entry keys left behind by typos (the native pass reports them; 🟡).

### M2. Sources — create.md → How to choose a plugin source

- Relative sources start with `./` from the root and stay inside it (🔴).
- `archive` sources pinned with `sha256` (🟡); `github`/`url`/`git-subdir` pinned with `sha` or a
  tag `ref` when the marketplace promises reproducible installs (🔵).
- Every entry with a remote source carries `description` and its display fields on the entry
  itself (🟡: blank in `/plugin` before install).
- A non-GitHub git host is given as a full URL; `owner/repo` always means github.com (🔴).
- `git-subdir` used only for another repository, never for the marketplace's own subfolders (🔵).

### M3. Versions — maintain.md → How to release a new version

- Each plugin follows one policy: `version` bumped on every release, or omitted everywhere (🟡).
- `version` set in only one place per plugin; `plugin.json` silently wins when both are set (🟡,
  🔴 when they differ).
- In a repo that tags per plugin, every range another plugin declares has a tag (the script
  reports it; plugin-release fixes it).

### M4. Renames and removals — maintain.md → How to rename a plugin without breaking installs

- Every entry name that left `plugins` in `git log -p -- .claude-plugin/marketplace.json` is a
  key in `renames`, pointing at a current entry or `null` (🔴: installs fail with
  `not found in marketplace`).
- No existing `renames` key was edited or removed (🔴).
- `forceRemoveDeletedPlugins` set only when uninstalling copies is intended (🔵).

### M5. Hosting and access — maintain.md

- A marketplace whose entries use relative paths is hosted in git or a shared directory, never as
  a bare `marketplace.json` URL (🔴).
- No plugin files tracked in Git LFS (🔴: they arrive as pointer files); `git lfs ls-files` when
  LFS is configured.
- When the README says the marketplace syncs through claude.ai organization settings, no plugin
  has a top-level `bin/` (🔴 for that plugin).
- Cross-marketplace dependencies have the target in `allowCrossMarketplaceDependenciesOn` of this
  marketplace (🔴).
- Install instructions in the README name the right `marketplace add` source and
  `<plugin>@<marketplace>` (🟡); for a private repository they say what the user's machine needs
  (🔵).

### M6. Suggestions — relevance.md

Only when an entry has `relevance`:

- At least one signal, within its limits (🔴: an over-limit signal makes the plugin
  uninstallable).
- Signals specific to the plugin; `cli` paired with a file or directory signal; `hosts` bare
  hostnames; `manifestDeps.file` anchored at the end with both separators (🟡).
- The report reminds the user that suggestions need the administrator's
  `pluginSuggestionMarketplaces` plus a declared source (🔵 note, not a defect).

## Severity and verdict

| Mark | Severity | From the script | From M1–M6 |
| :-: | --- | --- | --- |
| 🔴 | **error** | `✗` | Installs fail or break for existing users |
| 🟡 | **warning** | `⚠` | Works, but misleads users or breaks under some host, version or update |
| 🔵 | **note** | — | Works; harder to maintain or less reproducible than it needs to be |
| 🟢 | nothing found | `✓` | — |
| ⚪ | not checked | a remote plugin, a missing doc table | an area the run could not see |

Verdict from the worst finding: 🔴 **Broken**, 🟡 **Warnings**, 🟢 **Clean** (🔵 notes alone
still make it **Clean**). For someone else's marketplace, phrase it as the recommendation:
**don't add**, **add after reading the warnings**, **safe to add**. Never call the repo clean
unless the script exited 0, and quote its closing status line as the evidence.

## Report format

Follow the reporting rules indexed at the end of SKILL.md. For a marketplace audit:

- **Verdict line:** the verdict word, the counts the banner prints (plugins, agents, skills), the
  count at each severity, then the script's closing status line as evidence.
- **Scorecard:** first the six checklist areas M1–M6, then one row for the CLI pass, then one
  row per plugin in the script's order with its version, mark and issue count.
- **Findings:** one numbered row per issue, ranked by severity. For a script issue `Where` is the
  file it names, `Problem` its message word for word, `Fix` its `→` hint, shortened. Past fifteen
  rows, one table per plugin.
- **Not checked:** the `Not checked` lines of both scripts (remote plugins, missing doc tables,
  an offline token estimate), plus the CLI pass when it was not run.
- **After fixing,** say in the line above `Not checked` what the count went from and to.

```markdown
## 🩺 Marketplace audit · `claude-plugins`

> 🟡 **Warnings** · 15 plugins · 10 agents · 51 skills · 0 errors · 3 warnings · 1 note
> `✓ 0 errors  ⚠ 2 warnings`

| Area | Version | Status | Found |
| --- | --- | :-: | --- |
| M1. Catalog | — | 🟢 | — |
| M2. Sources | — | 🟢 | — |
| M3. Versions | — | 🟢 | — |
| M4. Renames | — | 🟡 | 1 warning |
| M5. Hosting | — | 🔵 | 1 note |
| M6. Suggestions | — | ⚪ | no `relevance` |
| CLI pass | — | 🟢 | 15 load · 15 install · max ~1,735 tok |
| nextjs | 1.4.0 | 🟡 | 2 warnings |
| design | 1.0.7 | 🟢 | — |

| # | Sev | Where | Problem | Fix |
| :-: | :-: | --- | --- | --- |
| 1 | 🟡 | `.claude-plugin/marketplace.json` | `formatter` left `plugins` in a284e03 with no `renames` key | Add `"formatter": null` (maintain.md → How to remove a plugin) |
| 2 | 🟡 | `plugins/nextjs/.claude-plugin/plugin.json` | no release tag of react satisfies ^1.2.0 | `claude plugin tag plugins/react` |

**Not checked:** `far` (remote source).

**Next:** say which numbers to fix, or `all`.
```

A clean run is the heading and one line, per the reporting rules. For someone else's
marketplace, `Next` is the add recommendation and no fix is offered.

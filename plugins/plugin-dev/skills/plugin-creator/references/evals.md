# Test a plugin with evals

`claude plugin eval` runs a plugin against a suite of test cases and scores the result. Each case is a realistic prompt plus one or more graders: pass/fail checks on what Claude produced, such as a regex over the reply, whether a tool was called, or a rubric a judge model scores. Each case runs several times with the plugin and, by default, the same number of times without it, so you see what the plugin actually contributes. Use evals once a plugin works and you want to know how reliably it leads Claude to the right outcome, to catch regressions when you change the plugin or a new model ships, and to gate plugin changes in CI. To check files for syntax and schema errors instead of behaviour, use `claude plugin validate` (see `publish.md`). Every agent run and every judge grader is a real model call billed to your plan's usage or your API account.

## Contents

- [How to check the requirements](#how-to-check-the-requirements)
- [How a run is scored](#how-a-run-is-scored)
- [How to create a suite with init](#how-to-create-a-suite-with-init)
- [How to write a case by hand](#how-to-write-a-case-by-hand)
- [How to choose and weight graders](#how-to-choose-and-weight-graders)
- [How to seed the workspace or continue a conversation](#how-to-seed-the-workspace-or-continue-a-conversation)
- [How to mock MCP servers](#how-to-mock-mcp-servers)
- [How to run the suite](#how-to-run-the-suite)
- [How to compare against the no-plugin baseline](#how-to-compare-against-the-no-plugin-baseline)
- [How to gate CI on the score](#how-to-gate-ci-on-the-score)
- [How to read the results](#how-to-read-the-results)
- [How to use a different eval directory](#how-to-use-a-different-eval-directory)
- [Best practices](#best-practices)
- [Pitfalls](#pitfalls)

## How to check the requirements

1. Claude Code v2.1.269 or later: `claude --version`, upgrade with `claude update`.
2. Git 2.31 or later, if git is installed (`git --version`). Without git, evals run normally; with an older git they stop before any case runs.
3. A plugin directory with `plugin.json` or `.claude-plugin/plugin.json`, or a skills-directory plugin.
4. The same authentication and model provider as your normal sessions. On Amazon Bedrock, Google Cloud's Agent Platform or Microsoft Foundry, run from a shell that exports the same provider variables, because each run inherits them.

## How a run is scored

- Each run starts a fresh, isolated non-interactive session with only your plugin loaded, sends the prompt, and lets Claude work until it finishes or hits the turn or time limit. Graders then check the final reply, the transcript, or a file Claude created.
- A run's score is the fraction of its graders that passed (weighted, if you set `weight`). A case's score is the mean over its runs. A case passes when its score meets `--threshold` (default `1.0`).
- Each case runs 3 times per arm by default. Cost is roughly cases × runs agent runs with the plugin, the same again for the baseline, plus three short judge calls per `llm` or `baseline` grader per run.
- `WITH` is the score with the plugin, `W/OUT` without it, and `Δ` the difference. A case that scores 1.0 in both arms is not passing because of your plugin.

## How to create a suite with `init`

1. Open a terminal at the plugin root (the directory with `plugin.json` or `.claude-plugin/plugin.json`).
2. Run:

   ```bash
   claude plugin eval init
   ```

3. Answer `y` to `Trust this plugin directory?` if asked.
4. In the interactive session that opens, Claude reads the plugin, asks what a good result looks like, proposes prompts that should and should not trigger the plugin, designs graders, runs them once as a trial and writes one case directory per prompt under `evals/`.
5. When the suite is ready, leave with `/exit` or Ctrl+D.

From an already open session at the plugin root you can instead ask Claude to run `claude plugin eval init`; it asks the same questions in that conversation. In CI or without a terminal, `init` cannot interview you: use `claude plugin eval init --bare <name>` for a blank template. `-i`/`--interactive` requires the interview and fails without a terminal.

## How to write a case by hand

1. Write a blank template (runs nothing):

   ```bash
   claude plugin eval init --bare first-case
   ```

   A case name starts with a letter or digit and contains only letters, digits, `.`, `_` and `-`.

2. Edit `evals/first-case/prompt.md`. The frontmatter holds run settings, the body is the message Claude receives. Phrase it the way a user would, without naming the skill:

   ```markdown
   ---
   max_turns: 10
   allowed_tools: [Read, Glob, Grep, Skill]
   ---

   Write me a commit message for this change: I renamed getUser to fetchUser and updated the three call sites.
   ```

3. Replace `evals/first-case/graders/criteria.md` with a rubric made of concrete PASS and FAIL conditions:

   ```markdown
   ---
   type: llm
   ---

   PASS if <what a correct response contains>.
   FAIL if <what a wrong or missing response looks like>.
   ```

4. Add `evals/first-case/graders/skill-fired.md` to check that your skill produced the answer. `your-skill-name` is the skill's directory name under `skills/`; the pattern also matches the namespaced `plugin-name:skill-name` form:

   ```markdown
   ---
   type: tool_used
   tool: Skill
   input_match: '"skill"\s*:\s*"(?:[\w-]+:)?your-skill-name"'
   ---
   ```

5. Run it with `claude plugin eval .` from the plugin root.

Resulting layout (the one `init` writes):

```text
my-plugin/
├── .claude-plugin/plugin.json
├── skills/...
└── evals/
    ├── first-case/
    │   ├── prompt.md          # frontmatter: case fields; body: the prompt
    │   ├── graders/
    │   │   ├── criteria.md    # frontmatter: type + options; body: rubric or pattern
    │   │   └── skill-fired.md
    │   └── case.yaml          # optional: only for context.* fields
    ├── mocks/                 # optional: suite-wide MCP mocks
    └── results/               # written by each run; add to .gitignore
```

A directory is a case when it holds `prompt.md`, `case.yaml` or both. To group cases, nest them under a directory that is not itself a case.

### `prompt.md` frontmatter

Unknown keys are an error.

| Field | Default | Purpose |
| :- | :- | :- |
| `name` | directory name | Matched by `--case` globs; the report keys on it |
| `description`, `expected_outcome` | | For humans only |
| `tags` | `[]` | For `--tag` filtering; a case runs if any tag matches |
| `plugins` | nearest enclosing plugin | Plugin directories under test, relative to the case, e.g. `plugins: ["../.."]` |
| `runs` | `3` | Runs per arm, 1 to 50; `--runs` overrides |
| `model` | child session's default | Model under test; `--model` overrides |
| `max_turns` | `10` | Turn cap, up to 200. Hitting it is a run error |
| `timeout_seconds` | `300` | Wall-clock cap per run, up to 3600 |
| `allowed_tools` | `[]` | Tools the case wants; read-only ones are granted when listed |
| `append_system_prompt` | | Appended to the child session's system prompt |
| `env` | `{}` | Extra variables; keys must match `EVAL_[A-Z0-9_]*` |
| `schema_version` | `"1.1"`, set for you | Case format version |

The body is sent exactly as written: `@path` mentions are not expanded, so grant `Read` if Claude must read a file.

## How to choose and weight graders

Every grader file under `graders/` has a `type`, an optional `weight` (default `1`, any positive number) and an optional `arm` (`with-only` or `both`). The grader's name is its filename without `.md`. There are no custom-code graders.

| Type | Options | Passes when | Cost |
| :- | :- | :- | :- |
| `regex` | `pattern`, `flags`, `match`, `target` | The JavaScript regex is found in the target. `match: not_contains` requires absence, `match: "count:N"` exactly N matches. Case-insensitive: `flags: i` (inline `(?i)` is not supported) | Free |
| `tool_used` | `tool`, `input_match`, `min`, `max` | Calls to `tool` whose JSON-encoded input matches `input_match` number between `min` (default 1) and `max` (default unlimited). Never called: `min: 0` and `max: 0` | Free |
| `tool_order` | `before`, `after` | Both tools were called and the first `before` call precedes the first `after` call. Each is a tool name or `{ tool, input_match }` | Free |
| `file_exists` | `path`, `exists` | A file created during the run matches the `path` glob (or none does, with `exists: false`) | Free |
| `llm` | `criteria`, `focus` | A judge model votes PASS in at least two of three votes. In the `.md` layout the body is the criteria | Judge calls |
| `baseline` | `baseline_file`, `criteria` | A judge finds the run satisfies the criteria at least as well as the reference `.jsonl` transcript at `baseline_file` | Judge calls |

What `regex` (`target`) and `llm` (`focus`) can look at:

| Value | What the grader sees |
| :- | :- |
| `last_message` | Claude's final response text (default) |
| `trace` | The session as JSON, one message per line. `regex` sees every message; an `llm` judge sees the first 12 and last 12. Quotes are escaped as `\"` |
| `files` | The list of paths created during the run, not their contents |
| `{ source: file, path: <path> }` | Contents of one workspace file after the run. PNG, JPEG, GIF and WebP go to an `llm` judge as an image; other binaries such as `.pptx` or PDF are refused |
| `mock_calls` | Each call to a mocked MCP tool, with its input and the mock's answer |

The judge defaults to the model Claude Code uses for background tasks; choose one with `--judge-model sonnet` or a full model ID.

## How to seed the workspace or continue a conversation

Each run starts in an empty workspace. Add a `case.yaml` beside `prompt.md`:

```yaml
schema_version: "1.1"
name: changelog-from-diff
tags: [smoke]
context:
  scaffold_script: fixture.sh
  add_dirs: [resources]
```

- `context.scaffold_script`: a Bash script in the case directory that creates fixture files or a git repository. It runs as you, outside the agent's sandbox, and only with `--scaffold`. It gets a minimal environment (`PATH`, a temporary `HOME`, `TMPDIR`, a few constants such as `TERM=dumb`, no `EVAL_*` variables) and 120 seconds; a non-zero exit or timeout scores the run 0 with `scaffold failed`.
- `context.add_dirs`: directories inside the case that Claude may read, read-only.
- `context.history_file`: a `.jsonl` transcript to resume; the prompt becomes the next user turn. With a path target such a case runs one arm only unless you pass `--ablation with-without`.
- `execution.prompt`: the prompt, when you keep the whole case in `case.yaml`. `model`, `max_turns`, `timeout_seconds`, `allowed_tools`, `append_system_prompt` and `env` also go under `execution:`; `description`, `tags`, `plugins`, `runs` and `expected_outcome` go at the top level.
- `graders`: a list of graders with a `name` plus the same keys as a grader file; for `llm` put the rubric in `criteria`.

When both files exist, `prompt.md` frontmatter overrides matching `case.yaml` fields, the `prompt.md` body is the prompt, and `graders/*.md` are added after graders listed in `case.yaml`. Use the scaffold for files and git state only: project configuration it writes is not loaded.

## How to mock MCP servers

Runs never start your plugin's real MCP servers unless you ask. Claude Code registers a substitute server under each server's name; mocked tools are allowed without an `--allow-tools` grant, and a tool with no mock file is unavailable.

1. Create one Markdown file per tool at `evals/mocks/<server>/<tool>.md` (suite-wide), or in the same layout under a case's own `mocks/` directory (one case; overrides the suite's mocks file by file). `<server>` is the server's name in the plugin's MCP configuration.
2. Write the tool's answer as the body, with optional substitutions and an input guard:

   ```markdown
   ---
   expect:
     title: string
     priority: [low, medium, high]
   ---

   Created issue #4821: {{input.title}}
   ```

| Key | Default | Purpose |
| :- | :- | :- |
| `type` | `fixed` | `fixed` returns the body. `agent` has the judge model act as the server, using the body as instructions |
| `expect` | unset | Map from dotted input paths to a type name (`string`, `number`, `boolean`, `array`, `object`), a `/regex/`, a literal or a list of literals. A violating call aborts the run with score 0 |
| `error` | `false` | `fixed` only: return the body as a tool error |
| `abort_when` | unset | `agent` only: the only conditions under which the agent may abort the run |

- Substitutions: `{{input.<field>}}` and `{{file:fixtures/{input.<field>}.json}}` (fixture files sit beside the mock).
- `_server.md`: one `type: agent` mock answering several tools listed in its `tools:` key; a `<tool>.md` for the same tool wins.
- `_tools.json`: a saved `tools/list` response so mocked tools keep their real descriptions and input schemas.
- Grade the calls with `target: mock_calls` (or `focus: mock_calls`).
- `/regex/` values in `expect:` allow only literals, `.`, escapes, character classes, the quantifiers `*`, `+`, `?`, `{m,n}` on a single item, optional `^`/`$`, and flags `i` and `s`. No groups or alternation: write a list of literals instead.

To use the real servers: `--allow-real-servers` starts real processes for unmocked servers and keeps the mocks; `--mocks off` ignores `mocks/` entirely. Either way the servers run as you, outside the sandbox, and their tools need a grant such as `--allow-tools "mcp__plugin_my-plugin_github__*"` (plugin MCP tools are named `mcp__plugin_<plugin>_<server>__<tool>`).

### Make agent mocks repeatable

`type: agent` answers vary between runs and with the judge model. After a run completes without error or abort, recordings land in `mock-recordings/` under the results directory. Open `ADOPT.txt` there, copy each recording into the `.replay/<server>/` directory it names, and commit `mocks/.replay/`. Later runs answer identical calls from the recording with no model call.

## How to run the suite

1. From the plugin root:

   ```bash
   claude plugin eval .
   ```

2. Pick a target when needed:

   | Target | What runs |
   | :- | :- |
   | Plugin root, e.g. `.` (or omitted) | Every case in its eval directory, with that plugin loaded |
   | A single `prompt.md` or `case.yaml` | That case, with its enclosing plugin |
   | `name` or `name@marketplace` | An installed plugin and its cases; results go to `./evals/results/` in the current directory |
   | `name@skills-dir` | The same for a skills-directory plugin |

3. Filter with `--case <glob>` and `--tag <tag>`. Put the target before `--tag`, `--allow-tools` and `--json`, which otherwise swallow it as their value.
4. Grant tools beyond the read-only set. Runs never prompt; ungranted tools are removed from the session. The read-only set is `Read`, `Glob`, `Grep`, `NotebookRead`, `Skill`, `AskUserQuestion`, `Agent`, `TodoWrite`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TaskStop`, granted when the case lists them in `allowed_tools`. For anything else:

   ```bash
   claude plugin eval . --allow-tools Write Edit "Bash(npm test *)"
   ```

   Any `Bash` grant runs under the OS-level sandbox (writes confined to the workspace, home and config unreadable, network limited to domains granted with `--allow-tools "WebFetch(domain:example.com)"`). Without a sandbox backend the run is refused: use WSL2 on Windows, install `bubblewrap` and `socat` on Linux.
5. To iterate cheaply on one case, run a single arm once, then confirm at the default three runs:

   ```bash
   claude plugin eval . --case <case-name> --runs 1 --ablation none
   ```

Main options (`claude plugin eval --help` lists all):

| Option | Default | Effect |
| :- | :- | :- |
| `--runs <n>` | case's `runs`, else 3 | Runs per case per arm |
| `-j`, `--concurrency <n>` | `1` | Parallel agent runs, 1 to 8; they share your rate limit |
| `--model <model>` | case's `model`, else `ANTHROPIC_MODEL`, else default | Model under test |
| `--judge-model <model>` | background-task model | Model for `llm` and `baseline` graders |
| `--ablation <mode>` | per case | `none` runs one arm; `with-without` adds the baseline |
| `--threshold <0..1>` | `1.0` | Any case below it makes the command exit 1 |
| `--max-cost-usd <usd>` | none | Ceiling on the list-price estimate, checked before each run; exit 2 with partial results |
| `--allow-tools <tools...>` | none | Grants beyond the read-only set |
| `--scaffold` | off | Run each case's `scaffold_script` |
| `--trust-plugin` | off | Skip the first-run trust prompt |
| `--mocks <mode>` | `record` | `record` uses mocks and saves agent-mock answers; `off` starts real servers |
| `--allow-real-servers` | off | With `record`, start real servers that have no mock |
| `--eval-dir <dir>` | `experimental.evals`, else `evals` | Directory holding the cases |
| `--json [path]` | off | Result document to stdout or a `.json` path; quiet run |
| `--output-dir <dir>` | `<eval dir>/results/<timestamp>/` | Where `aggregate-result.json` and `report.html` go |
| `--no-publish` / `--publish-report` | | Keep the report local / publish it even from a session-started run |
| `--keep-temp` | off | Keep and print each run's sandbox directory |

## How to compare against the no-plugin baseline

1. Run normally: a case runs a with-arm (plugin loaded) and a without-arm (no plugin), and the summary shows `WITH`, `W/OUT` and `Δ`.
2. Expect one arm only (no `W/OUT`, no `Δ`) when you pass `--ablation none`, when the target is a path and the case uses `context.history_file` (a `single-arm (no Δ)` notice prints on stderr), or when no plugin was found for the case.
3. Know which graders are excluded from the score in both arms and shown in the with-arm as indicators (`scored: false`, `plugin-fired indicator` badge in the report):
   - every `tool_used` grader whose `tool` is `Skill`;
   - `regex` with `target: mock_calls` and `llm` with `focus: mock_calls`, when every mocked server in the case is declared by your plugin;
   - any grader with `arm: with-only`.
4. Override when needed: set `arm: both` to score a grader in both arms (for example a "must not invoke the skill" check with `min: 0` and `max: 0`). If every grader in a case would be excluded, all are scored normally. Under `--ablation none` nothing is excluded, so absolute scores differ between the two modes.

## How to gate CI on the score

1. Install Claude Code on the runner and provide credentials in the environment, such as `ANTHROPIC_API_KEY` or your cloud provider's variables.
2. Run with trust asserted, pinned models, a local report and a cost ceiling:

   ```bash
   claude plugin eval . \
     --trust-plugin \
     --json results.json \
     --threshold 0.8 \
     --model claude-sonnet-5 \
     --judge-model claude-haiku-4-5 \
     --no-publish \
     --max-cost-usd 20
   ```

3. Fail the job on the exit code:

   | Exit code | Meaning |
   | :- | :- |
   | 0 | Every case at or above `--threshold`, nothing else failed |
   | 1 | A case below threshold, a case file failed to load, no cases found, a run could not start, a run ended on an API error, untrusted directory without `--trust-plugin`, invalid option, or the `--json` file could not be written |
   | 2 | Partial run: `--max-cost-usd` hit, or credential rejected before or at the first run; `results.json` has `partial: true` |
   | 130 | Interrupted; partial results written |
   | 143 | Terminated, e.g. by a CI timeout |

   `Δ` never changes the exit code, and neither do report write or publish problems.
4. Archive `results.json` and, if you chart trends, read these fields (`schemaVersion: 1`, camelCase; ignore fields you don't recognise):

   | Field | Meaning |
   | :- | :- |
   | `partial`, `partialReason` | `true` with `cost_ceiling`, `interrupted` or `auth_failed` |
   | `aggregates.overallScore` | Mean case score |
   | `aggregates.casesPassed`, `aggregates.casesTotal` | Cases at or above threshold, and total |
   | `aggregates.meanDelta` | Mean `Δ` in two-arm mode |
   | `cases[].aggregates.score` / `.delta` | Case with-arm score / with minus without |
   | `cases[].arms.with[].error` | `null` or why the run ended abnormally |
   | `cases[].arms.with[].aborted` | A mock stopped the run (`server`, `tool`, `reason`); score 0 |
   | `cases[].arms.with[].skippedPaidGraders` | Judge graders skipped by the cost ceiling; score not comparable |
   | `costUsd`, `durationSeconds`, `claudeVersion` | Cost estimate, wall-clock seconds, Claude Code version |

5. To see why a case scored low, rerun it locally without `--json` so progress and grader lines print.

## How to read the results

- Every run writes a `results/<timestamp>/` directory with `aggregate-result.json` and `report.html` inside the eval directory (for a named plugin, under the current directory).
- The summary's `COST` is a list-price estimate; `NOTES` shows the highest-weight failing grader's explanation, or the run's error, from the with-arm. With one arm the table shows `SCORE` and `PASS%` instead.
- `report.html` is self-contained. Read it top-down: the verdict line and tiles (suite score, ablation Δ, baseline score, cases passing, perfect runs), then each case card (negative `Δ` has a red left edge), then runs with each grader's chip; failed graders are expanded and `llm` graders show the judge's votes and evidence.
- On a claude.ai subscription with artifacts available, the report is also published as a private artifact (`Published: <url>`). `--no-publish` keeps it local. Runs started from a Claude Code session stay local (`kept local`) unless you add `--publish-report`.

## How to use a different eval directory

- For everyone: add `"experimental": { "evals": "quality/evals" }` to `plugin.json`.
- For one run: pass `--eval-dir quality/evals` to both `claude plugin eval` and `claude plugin eval init`.

The flag wins over the manifest. Use a relative path of plain directory names; an absolute path or `..` is an error as a flag, and as a manifest value prints a `Warning:` line and falls back to `evals/`. Cases, results and `init` output all move to that directory.

## Best practices

- Let `claude plugin eval init` write the first suite, because it trial-runs the graders to check they score the way you would.
- Phrase prompts the way a user types them and never name the skill, because the point is to test whether the description triggers.
- Pair one grader on the result (final message or produced file) with one on the steps (`tool_used` or `tool_order`), so you learn both whether the answer is right and whether your plugin produced it.
- Grade long output such as generated files with `regex` over `{ source: file, path: <path> }`, and keep `llm` graders for short outputs, because judge verdicts vary more the longer the text.
- Write `llm` rubrics as concrete PASS and FAIL conditions, so formatting does not decide the verdict.
- To check a build or test inside a run, have the prompt write the outcome to a file, grade that file, and assert the command ran with `tool_used` and an `input_match` naming it.
- Include prompts that should not trigger the plugin, and assert the skill was not called with `min: 0`, `max: 0` and `arm: both`.
- Pin `--model` and `--judge-model` in CI, so a model rollout is not mistaken for a plugin regression.
- Set an explicit `--threshold`, because the default `1.0` fails on any imperfect case.
- Use `--max-cost-usd` as the cost ceiling rather than tight `max_turns`/`timeout_seconds`, because hitting the turn cap is a run error that lowers the score.
- Keep every-change CI suites to free graders and `--ablation none` where `Δ` is not needed, to keep cost predictable.
- Leave `partial: true` documents and runs with `skippedPaidGraders` out of trend charts, because their scores are not comparable.
- Commit `mocks/.replay/` and add `results/` to `.gitignore`, so CI is repeatable and run output stays out of the repo.
- Confirm single-run experiments at the default three runs before trusting them, because one run of a non-deterministic agent is noisy.
- Ship every skill, agent, hook and MCP server a case depends on inside the plugin, because runs load nothing personal or project-level.
- Pass `--scaffold`, `--allow-real-servers` and `--trust-plugin` only for suites and plugins you or your organization wrote, because scaffolds, hooks and real servers run as you outside the sandbox.
- Treat scores as advisory for plugins with hooks you did not write or with real MCP servers, unless you ran them in a container or CI runner, because those can modify the files graders read.

## Pitfalls

| Symptom | Cause and fix |
| :- | :- |
| `plugin eval is currently in early access` | Build predates general availability. `claude update`, then a fresh session |
| `plugin eval is currently unavailable` | Switched off server-side. `claude update` and retry later |
| `is not a trusted plugin directory, and this run cannot stop to ask you about it` | First run in a non-terminal or under `--json`. Run once in a terminal and answer the prompt, or pass `--trust-plugin`. Inside a git repo, trusting it trusts the whole repo |
| `git 2.30 is too old for claude plugin eval: it ignores the environment configuration (GIT_CONFIG_COUNT, added in git 2.31) that switches off the repository's git hooks and helper programs for the run. Install git 2.31 or newer.` (names your version; exit 1) | Git older than 2.31 cannot switch off repository hooks and helpers, so the suite stops before any case. Install git 2.31 or later |
| ``Error: formatter@my-marketplace cannot be evaluated where sessions load it: no session could load it now. Its marketplace is a folder whose catalog could not be read, or lists it no more. Check the marketplace with `claude plugin marketplace list`, or pass ./<dir> to evaluate a directory.`` (example; the text after `no session could load it now.` names what failed) | You named a plugin installed from a marketplace added from a local path, and no session could load it from there now. Fix what the message names with `claude plugin marketplace list`, or pass the directory, e.g. `claude plugin eval ./plugins/formatter` |
| `No eval cases found` | No `<case>/prompt.md` or `<case>/case.yaml` under the eval directory, or filters matched nothing. Run from the plugin root or run `init` |
| Case fails to load with `invalid case.yaml` naming `graders` | The case has no grader. Add `graders/<name>.md` or a `graders:` entry |
| No `W/OUT` column, or `ablation requested but no plugin resolved` | No plugin found for the case. Add `plugins: ["../.."]` (path from case to plugin). Expected if every case uses `context.history_file` |
| `Δ` near zero and the `tool_used: Skill` grader fails | Usually real: the skill's `description` does not trigger on that phrasing. Rework the description and re-run |
| `tool_used: Skill` passes but `Δ` is negative | Suspect the judge: a small model can mark a correct answer wrong because it is formatted differently from the rubric. Re-run with `--judge-model sonnet` and tighten the rubric |
| `Agent type '<plugin>:<agent-name>' not found. Available agents: ...` | Expected in baseline runs (`cases[].arms.without`). Skip them with `--ablation none` |
| Everything scores 0 although the right files exist | Graders target `files` (the list of paths). Use `{ source: file, path: <path> }`. `file_exists` sees only files created in the run, not scaffolded or edited ones; grade contents or use `tool_used` on `Edit` |
| Regex over the trace doesn't match visible text | Default `target` is `last_message`; in `trace`, quotes are `\"`; use `flags: i`, not `(?i)` |
| Tools denied, MCP tools missing, Bash won't run | Grant with `--allow-tools`. Personal MCP servers never load; plugin servers need `--allow-real-servers` or `--mocks off` plus a grant |
| Exit 1 although results look fine | A stderr line names the cause (load error, API error). Also check `--threshold` is not still `1.0` |
| `--json output path must end in .json` | The target came after `--json`. Put the target first: `claude plugin eval . --json` |
| Grader `passed: false` under a run that scored 1.0 | It is excluded in two-arm runs (`scored: false`) by design |
| `ended on an API error and scored 0 without grading` | Rate or plan usage limit. Find the error after `error:` in the progress line, or at `cases[].arms.with[].error` / `.without[].error`. Baseline runs count too |
| Usage-limit or rate-limit errors partway | Runs score 0 and the command exits non-zero, but the suite is not `partial`. Re-run after reset with `--runs 1` or `--case` |
| `mock call budget exceeded` | Agent mocks share 4 × `max_turns` calls per run (40 by default), replays included. Raise `max_turns` |
| Runs time out or hit the turn cap | Raise `max_turns` and `timeout_seconds` (defaults 10 and 300) |
| `scaffold failed` | The scaffold exited non-zero or ran past 120 seconds. Remember it sees only a minimal environment |
| A run that publishes an artifact cannot be graded on it | The Artifact tool is off in runs; grade what the skill produces before that step |
| An `env` key fails the run | Keys must match `EVAL_[A-Z0-9_]*`; pass other settings as `EVAL_*` variables |
| Results differ on a managed machine | Managed settings policy still applies inside runs |

## Sources

- https://code.claude.com/docs/en/plugin-evals (fetched 2026-11-05): [#requirements](https://code.claude.com/docs/en/plugin-evals#requirements), [#create-your-first-eval-suite](https://code.claude.com/docs/en/plugin-evals#create-your-first-eval-suite), [#write-a-case-manually](https://code.claude.com/docs/en/plugin-evals#write-a-case-manually), [#grade-the-result](https://code.claude.com/docs/en/plugin-evals#grade-the-result), [#grader-types](https://code.claude.com/docs/en/plugin-evals#grader-types), [#compare-against-a-no-plugin-baseline](https://code.claude.com/docs/en/plugin-evals#compare-against-a-no-plugin-baseline), [#add-setup-or-history-with-case-yaml](https://code.claude.com/docs/en/plugin-evals#add-setup-or-history-with-case-yaml), [#mock-mcp-servers](https://code.claude.com/docs/en/plugin-evals#mock-mcp-servers), [#grant-tools](https://code.claude.com/docs/en/plugin-evals#grant-tools), [#command-options](https://code.claude.com/docs/en/plugin-evals#command-options), [#run-evals-in-ci](https://code.claude.com/docs/en/plugin-evals#run-evals-in-ci), [#json-result](https://code.claude.com/docs/en/plugin-evals#json-result), [#security](https://code.claude.com/docs/en/plugin-evals#security), [#use-a-different-eval-directory](https://code.claude.com/docs/en/plugin-evals#use-a-different-eval-directory)
- https://code.claude.com/docs/en/plugins/cli-reference#plugin-eval and [#plugin-eval-init](https://code.claude.com/docs/en/plugins/cli-reference#plugin-eval-init)
- https://code.claude.com/docs/en/plugins/manifest-reference#fields (`experimental.evals`)
- Related: `publish.md` (run the suite before each release), `measure.md` (check triggering after trimming descriptions), `create.md`

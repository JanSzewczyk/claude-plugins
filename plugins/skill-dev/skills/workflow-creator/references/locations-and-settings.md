# Where workflows live, how they are allowed, what they cost

## Save locations

| Location | Who sees it | Wins a name clash | Notes |
|---|---|---|---|
| `<repo>/.claude/workflows/<name>.js` | everyone who clones the repo | yes | In a monorepo, the closest `.claude/workflows/` between the working directory and the repo root. Claude Code refuses to write through a symlinked `.claude`, `.claude/workflows` or target file. |
| `~/.claude/workflows/<name>.js` | only this user, in every project | no | `CLAUDE_CONFIG_DIR` moves it to `<config>/workflows/`. Only a symlinked target file is refused, so a dotfiles-managed `~/.claude` works. |
| `<plugin>/workflows/<name>.js` | everyone with the plugin | namespaced | Runs as `/<plugin>:<name>`. The `workflows` manifest field points elsewhere and replaces the default scan. |

Two ways to get a file there:

1. Run a workflow, open `/workflows`, select the run, press `s`, Tab to switch between the
   project and the personal location, Enter.
2. Write the `.js` by hand, then `/reload-skills`, then `/<name>`. If `/<name>` does not
   appear in autocomplete, `meta` is not a pure literal or is not the first statement.

Only a saved, bundled or plugin workflow gets the "Yes, and don't ask again for `<name>` in
`<path>`" option in the approval dialog. A script Claude wrote for the current task is
approved per run.

## Permissions

- The Workflow tool launch: in manual and accept-edits modes you are asked every run (unless
  "don't ask again" was chosen for that saved workflow in that project). In auto mode, the
  first launch only. In bypass mode, never. In `claude -p` and the Agent SDK, no prompt is
  shown and the launch needs one of: `Workflow` or `Workflow(<name>)` in allow rules, auto
  mode, bypass mode, a PreToolUse hook that allows it, or a permission callback.
- The agents' tool calls use the session's permission rules and the subagent permission-mode
  rules. A run pauses on every prompt an agent hits, so before a long run add the commands the
  agents need to allow rules: `Bash(npx vitest *)`, `Bash(npm run *)`, `Bash(git *)` and so on.
- In auto mode, a prompt computed by the script does not count as a request from the user
  when the classifier reviews a subagent's action.
- Worktrees land in `<repo>/.claude/worktrees/`, inside the working directory, so an agent
  reading another agent's worktree needs no `/add-dir`. Add `.claude/worktrees/` to
  `.gitignore`.
- `worktree.baseRef`: `"fresh"` (default) branches each worktree from the remote default
  branch; `"head"` branches from the current HEAD. Migrations on a feature branch need
  `"head"`, or must run from the default branch.

## Settings that shape a run

| Setting | Effect |
|---|---|
| `disableWorkflows: true` | Turns workflows off (also removes `ultracode`). `CLAUDE_CODE_DISABLE_WORKFLOWS=1` does the same at startup. |
| `enableWorkflows` | Turns them on or off against the plan default (Pro has them off by default). |
| `ultracode: true` | Claude plans a workflow for every substantive task. Also `/effort ultracode` per session, `claude --effort ultracode` at launch. |
| `workflowKeywordTriggerEnabled: false` | Lets you type `ultracode` without starting a run. |
| `workflowSizeGuideline` | `unrestricted`, `small` (< 5 agents), `medium` (< 10, default), `large` (< 50). Advice to Claude when it writes a script; your own chosen value replaces the 25-agent warning threshold. |
| `subagentPromptCacheTtl: "1h"` | Keeps workflow agents' prompt cache for an hour instead of five minutes. Higher write cost, lower cost on long fan-outs. |
| `autoContinueAtUsageLimit` | Lets a run wait for a claude.ai usage-limit reset instead of failing the agents (interactive sessions only, at most two waits per run). |
| `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` | 1 to 256, default `min(16, CPUs - 2)`. |
| `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS` | Hold on matching siblings so they share the first agent's cache prefix; default 5000, `0` disables. |
| `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` | Stall window for every agent; `stallMs` per call. |
| `CLAUDE_CODE_SUBAGENT_MODEL` / `_FORCE` | One model for every subagent and workflow agent. |

## Cost

- A run counts against plan usage and rate limits. Third-party estimates for a 50k-line
  codebase: a bug hunt 200k to 800k tokens, a security audit 500k to 2M, a 50-file migration
  1M to 5M. Treat them as orders of magnitude.
- Pilot on a slice through `args` before the full run; `/workflows` shows per-agent tokens
  while it runs and `x` stops it without losing completed work.
- `/effort ultracode` makes every task a workflow and reaches session limits sooner. Prefer
  the per-prompt opt-in.
- Schema validation retries cost one to two extra agent turns per failure; tight schemas with
  few required fields fail less.

## Watching and resuming

- `/workflows`: list runs, `Enter` to drill into phases and agents, `f` filters by status,
  `p` pauses or resumes, `x` stops the selected agent or the run, `r` restarts an agent,
  `s` saves the script.
- Each run writes its script and `journal.jsonl` under the session directory in
  `~/.claude/projects/`. To relaunch an edited script, ask Claude to relaunch with the same
  run id; unchanged agents replay from the journal.
- A run survives backgrounding the session and, with agent view on, exiting with "Move to
  background and exit". A fresh session has nothing to resume and starts over.

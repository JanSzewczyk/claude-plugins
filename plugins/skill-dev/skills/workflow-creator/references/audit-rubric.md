# Audit rubric for a workflow script

`scripts/check_workflow.mjs` finds what a regex can find. This rubric is the part a reader
has to judge. Severities: **blocker** (the run fails, loops forever or does damage), **major**
(the run finishes but the result cannot be trusted or costs far more than it should),
**minor** (readability, observability, polish). Report each finding as
`severity CODE file:line fix`.

## A. Is a workflow the right tool at all?

| Severity | Finding |
|---|---|
| major | The task is sequential, needs mid-run human decisions, or fits in one context. A skill or a plain subagent would do it cheaper. Say so; do not polish a script that should not exist. |
| major | The script re-implements a skill the user already has (gates, phase files, questions) instead of taking one fan-out phase from it. |
| minor | The task is a single fan-out with no verify stage and no synthesis; a `parallel()` of Agent-tool calls in conversation would be the same thing without the approval dialog. |

## B. Contract before code

| Severity | Finding |
|---|---|
| major | No objective a reader could check the result against. "Improve the codebase" is not one; "list every route handler without an auth check, verified" is. |
| major | No stop rule: no round cap, no dry-round counter, no "stop when a test fails". |
| major | No evidence standard: findings without `file:line`, verdicts without the command that was run. |
| minor | Boundaries unstated: which directories, which files are out of scope. |

## C. Shape and data flow

| Severity | Finding |
|---|---|
| blocker | A stage reads fields from an agent result that has no `schema`. Prose comes back and `r.files` is `undefined`. |
| blocker | Writers run concurrently in one checkout without `isolation: 'worktree'`. |
| major | `isolation: 'worktree'` on a feature branch with `worktree.baseRef` unset; agents branch from the default branch and never see the work. |
| major | A barrier where no stage needs all prior results at once. |
| major | A `pipeline` stage that ignores `(prev, item, index)` and recomputes context it was handed. |
| major | A migrate stage in a worktree whose results the script expects to appear in the main checkout. Worktrees return branches; the script cannot merge. |
| major | A loop that dedups against confirmed results instead of everything seen; rejected findings return every round. |
| minor | Agents in a fan-out that differ in `model`, `effort`, `agentType` or `schema` for no reason, which breaks the shared prompt-cache prefix. |

## D. Prompts

| Severity | Finding |
|---|---|
| blocker | A credential, token or private URL in a prompt. Scripts are persisted and shown in `/workflows`. |
| major | A verify prompt that asks "is this correct?" instead of "try to refute this; default to refuted when uncertain". Confirmation bias survives the first wording. |
| major | A prompt that pastes CLAUDE.md or rules files. Subagents already load them; name the one rule a stage needs. |
| major | A writer prompt that does not say what it must not touch (tests, other files, git history). |
| minor | A prompt that addresses a human ("here is what I found") instead of returning data. |
| minor | No `label` on fan-out agents, so `/workflows` shows anonymous rows. |

## E. Failure handling

| Severity | Finding |
|---|---|
| major | `parallel()` or `pipeline()` results used without `.filter(Boolean)` or a per-item guard. |
| major | A top-N slice, sampling or no-retry bound without a `log()` of what was dropped. |
| major | `budget.remaining()` in a loop condition without `budget.total &&`. |
| minor | No `log()` at stage transitions; an empty result cannot be traced without reading the journal. |
| minor | `workflow()` nesting that assumes two levels. |

## F. Permissions and cost

| Severity | Finding |
|---|---|
| major | Agents run tools that are not in the allow rules (`npx vitest`, `npm run`, `git`); the run will stall on prompts. For headless runs, `Workflow(<name>)` is missing from allow rules. |
| major | More than 25 agents scheduled with no pilot run on a slice first. |
| minor | `model` overridden on every agent instead of relying on the session model. |
| minor | The script computes agent counts from the item list with no upper bound; a surprising discovery result spawns hundreds of agents. |

## G. Save location

| Severity | Finding |
|---|---|
| major | A workflow that references machine-specific absolute paths saved to a project `.claude/workflows/` that others clone. |
| minor | A personal workflow saved to the project location, or a team workflow saved to `~/.claude/workflows/` where nobody else sees it. |
| minor | File name differs from `meta.name`, or `meta.name` collides with a project workflow of the same name (the project one wins). |

## Verdict

- **re-shape** when any A finding is major: the script needs a different tool or a
  different cut, not fixes.
- **fix first** when any blocker or major remains.
- **ship** otherwise, with the minors listed in the handover.

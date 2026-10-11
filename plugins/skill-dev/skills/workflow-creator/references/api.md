# Workflow script API, distilled

Checked against Claude Code 2.1.294 (the bundled `/workflow-authoring` reference and the
public docs at code.claude.com/docs/en/workflows). When `claude --version` reports something
newer, run `/workflow-authoring` in the session and diff what it says against this file
before trusting it; this file is the fallback, not the source of truth.

## Shape of a file

```javascript
export const meta = {            // FIRST statement; a pure literal, nothing computed
  name: 'audit-routes',          // becomes /audit-routes; kebab-case; name the file <name>.js
  description: 'One line, shown in the permission dialog',
  whenToUse: 'Optional; shown in the workflow list',
  phases: [                      // optional; one entry per phase() title, matched exactly
    { title: 'Discover', detail: 'what this phase does' },
    { title: 'Audit', model: 'sonnet' },   // model here applies to that phase
  ],
}
// body: plain JavaScript, top-level await and return allowed
```

Rules the runtime enforces on the file:

- `meta` first, pure literal. A variable, call, spread or template interpolation inside it
  drops `/<name>` from autocomplete without an error at save time.
- Plain JavaScript. Type annotations, interfaces and generics fail to parse.
- `import()` fails before the run starts. `require`, `fs`, `process`, `fetch` do not exist.
- `Date.now()`, `Math.random()` and `new Date()` with no argument throw, because the run is
  journaled and replayed on resume. Pass timestamps through `args`; vary prompts by index
  for diversity.
- The return value cannot be a function. Objects are sanitized and JSON-stringified.

## Globals

| Global | Signature | Behaviour |
|---|---|---|
| `agent` | `agent(prompt, opts?) → Promise<string \| object \| null>` | One subagent. Returns its final text, or the validated object when `schema` is set. Returns `null` when the user skips it in `/workflows` or it dies on a terminal API error after retries. |
| `pipeline` | `pipeline(items, stage1, stage2, …) → Promise<any[]>` | Each item runs through every stage independently, no barrier. Stage callbacks receive `(prevResult, originalItem, index)`. A stage that throws, or whose agent returns `null`, drops that item to `null` and skips its remaining stages. Default for multi-stage work. |
| `parallel` | `parallel(thunks: Array<() => Promise>) → Promise<any[]>` | Barrier: waits for every thunk. A thunk that throws becomes `null` in its slot; the call itself never rejects. Passing promises instead of functions throws a TypeError. |
| `phase` | `phase(title)` | Opens a progress group for the `agent()` calls that follow. Global state: do not call it inside concurrent callbacks; pass `{ phase }` per agent instead. |
| `log` | `log(message)` | Narrator line above the progress tree. Also captured in the run result (first 1000 lines). |
| `workflow` | `workflow(nameOrRef, args?) → Promise<any>` | Runs a saved workflow (by name) or a script file (`{ scriptPath }`) inline. Shares the parent's concurrency cap, agent counter, abort signal and budget. One level of nesting only. Throws on unknown name or child syntax error. |
| `args` | `any` | Whatever the caller passed, as real JSON. `undefined` when nothing was passed, so guard every access. |
| `budget` | `{ total: number \| null, spent(): number, remaining(): number }` | Token target from a `+500k` directive. `total` is `null` when none was set and `remaining()` is then `Infinity`. Once `spent()` reaches `total`, further `agent()` calls throw `WorkflowBudgetExceededError`; in-flight agents finish and `parallel`/`pipeline` record the dropped slots as `null`. |
| `setTimeout`, `clearTimeout`, `console` | | Available. `console.*` prints to the same log stream; prefer `log()`. |

## `agent()` options

| Option | Type | Use |
|---|---|---|
| `label` | string | Row name in `/workflows`. Put the item in it: `` `migrate:${file}` ``. |
| `phase` | string | Progress group for this call. Use inside `pipeline`/`parallel` stages. Same string, same group. |
| `schema` | JSON Schema | Forces a StructuredOutput tool call; `agent()` resolves to the validated object. Root must be `{ type: 'object', properties: {…} }` and `required ⊆ properties`, or the call throws before the subagent starts. After five failed validations the call fails with the last error (`MAX_STRUCTURED_OUTPUT_RETRIES` changes the count). |
| `effort` | `'low' \| 'medium' \| 'high' \| 'xhigh' \| 'max'` | Per-agent reasoning effort. `low` for mechanical stages, higher only for judge and verify stages. Omit to inherit the session. |
| `model` | string | Per-agent model. Default to omitting it; the session model is almost always right. A phase entry in `meta.phases` can also carry `model`. |
| `agentType` | string | A custom subagent from `~/.claude/agents/`, `.claude/agents/` or a plugin, by name. Its system prompt and tools apply; `schema` composes with it. `Explore` and `Plan` types do not load CLAUDE.md. |
| `isolation` | `'worktree'` | Fresh git worktree per agent under `<repo>/.claude/worktrees/`. Costs 200 to 500 ms and disk per agent. Branches from the repository default branch unless `worktree.baseRef` is `"head"`. Removed automatically when unchanged; otherwise it stays on disk with its branch. Mutually exclusive with `cwd`. |
| `cwd` | absolute path | Working directory for the agent's file and shell operations. |
| `stallMs` | number | How long the agent may produce no output before the attempt is restarted. Up to five restarts, then the call fails. |

Subagents are told that their final text is the return value, not a message for a human, so
they return raw data. They receive the same CLAUDE.md and rules files as the main session;
do not paste rules into prompts, name the one rule a stage needs. They can reach session MCP
tools through ToolSearch, except interactively-authenticated servers in headless runs.

## Limits

| Limit | Value |
|---|---|
| Concurrent agents per run | `min(16, CPUs - 2)`, at least 2. `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` (1 to 256) overrides. Excess calls queue. |
| Agents per run | 1000. Reaching it throws `WorkflowAgentCapError`. |
| Items per `parallel()` or `pipeline()` call | 4096. More is an explicit error, not a truncation. |
| Prompt-cache stagger | Agents sharing the first agent's prefix start up to `CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS` (5000) ms after it. |
| Large-workflow warning | More than 25 agents scheduled or 1.5M projected tokens. Advisory. |
| Mid-run input | None. Only agent permission prompts and a usage-limit wait pause a run. |

## Resume and journal

Each run writes its script and a `journal.jsonl` under the session directory in
`~/.claude/projects/`. Relaunching the same script with the same `args` replays completed
agents from the journal; the first agent whose prompt differs, and every agent after it, runs
again. A failed agent and everything started after it also run again. Read `journal.jsonl`
before diagnosing an empty result: it holds each agent's actual return value.

## Invocation routes

- `/<name> <text>` for a saved workflow; Claude turns the text into `args`.
- "use a workflow to …" or the `ultracode` keyword in a typed prompt: Claude writes a script
  for the task.
- A skill or slash command whose instructions tell Claude to call the Workflow tool. This is
  one of the three sanctioned triggers, so a skill may delegate one phase to a workflow.
- `/effort ultracode`: every substantive task becomes a workflow for the session. Expensive.
- Headless (`claude -p`, Agent SDK): no prompt is shown; the launch needs `Workflow` or
  `Workflow(<name>)` in allow rules, auto mode, bypass mode, a PreToolUse hook, or a
  permission callback.

# The gate engine

`assets/gate/phase.py` is a flow-agnostic phase gate. It is Python 3.9+ with
the standard library only. Copy it verbatim into a skill's `scripts/` directory,
next to that skill's `phases.json`. Everything specific to the flow lives in the
JSON file, so a fix to the engine can be copied into every pipeline without a
merge.

## Commands

Call it as `python3 ${CLAUDE_SKILL_DIR}/scripts/phase.py <command>` from the
skill that ships it. A complete, lint-clean config to start from is
`assets/gate/phases.example.json` in workflow-skill-creator.

| Command | What it does |
|---|---|
| `phase.py init <ID>` | Creates `<run-root>/<ID>/state.json`. Refuses if the run exists; resume it instead |
| `phase.py check <ID> <N>` | Runs the checks of phases 0..N and changes nothing |
| `phase.py done <ID> <N>` | Refuses unless phases 0..N-1 are closed. Runs the checks of 0..N, and on green closes N. Re-closing an earlier phase reopens every phase after it |
| `phase.py status <ID>` | Lists closed phases, the next phase with its artifact, the run directory and the skill directory |
| `phase.py dir <ID>` | Prints the run directory |
| `phase.py abandon <ID>` | Marks the run abandoned, so the Stop hook stops nudging |
| `phase.py lint` | Validates `phases.json` |

Exit codes: `0` green, `1` red (every problem is printed, one per line), `2`
usage or config error. Any command refuses to run on an invalid `phases.json`.

**Why re-run the earlier checks every time:** an artifact edited after its phase
closed can't keep vouching for the phases built on it.

## Where the run lives

`FLOW_RUN_ROOT`, if set, is used as the root. Otherwise the root is the session
scratchpad (found from `CLAUDE_CODE_SESSION_ID`) plus `/<flow>`. The scratchpad
survives compaction, which is what the files exist for, and it disappears with
the session, which keeps runs from piling up. When the engine can't find the
scratchpad, it prints the exact `FLOW_RUN_ROOT=… phase.py …` line to use
instead. `FLOW_PHASES` points at a different `phases.json`; the tests use it.

## phases.json

```json
{
  "flow": "<short-name>",
  "phases": [
    { "n": 0, "title": "Preflight", "artifact": "00-preflight.md", "checks": [ … ] },
    { "n": 3, "title": "…", "artifact": "03-x.md", "conditional": true,
      "run_when": { "artifact": "02-evidence.md", "field": "Level", "equals": "unlocated" },
      "checks": [ … ] }
  ]
}
```

- Number the phases `n: 0, 1, 2…` in order. `artifact` is a bare file name
  inside the run directory.
- A `conditional` phase is satisfied by either its artifact or
  `<artifact-stem>.skipped`, and the `.skipped` file must contain a reason.
- With `run_when`, the engine also enforces which of the two applies. If the
  condition holds, `.skipped` is refused. If it doesn't, the artifact is
  refused.
- A condition is `{ "artifact", "field", "equals" }` or
  `{ "artifact", "field", "in": [ … ] }`. It reads the `Field: value` line of an
  artifact from this phase or an earlier one.

## Check types

| Type | Keys | Red when |
|---|---|---|
| `sections` | `headings` (list), `min_chars` (default 20) | A heading is missing, or its body is empty, holds only sub-headings, is a `<placeholder>`, `TODO`/`TBD`/`...`/`…`/`-`/`n/a`, or is shorter than `min_chars` non-space characters. `#` lines inside a code block are not headings |
| `field` | `name`, optional `enum`, optional `message` | There is no `Name: value` line, the value is a placeholder, or it is outside `enum`. A value `enum` lists always passes, even one that reads like a placeholder (`n/a`, `-`) |
| `regex` | `pattern`, `message` | The artifact doesn't match (multiline mode) |
| `absent` | `pattern`, `message` | The artifact does match. Use it for banned hedges or forbidden content |
| `implies` | `if`, `then` (conditions), `message` | `if` holds and `then` doesn't. This is how artifacts are checked against each other |
| `custom` | `command`, optional `message` | The command exits non-zero. Each line it prints becomes its own failure |

In a `custom` command, the engine substitutes `{run_dir}`, `{id}`,
`{skill_dir}`, `{scripts_dir}` and `{artifact}`, each already shell-quoted, so
don't wrap a placeholder in quotes yourself. Write literal braces as `{{` and
`}}`; `lint` rejects a command that doesn't. A command still running after
five minutes is stopped and reported red. Use custom checks for
provenance (every cited `path:line` exists at the named revision) and for
reading an outward write back from the system's API. Keep them in a
`scripts/verify.*` next to the engine, rather than growing the engine.

## Writing checks that are worth their cost

- **Start from the failure, not the template.** Every check should correspond to
  a way the flow actually went wrong, or would go wrong silently. The `message`
  names that failure, so a red result tells the model what the next phase would
  have been missing.
- **Checks between artifacts are worth the most.** Examples: a verdict that must
  match its evidence level, or a priority written to the system that must equal
  the one phase 3 priced.
- **Closed vocabularies make branching checkable.** A free-text `Level` can't be
  compared with anything.
- **Don't encode judgement in a regex.** A check that greps for a keyword fails
  on a genuinely good artifact that happens to phrase things differently.
- **Test the gate like code.** Close one full run. Feed it one thin artifact per
  important check and confirm it goes red with a message that says what to fix.

## Honest limits

The engine proves that files exist, have the right shape and agree with each
other, and, through custom checks, that cited things exist and writes landed. It
can't prove an analysis is right. A green run is one that didn't skip and didn't
contradict itself. Say so in every skill that uses it.

The model still decides whether to call `done`. If real runs show it skipping
the call, add `stop_gate.py` as a Stop hook (see
the "Registering the Stop hook" section of patterns.md).

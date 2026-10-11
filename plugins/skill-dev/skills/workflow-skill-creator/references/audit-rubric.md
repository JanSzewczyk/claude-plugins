# Audit rubric

Run `python3 ${CLAUDE_SKILL_DIR}/scripts/audit.py <skill-dir>` first. It covers the mechanical items marked **[script]**.
The rest needs reading. Severity says what happens if the finding ships:

- **blocker**: the skill doesn't load, doesn't trigger, or can damage something
  outside the run.
- **major**: runs will skip, drift or produce a result that can't be trusted.
- **minor**: costs tokens, clarity or maintainability.

## A. Tier fit

- **major**: The tier is too low for the risk. A skipped or thin step yields a
  plausible wrong result (a verdict with no evidence, a ticket for an unlocated
  defect), and nothing structural stops it.
- **major**: The tier is too high for the deliverable. The skill gates a flow
  whose output is text or a file the user reads right away, or a skill that
  teaches a method is itself a gated pipeline. Recommend descending.
- **minor**: There is a hook without evidence that the gate was ever bypassed.
- **minor**: A dynamic workflow or subagents are used for interactive or tightly
  dependent steps, or for one agent reviewing another agent's output.

## B. Trigger and description

- **blocker [script]**: The description is missing, or longer than 1,536
  characters.
- **major [script: reported as minor]**: The description summarises the steps. The model may execute the
  summary and skip the body.
- **minor [script]**: No "Use when…" clause, or longer than 1,024 characters.
- **minor**: The phrases users actually type are missing, or there is no
  `NOT for` line where a neighbouring skill overlaps.

## C. Phase cut

- **major**: A phase doesn't hand a real artifact to the next one, so the order
  is decorative.
- **major**: The flow touches external tools and has no preflight, so a dead
  token fails at the last step.
- **major**: An outward write happens before the analysis it depends on is
  closed.
- **minor**: There are more than eight phases, there is no light path for
  trivial inputs, or near-duplicate skills exist per subtype where one flow with
  a classification step would do.

## D. Execution contract and disclosure

- **major**: There is no execution contract near the top of SKILL.md, or it
  sits past the first ~5,000 tokens, which is lost after compaction.
- **major [script]**: A phase file isn't linked from SKILL.md, the phase numbers
  have gaps, or a link is broken.
- **major [script]**: SKILL.md is over 500 lines.
- **minor [script]**: A phase file links to another phase file, or a file is
  orphaned.
- **minor**: There is no resume rule, or the resume rule allows restarting a
  run that already wrote files.

## E. Artifacts and gate (tier 3)

- **major [script]**: `phases.json` fails lint, or its phase count differs from
  the phase files, or SKILL.md never names the gate script.
- **major**: There are no checks between artifacts. The gate only checks shape.
- **major**: A conditional phase can vanish without a `.skipped` file.
- **major**: An outward write is "verified" by a pasted read-back instead of
  the gate reading the system.
- **minor**: The engine is a fork instead of a verbatim copy, or checks encode
  judgement as keyword greps.
- **minor**: The skill never says that a green gate isn't a correct analysis.
- **minor**: Run state is written to a permanent directory or the repo when the
  session scratchpad would do.

## F. Outward writes and other skills

- **blocker**: The skill resolves, merges, deletes, transitions or edits
  existing records in an outside system (tickets, issues, pull requests,
  messages) without an explicit instruction.
- **major**: An outward write has neither a confirmation nor a read-back, or
  "no" is treated as a failure to retry.
- **major [script: partial]**: The skill names another skill or file that
  doesn't exist.
- **minor**: The skill edits, or proposes editing, a skill the user doesn't own,
  instead of overriding values at the call site.
- **minor**: A general-purpose skill names other skills or machine-specific
  paths.

## G. Prose

- **major**: A rule's only force is emphasis. There is a `MUST` with no reason
  and no structure behind it.
- **minor [script]**: A cluster of all-caps `ALWAYS`/`NEVER` words.
- **minor**: The skill carries a map of the code (file paths, function names,
  line numbers) instead of shapes to search for.
- **minor**: Conventions are stated as fact without a measurement behind them.
- **minor**: Fetched content isn't declared as data in a flow that reads
  external text.

## H. Evidence it works

- **minor [script]**: There are no tests or evals, and nothing shows the skill
  was tried on a real input.
- **minor**: There was no comparison with a run without the skill, or the
  hand-over didn't name what wasn't tried.

## Report format

```
<skill> — verdict: ship | fix first | re-tier

Works — keep:
- <what is already right>

Findings:
- blocker  <file:line>  <finding> → <one-line fix>
- major    <file:line>  <finding> → <one-line fix>
- minor    <file:line>  <finding> → <fix>

Not checked: <what the audit could not see, e.g. real-run behaviour>
```

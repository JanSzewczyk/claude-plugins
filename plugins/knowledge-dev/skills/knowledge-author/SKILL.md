---
name: knowledge-author
description: Write, extract and maintain knowledge notes, the one-decision-per-file rules in the marketplace's knowledge/ folder that skills and agents receive as generated renderings, and evolve the format and build behind them. Use when the user wants to add a rule or convention, write a guide that explains a choice, turn an existing SKILL.md or agent into notes, change or retire a rule, rebuild and check the generated files, or change how notes are written or rendered ("add a rule that…", "extract the rules from this skill", "this convention changed", "knowledge build", "why does check fail", "why is the knowledge base built this way"). Works on the repo checkout, not on an installed plugin.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[extract <skill-dir> | new <path> | build | check | lint]"
---

# Knowledge author

Notes in `knowledge/` are the single source of truth for rules that skills and agents apply. This
skill creates them and keeps the generated files current. Read `knowledge/README.md` in the repo
before the first note of a session: it is the contract `validate` enforces.

## Why it works this way

Every design choice has a recorded reason in [references/decisions.md](references/decisions.md):
the evidence, what was rejected, and when to revisit it. The ones people ask about most:

- Plain files, not RAG: the base is far below the size where retrieval pays, and an index would
  drift (D1).
- Notes live once in `knowledge/` and skills get generated copies, because an installed plugin
  cannot read outside its own folder (D3).
- The path is the id and a `principles/` folder is the type, so the frontmatter has no `id`,
  `type`, `tags` or `verified`: every key must have a consumer (D4, D7).
- The model gets no frontmatter and one `references/rules.md` per skill: copied frontmatter was a
  quarter of the tokens, and eleven files cost ten extra reads and turns for the same result
  (D13, D14).
- A guide (`guides/` folder) is the long form for a choice with options and costs; targets ask for the sections they need (D27).
- Agents get knowledge passively, through preloaded `user-invocable: false` skills (D15).
- Why and the Incorrect examples stay: the A/B found no gain from cutting them, and the only misses
  came from trimmed profiles (D10, D16).

Before changing the note format, the rendering, the targets or the commands, read the decision that
covers it. If the change reverses or adds a decision, update `references/decisions.md` in the same
change: a new D-entry, or a dated "Superseded" line on the old one, with the evidence. Then align
`knowledge/README.md` with it.

All commands run from the repo root:

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs <command>
```

## Extract notes from an existing skill or agent

This is the main mode: most rules already exist as prose inside a SKILL.md or an agent.

1. Read the source file. List every statement that is a decision ("query portal content through
   `screen`"). Skip API facts the library's docs already state; note them for removal instead.
2. For each decision, run `similar "<the decision in one sentence>"` and read what it lists, then
   `grep -ril` its key terms: word overlap misses paraphrases. Merge into an existing note rather than
   duplicating it.
3. Split each remaining decision into one note. Ask of each: does it hold in every language or
   framework? Then it is a principle, and the concrete code goes into a rule that `implements` it.
4. Scaffold with `new <path>` (a path with a `principles/` folder makes a principle), then
   replace every `{{TODO}}`: title, summary, impact, Rule, Why, Incorrect, Correct, sources.
   Put the recognisable failure in the first sentence of Why; compact renderings keep only that.
   Use `applies` only for what the path does not already say.
5. Take the examples from the source file when they are right; shrink them to the smallest code
   that shows the difference.
6. Add or extend the target in `knowledge/targets.json` so the skill receives the notes, and
   replace the extracted prose in the SKILL.md with the `BEGIN:knowledge` / `END:knowledge`
   markers. What remains in SKILL.md is the workflow.
7. Run `validate`, then `build`, then `check`, then review (below). Show the user the index the build wrote.

When the source contradicts an existing note (for example an agent saying `.build()` where the
note says `.one()`), stop and ask which is right before writing anything.

## Add one rule

`new <path> --about "<the decision in one sentence>"` lists the closest existing notes and the
folder's siblings before you write anything: read them, and if one already holds the decision, edit
it instead. Fill the note, add it to a target's `include` if no glob already covers it, `build`, then
review (below).

## Write a guide

A choice with options, costs and exit criteria (an architecture, a migration path) does not fit
one decision. Write it as a guide (D27):

1. Write the rules and principles first: one note per verdict, as above.
2. `new <domain>/<...>/guides/<slug> --about "<the choice>"`, then fill `## Decision`, `## Options`,
   `## Layouts` (optional) and `## Evolution`, and list the notes from step 1 in `decides`.
3. Keep the Decision short enough to stand alone, and the whole guide under about 150 lines.
   Leave learning material (exercises, reading lists) out: the model does not use it.
4. Give a target the sections it needs with `guides` in `targets.json`. Knowledge skills keep the
   default `["Decision"]`; a procedure skill or an architecture agent asks for all of them.

## Review what you added or changed

The scripts compare words; they cannot see a paraphrased duplicate, two notes that contradict each
other, or an API fact written as a decision. After notes are added or changed, by `new`, by hand or
by a script (the edit hook only sees Claude's own Edit and Write), run:

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs neighbors --changed
```

It lists each changed note with the notes a reviewer must read beside it. Then launch one
`librarian` agent per changed note, **all in the same message so they run in parallel**,
each given only its note id. Reviewers are read-only and return findings with quoted evidence.
Merge their reports, fix every duplicate and contradiction (merge, change the Rule, or delete) and
re-run `validate`, `build`, `check`. Where two reviewers disagree, or a fix would reverse an
existing note, ask the user. For more than about eight notes, batch eight at a time. Skip the review
only for a typo-level edit, and say so (D26).

## Change or retire a rule

Edit or delete the note, never a generated file. `build` rewrites every consumer; list the plugins
it touched so their versions can be bumped.

## When check fails

`check` names each generated file and why it differs: stale (the note changed), edited by hand
(the copy changed), missing or left behind. Run `build` for the first and last cases. For a copy
edited by hand, move the edit into the source note first, then `build`.

`coverage` lists principles whose `expects` has no implementation for a language or framework.
It is a to-do list, not an error, unless run with `--strict`.

## Find close notes

`similar "<sentence>"` ranks the notes closest to a sentence (`!` marks 50%+, probably the same
decision); `neighbors <id>... | --changed [--json]` gives per note the similar, same-folder and
linked notes to read. Both are lexical and offline: they narrow, the reviewer judges.

## Lint

`lint` looks across the base for what `validate` cannot: notes no target receives, near-duplicate
titles or summaries, a principle that expects implementations and has none, a knowledge skill near
its line budget. `--links` also probes every `sources` URL, `--strict` makes findings fail. A hook
runs it, with `validate`, after each edit under `knowledge/`; fix what it reports about the note
you just wrote, or say why it is not real. It cannot judge contradictions or a fact posing as a
decision: read the neighbours in the same folder for that (D25).

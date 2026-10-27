---
name: knowledge-author
description: Write, extract and maintain knowledge notes, the one-decision-per-file rules in the marketplace's knowledge/ folder that skills and agents receive as generated renderings, and evolve the format and build behind them. Use when the user wants to add a rule or convention, turn an existing SKILL.md or agent into notes, change or retire a rule, rebuild and check the generated files, or change how notes are written or rendered ("add a rule that…", "extract the rules from this skill", "this convention changed", "knowledge build", "why does check fail", "why is the knowledge base built this way"). Works on the repo checkout, not on an installed plugin.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
argument-hint: "[extract <skill-dir> | new <path> | build | check]"
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
2. For each decision, search `knowledge/` for an existing note (path, title, text). Merge into it
   rather than duplicating it.
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
7. Run `validate`, then `build`, then `check`. Show the user the index the build wrote.

When the source contradicts an existing note (for example an agent saying `.build()` where the
note says `.one()`), stop and ask which is right before writing anything.

## Add one rule

`new <path>`, fill it, add it to a target's `include` if no glob already covers it, `build`.

## Change or retire a rule

Edit or delete the note, never a generated file. `build` rewrites every consumer; list the plugins
it touched so their versions can be bumped.

## When check fails

`check` names each generated file and why it differs: stale (the note changed), edited by hand
(the copy changed), missing or left behind. Run `build` for the first and last cases. For a copy
edited by hand, move the edit into the source note first, then `build`.

`coverage` lists principles whose `expects` has no implementation for a language or framework.
It is a to-do list, not an error, unless run with `--strict`.

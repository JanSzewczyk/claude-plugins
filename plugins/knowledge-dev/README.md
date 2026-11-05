# knowledge-dev

Authoring and build tooling for the marketplace's shared knowledge base: the rules that skills and
agents apply live once in `knowledge/` at the repo root, one decision per file, and every consumer
receives a generated rendering. A drift check keeps the renderings honest in CI.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **knowledge-author** | `/knowledge-author` | Extracts rules from an existing skill or agent into notes, adds or changes a rule, rebuilds the generated files, explains a failing check and lints the base for orphans, near-duplicates and budgets |

## Installation

The skill works on a checkout of this repository, not on an installed copy: it reads and writes
`knowledge/` and the skills that consume it.

```bash
/plugin install knowledge-dev@szum-tech
```

## Usage

```bash
/knowledge-author extract plugins/react/skills/create-stories
/knowledge-author new testing/storybook/<slug>
/knowledge-author build
/knowledge-author check
/knowledge-author lint
```

The script behind it runs without Claude too, from the repo root (Node 22+, no dependencies):

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs check
```

## How It Works

1. A note in `knowledge/` holds one decision: a frontmatter with `title`, `summary`, `impact` and
   `applies`, and the sections Rule, Why, Incorrect, Correct. The path is its id; a `principles/`
   folder marks a principle. The authoring contract is `knowledge/README.md`.
2. `knowledge/targets.json` says which notes each skill receives, filtered by path glob and by the
   languages, frameworks and libraries in `applies`.
3. `build` renders them: a `references/rules.md` plus an index block between `BEGIN:knowledge` and
   `END:knowledge` in a hand-written `SKILL.md`, or a whole background-knowledge skill
   (`user-invocable: false`) that agents preload through `skills:`. Frontmatter and sources never
   reach the model.
4. `check` rebuilds in memory and byte-compares. CI fails on a stale or hand-edited copy and says
   which one it is.

Why each of these choices was made, with the evidence and the rejected alternatives, is in
[decisions.md](./skills/knowledge-author/references/decisions.md).

## Lint and the edit hook

`lint` reports what `validate` cannot see because it looks across notes. Every finding is a warning
(exit 0, `--strict` to fail):

| Finding | Means |
|---------|-------|
| no target receives this note | it never reaches a skill or agent: add it to a target or delete it |
| looks like `<id>` | title or summary overlaps 70%+ with a note that is not just the same decision in another language |
| no rule implements this principle | the principle lists `expects` and nothing has `implements` it |
| `<skill>` is N of M lines | a knowledge skill is at 90% of its line budget |

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs lint
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs lint --links   # also probe sources (network)
```

The plugin ships a `PostToolUse` hook (`hooks/hooks.json`). After Claude writes a file under
`knowledge/` it runs `validate` and `lint` and speaks only about that note: a contract violation
blocks (exit 2) so it is fixed in the same turn, a lint finding comes back as context. It does not
see edits made outside Claude Code; CI runs `validate`, `check` and `lint` for those. Why this is a
script and not a model: D25 in `decisions.md`.

## Checking preloads in a live session

Three behaviours the design relies on are not verified yet (open questions in `decisions.md`).
Check them once, with this marketplace added from the local checkout and the `react` plugin
installed, in a project that has a React component with a dialog:

1. **The knowledge skill is injected.** Ask Claude to delegate stories for that component to the
   `storybook-tester` agent and to have the agent quote, before writing anything, the title of the
   first rule under "Always apply" in its context. The answer should be a title from
   `storybook-rules` (for example "Await every userEvent call and every expect in a story test").
2. **The rules file one link away is readable.** In the same run, have the agent quote the Rule
   section of "Derive a story variant with Story.extend…", a `low` rule that lives only in
   `storybook-rules/references/rules.md`. If it cannot open the file, the medium and low rules never
   reach preloading agents.
3. **Cross-plugin names.** `nextjs:testing-strategist` preloads `storybook-rules` from the `react`
   plugin by bare name. Install `nextjs` and repeat check 1 with that agent; if nothing is injected,
   try `skills: react:storybook-rules`. The working form decides how agents outside `react` preload
   knowledge skills.

Record each result in `decisions.md` (D15, Open questions) and revert any temporary change.

## Testing

```bash
node --test plugins/knowledge-dev/skills/knowledge-author/tests/knowledge.test.mjs
```

The tests run against a frozen fixture in `tests/fixture/`, plus one test that the repository's
own generated files are current.

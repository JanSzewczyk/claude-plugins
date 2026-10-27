# knowledge-dev

Authoring and build tooling for the marketplace's shared knowledge base: the rules that skills and
agents apply live once in `knowledge/` at the repo root, one decision per file, and every consumer
receives a generated rendering. A drift check keeps the renderings honest in CI.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **knowledge-author** | `/knowledge-author` | Extracts rules from an existing skill or agent into notes, adds or changes a rule, rebuilds the generated files and explains a failing check |

## Installation

The skill works on a checkout of this repository, not on an installed copy: it reads and writes
`knowledge/` and the skills that consume it.

```bash
/plugin install knowledge-dev@szum-tech
```

## Usage

```bash
/knowledge-author extract plugins/testing/skills/create-stories
/knowledge-author new testing/storybook/<slug>
/knowledge-author build
/knowledge-author check
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

## Testing

```bash
node --test plugins/knowledge-dev/skills/knowledge-author/tests/knowledge.test.mjs
```

The tests run against a frozen fixture in `tests/fixture/`, plus one test that the repository's
own generated files are current.

# Knowledge notes

This folder is the single source of truth for the rules that skills and agents in this marketplace
apply. A note is one decision, kept once. Skills and agents never read this folder directly. They
receive renderings that `knowledge.mjs build` generates, because an installed plugin is copied into
a cache and cannot see files outside its own directory.

Why each rule in this guide exists, with its evidence and what was rejected, is in
[the design decisions](../plugins/knowledge-dev/skills/knowledge-author/references/decisions.md).
The D-numbers below point there. Change a rule here only together with its decision.

```
knowledge/
  README.md                 this guide
  _template.md              what `knowledge.mjs new` copies
  knowledge.config.json     vocabulary for `applies` and size budgets
  targets.json              which skills receive which notes, and how they are rendered
  <domain>/principles/      decisions that hold in every language and framework
  <domain>/<library>/       decisions about one library
  <domain>/<library>/principles/
  <domain>/<library>/<framework>/
  <domain>/<concept>/<language>/<library>/
```

## Before you write a note

Answer these in order. Stop at the first "no".

1. **Is it your decision?** A note records a convention or a judgement ("query portal content
   through `screen`"). An API fact ("`findBy*` returns a promise") belongs to the library's docs,
   read through Context7 or `llms.txt`. Facts go stale on the next major release, decisions don't.
2. **Is it one decision?** If the title needs "and", write two notes.
3. **Does it already exist?** `grep -ril "<keyword>" knowledge/`. Change the existing note rather
   than adding a near-duplicate.
4. **Principle or rule?**
   - A **principle** holds whatever the language or framework ("set every value the test asserts
     on explicitly"). It lives in a `principles/` folder. It may name a library when the decision
     is about that library in every framework, and it may list in `expects` the languages or
     frameworks that should each have an implementation.
   - A **rule** is concrete: code in one language, for one library. When it is how a principle is
     done in that stack, it names the principle in `implements`.

## Where the file goes

The path is the id, and the folder carries the type: a `principles` segment makes a principle.
Folders go from the general to the specific, and only as deep as the note needs.

| Note | Path |
| --- | --- |
| Principle for all testing | `testing/principles/query-like-a-user.md` |
| Principle about one library | `testing/storybook/principles/use-csf-next-factories.md` |
| Rule for one library | `testing/storybook/portal-content-via-screen.md` |
| Rule for one library in one framework | `testing/storybook/react/story-file-setup.md` |
| Rule for one library in one language | `testing/builders/python/factory-boy/overrides-and-traits.md` |

## Create it

```bash
node plugins/knowledge-dev/skills/knowledge-author/scripts/knowledge.mjs new testing/storybook/<slug>
```

`new` copies `_template.md` and fills `applies` from the folder names it recognises. Every
`{{TODO}}` it leaves fails `validate`, so a half-written note cannot be built. The plain word TODO
inside a code sample is fine.

## Frontmatter

Every key earns its place by something that reads it. Flat `key: value` lines in this order;
lists are written inline as `[a, b]`. Nothing else is accepted: no nested maps, no multi-line
values. The repo's other scripts read the same dialect.

| Key | Required | Read by |
| --- | --- | --- |
| `title` | yes | Every rendering. The decision as an imperative sentence, at most 90 characters |
| `summary` | yes | Index rows. One line, at most 120 characters |
| `impact` | yes | Ordering, and which notes agents get inline (see below) |
| `applies` | no | Target selection. Languages, frameworks and libraries from `knowledge.config.json` in one list; empty means "any". A library may carry a range: `storybook@>=10` |
| `implements` | rules only | `coverage`. The path of the principle this rule carries out |
| `expects` | principles only | `coverage`. Languages or frameworks that should each have an implementation |
| `sources` | rules with a library | You, when you re-check the note. `https://` links to the docs it was checked against. Never rendered |

There is deliberately no `id` (the path), no `type` (the folder), no `tags` (search the text) and
no `verified` date (D4, D7). Git history shows when a note changed; when a library ships a major release,
re-check every note whose `applies` names it.

### Impact

| Level | Use when breaking the rule… |
| --- | --- |
| `critical` | produces wrong results silently: a test that passes while the code is broken, a flaky suite |
| `high` | is a common mistake that costs real time to find |
| `medium` | hurts readability, consistency or maintenance |
| `low` | is a matter of style |

## Body

| Section | Principle | Rule |
| --- | --- | --- |
| `## Rule` | required | required |
| `## Why` | required | required |
| `## Incorrect` | optional | required |
| `## Correct` | optional | required |
| `## Exceptions` | optional | optional |

No other sections: the renderer knows only these, and `validate` rejects the rest.

- **Rule:** one to three sentences, imperative, positive ("query portal content through `screen`",
  not "don't use `canvas`").
- **Why:** put the failure a reader would recognise in the **first sentence**. The compact
  rendering keeps only that sentence. Do not skip Why to save tokens: it costs about 55 tokens a
  note, and the A/B found no gain from cutting it (D10, D16).
- **Incorrect / Correct:** the smallest code that shows the difference, at most about 15 lines
  each. Same scenario in both, so the reader sees only the change.
- Write in English, like the rest of the repo.

## What the model receives

`targets.json` decides the rendering. Nothing only the author or the build needs (frontmatter,
`sources`) is rendered (D12–D16).

| Option | Values | Default |
| --- | --- | --- |
| `kind` | `skill-index`: an index block in a hand-written SKILL.md plus the rules file. `knowledge-skill`: a whole generated background skill for agents | required |
| `layout` | `single`: one `references/rules.md` per skill. `per-rule`: one file per note, for large sets read rarely | `single` |
| `profile` | `full`: Rule, Why, Incorrect, Correct. `lean`: the same without Incorrect unless `critical`. `compact`: as lean, with only the first sentence of Why. Use the smaller ones only when `maxLines` binds | `full` |
| `inline` | Lowest impact a knowledge skill puts in its own SKILL.md; the rest go to the rules file in full | `high` |
| `maxLines` | Line budget for a generated knowledge skill, which agents preload whole | 300 |

## Keep it true

- Never edit a generated file (`references/rules.md`, `references/rules/*`, the block between
  `BEGIN:knowledge` and `END:knowledge`, a generated knowledge skill). `check` fails on it and
  tells a stale rendering from one edited by hand.
- To retire a note, delete it and fix whatever `implements` it. `validate` reports the dangling
  references.

## Commands

| Command | What it does |
| --- | --- |
| `new <path>` | Scaffold a note |
| `validate` | Check every note against this guide |
| `build` | Write every target in `targets.json` |
| `check` | Rebuild in memory and fail if anything on disk differs. CI runs this |
| `coverage` | List principles whose `expects` has no implementation yet |

Every command takes `--root <dir>` (default: the current directory) pointing at the repo root.

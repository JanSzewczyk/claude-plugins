# Design decisions: shared knowledge base

Why the knowledge base works the way it does. Each entry records the decision, the evidence behind
it, what was rejected, and what would make it worth revisiting. Read the entry before changing the
behaviour it covers. A change that reverses a decision updates the entry here, with a dated
"Superseded" line, in the same change.

Decided 2026-10-27, from research, a PoC and an A/B run. The plan, the PoC and the A/B harness
(`poc/ab/…` below) stayed in the design workspace when the system moved into this repository on
2026-10-27; the numbers quoted here are their results. At that time `storybook-testing` was the
Storybook skill; it has since become `create-stories`.

## Contents

- [D1 Plain files, not RAG](#d1-plain-files-not-rag)
- [D2 Knowledge, procedures and roles are separate things](#d2-knowledge-procedures-and-roles-are-separate-things)
- [D3 One source in knowledge/, delivered as generated copies](#d3-one-source-in-knowledge-delivered-as-generated-copies)
- [D4 One decision per file; the path is the id; the folder is the type](#d4-one-decision-per-file-the-path-is-the-id-the-folder-is-the-type)
- [D5 Principles and rules, linked by implements and expects](#d5-principles-and-rules-linked-by-implements-and-expects)
- [D6 Layers in folders, applicability in one applies list](#d6-layers-in-folders-applicability-in-one-applies-list)
- [D7 Every frontmatter key has a consumer](#d7-every-frontmatter-key-has-a-consumer)
- [D8 The repo's flat frontmatter dialect, no YAML dependency](#d8-the-repos-flat-frontmatter-dialect-no-yaml-dependency)
- [D9 Notes hold decisions, not API facts](#d9-notes-hold-decisions-not-api-facts)
- [D10 Fixed sections; the failure goes in the first sentence of Why](#d10-fixed-sections-the-failure-goes-in-the-first-sentence-of-why)
- [D11 Impact decides what an agent always has in context](#d11-impact-decides-what-an-agent-always-has-in-context)
- [D12 One central targets.json](#d12-one-central-targetsjson)
- [D13 Nothing the model does not use is rendered](#d13-nothing-the-model-does-not-use-is-rendered)
- [D14 One rules.md per skill, indexed from SKILL.md](#d14-one-rulesmd-per-skill-indexed-from-skillmd)
- [D15 Agents get knowledge passively, through preloaded knowledge skills](#d15-agents-get-knowledge-passively-through-preloaded-knowledge-skills)
- [D16 Profile full is the default](#d16-profile-full-is-the-default)
- [D17 check rebuilds and byte-compares; stamps tell stale from hand-edited](#d17-check-rebuilds-and-byte-compares-stamps-tell-stale-from-hand-edited)
- [D18 Unfinished notes are blocked by {{TODO}}, not by the word TODO](#d18-unfinished-notes-are-blocked-by-todo-not-by-the-word-todo)
- [D19 Extraction is the main way to write notes](#d19-extraction-is-the-main-way-to-write-notes)
- [D20 Languages: one skill per workflow, one knowledge skill per language](#d20-languages-one-skill-per-workflow-one-knowledge-skill-per-language)
- [D21 The tooling is a skill in knowledge-dev, zero dependencies](#d21-the-tooling-is-a-skill-in-knowledge-dev-zero-dependencies)
- [D22 An agent preloads the procedure it runs and the knowledge it applies](#d22-an-agent-preloads-the-procedure-it-runs-and-the-knowledge-it-applies)
- [D23 Plugins by technology, layered, with an agnostic testing core](#d23-plugins-by-technology-layered-with-an-agnostic-testing-core)
- [Open questions](#open-questions)

## D1 Plain files, not RAG

**Decision.** Knowledge is curated Markdown in the repo. No embeddings, no vector store, no
retrieval server.

**Why.** Every skill or agent needs a few to a few dozen rules, far below the ~200k tokens below
which Anthropic says a knowledge base can simply be put in context. Claude Code itself finds code
by agentic search (glob, grep) and treats folder structure and file names as the index. A vector
index is a second copy of the knowledge that drifts from the files, and drift is the problem this
system exists to solve. Files also work unchanged in Codex, Cursor and Gemini CLI.

**Evidence.** Anthropic, [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
(the 200k threshold); [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
(just-in-time retrieval, structure as signal); Cline,
[Why Cline doesn't index your codebase](https://cline.bot/blog/why-cline-doesnt-index-your-codebase-and-why-thats-a-good-thing).
The counter-evidence, [Cursor's semantic search](https://cursor.com/blog/semsearch), applies to
codebases of 1,000+ files, not curated rules.

**Rejected.** A RAG server over MCP: hosting, an index to keep in sync, no portability.

**Revisit when** the base has to absorb thousands of pages of external documentation. For library
docs, use Context7 or `llms.txt` first ([D9](#d9-notes-hold-decisions-not-api-facts)).

## D2 Knowledge, procedures and roles are separate things

**Decision.** A note says what is true ("query portal content through `screen`"). A skill says how
to do a task step by step. An agent says who does it and within which limits. Skills and agents
point at notes; they never restate them.

**Why.** Rules restated in several places drift. Before this system, one agent told the model to
call `.build()` / `.buildMany()` on a builder while the skill and another agent said `.one()` /
`.many()`.

**Evidence.** Anthropic, [Skills explained](https://claude.com/blog/skills-explained): when several
agents need the same expertise, put it in a skill rather than in each agent. Next.js keeps framework
knowledge in bundled docs and uses skills only for workflows
([AI agents guide](https://nextjs.org/docs/app/guides/ai-agents)).

## D3 One source in knowledge/, delivered as generated copies

**Decision.** Notes live once, in `knowledge/` at the repo root. `knowledge.mjs build` writes the
copies each skill needs inside that skill's own folder.

**Why.** An installed plugin is copied into `~/.claude/plugins/cache/…`; files outside the plugin
are not copied, and component paths that escape the plugin root are rejected. A link to
`../../knowledge/x.md` therefore works in the repo and breaks for everyone who installs from
GitHub. Generated copies keep every skill self-contained, as the Agent Skills spec expects, which
also makes skills portable to other tools.

**Evidence.** Claude Code docs, [plugin loading](https://code.claude.com/docs/en/plugins/loading.md)
and [host-marketplace](https://code.claude.com/docs/en/plugins/host-marketplace.md);
[Agent Skills specification](https://agentskills.io/specification). Same pattern as Prisma
`skills sync` (one source, stamped copies) and Vercel `react-best-practices` (rules compiled by a
build).

**Rejected.**
- *Relative links out of the plugin*: broken after install.
- *Symlinks*: Claude Code dereferences symlinks within one marketplace when it caches a plugin, so
  they would work, but they give no per-skill subsets, no index and no rendering, and other tools
  do not understand them.
- *Plugin `dependencies` alone*: they install another plugin, but give no way to read its files.

## D4 One decision per file; the path is the id; the folder is the type

**Decision.** One note = one decision = one file. The path under `knowledge/` without `.md` is its
id. A `principles` segment in the path makes it a principle; anything else is a rule.

**Why.** Small files give readable diffs, obvious duplicates, per-note selection by language and
framework, and `implements` links. An `id` or `type` key would only repeat what the path already
says, and a repeated value can disagree.

**Rejected.** One big file per domain: it cannot be filtered per language or per skill. The
model never sees the small files anyway ([D14](#d14-one-rulesmd-per-skill-indexed-from-skillmd)).

## D5 Principles and rules, linked by implements and expects

**Decision.** A principle holds in every language and framework; a rule is concrete code in one
stack. A rule that carries out a principle names it in `implements`. A principle lists in
`expects` the languages or frameworks that should each have an implementation, and `coverage`
reports the gaps.

**Why.** It lets one decision ("set every value the test asserts on explicitly") reach TypeScript
and Python alike, and makes missing implementations visible as a to-do list instead of a surprise.

## D6 Layers in folders, applicability in one applies list

**Decision.** Folders go from general to specific: `domain/[concept]/[language]/[library]/[framework]`,
only as deep as a note needs. What a note applies to is one `applies` list of languages,
frameworks and libraries, resolved against the controlled, disjoint vocabulary in
`knowledge.config.json`. Empty means "any".

**Why.** The folder says where a note lives; `applies` says where it is valid. Without the split,
a note valid for React and Vue would have to live in two folders. A controlled vocabulary stops
`ts` / `typescript` / `TS` from splitting the base. The vocabularies must not overlap, so a single
list can still be resolved into languages, frameworks and libraries.

**Rejected.** Three separate keys (`languages`, `frameworks`, `libraries`): more keys, same
information.

## D7 Every frontmatter key has a consumer

**Decision.** Keys: `title`, `summary`, `impact`, `applies`, `implements`, `expects`, `sources`.
Nothing else.

| Key | Read by |
| --- | --- |
| `title`, `summary` | renderings and index rows |
| `impact` | ordering and what agents get inline ([D11](#d11-impact-decides-what-an-agent-always-has-in-context)) |
| `applies` | target selection |
| `implements`, `expects` | `coverage` |
| `sources` | the author re-checking a note; never rendered |

**Dropped.** `id` and `type` (the path says it, [D4](#d4-one-decision-per-file-the-path-is-the-id-the-folder-is-the-type)),
`tags` (nothing read them; search the text), `verified` (nothing acted on it).

**Revisit `verified`** when a `stale` command exists that lists notes to re-check after a library's
major release. Until then, git history shows when a note changed, though not when it was last
re-checked without a change.

## D8 The repo's flat frontmatter dialect, no YAML dependency

**Decision.** `key: value` lines, lists inline as `[a, b]`, nothing nested. The parser rejects
anything else rather than guessing.

**Why.** The repo's other scripts (`check-skill.mjs`, `check-marketplace.mjs`) read the same
dialect without dependencies. One dialect in the repo, and no `package.json` to add for a YAML
parser.

## D9 Notes hold decisions, not API facts

**Decision.** A note records a convention or a judgement. Signatures, options and other API facts
come from the library's docs through Context7, `llms.txt` or docs bundled with the package.

**Why.** API facts go stale on the next major release; decisions don't. The old
`storybook-testing/references/api-reference.md` (375 lines of vendor API) is exactly the kind of
content that rots.

## D10 Fixed sections; the failure goes in the first sentence of Why

**Decision.** `## Rule` (one to three imperative sentences), `## Why` (the failure a reader would
recognise, in the first sentence), `## Incorrect` and `## Correct` (the smallest code showing the
difference, same scenario in both), optional `## Exceptions`. Principles may omit the code
sections. No other sections: the renderer knows only these.

**Why.** Anthropic's prompting guidance: explaining why an instruction matters lets Claude
generalise from the explanation, and the `skill-creator` skill treats bare ALWAYS/NEVER as a
warning sign. Measured cost: Why is about 55 tokens per note. The A/B
([D16](#d16-profile-full-is-the-default)) found no gain from cutting it.

**Evidence.** [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
("Claude can generalize from the explanation").

## D11 Impact decides what an agent always has in context

**Decision.** `critical`: breaking it produces wrong results silently. `high`: a common mistake
that costs real time. `medium`: readability or consistency. `low`: style. Knowledge skills inline
`critical` and `high` (configurable with `inline`); the rest sit one file away.

**Why.** Agents preload a knowledge skill whole, so its size is a budget. Fixed definitions keep
the level from being a matter of taste.

## D12 One central targets.json

**Decision.** `knowledge/targets.json` lists every consumer: which skill, which notes (globs plus
`where` facets), which kind, layout and profile.

**Why.** A manifest per skill folder would be a stray file that `skill-audit` flags as an orphan,
and nobody could see in one place which skills a note reaches.

**Rejected.** A `knowledge.yaml` next to each SKILL.md.

## D13 Nothing the model does not use is rendered

**Decision.** Renderings carry no frontmatter and no sources: a heading with the title, one line
`impact · applies`, then the sections as labelled paragraphs.

**Why.** In the first PoC, copied frontmatter was about 25% of the tokens the model received, more
than the whole Why section, and the model did nothing with it.

## D14 One rules.md per skill, indexed from SKILL.md

**Decision.** Layout `single` (default): one `references/rules.md` per skill with a table of
contents. A `skill-index` target also writes a one-line-per-rule index into the hand-written
SKILL.md, between `<!-- BEGIN:knowledge -->` and `<!-- END:knowledge -->`. Layout `per-rule` is for
large sets read rarely. Missing markers are an error, never a silent append.

**Why.** Same quality for a third of the work. A layout A/B (`poc/ab/layout.mjs`, 2026-10-27)
gave headless Sonnet the `storybook-testing` skill the way Claude Code delivers an invoked skill
(SKILL.md body plus its base directory) and counted every file it read:

| | per-rule (11 files) | single (`rules.md`) |
| --- | --- | --- |
| Score | 11/11 in 6 of 6 runs | 11/11 in 6 of 6 runs |
| Runs that read references | 6/6 | 6/6 |
| Reference reads per run | 10.3 | 1 |
| Share of the rule text read | 96% | 100% |
| Turns per run | 16.5 | 6.3 |
| Time per run | 29.3 s | 19.5 s |
| Output tokens per run | 4115 | 2666 |
| Cost per run | $0.118 | $0.096 |

With one file per note the model opened nearly every file anyway, one tool call each, so it paid
ten extra turns for the same text. It skipped only notes it judged irrelevant (the builder reset
rule in 3 of 6 runs), which might matter for a much larger set; that is what `per-rule` is kept for.
Context consumed per session was about the same in both (~150k, mostly the harness's own prompt).
Links from SKILL.md stay one level deep, as the skill authoring best practices ask, and a table of
contents covers files over 100 lines. The marker block is the same pattern Next.js uses for its
managed section in `AGENTS.md`.

**Corrected 2026-10-27.** The first version of this entry gave two reasons the A/B does not
support. "Models often skip on-demand reads": here both layouts read their references in every
run. "23% fewer tokens (3798 → 2923)": that drop came almost entirely from removing frontmatter
([D13](#d13-nothing-the-model-does-not-use-is-rendered)), measured in the same change, not from
merging files.

**Evidence.** The layout A/B above (results in `poc/ab/results-layout/`);
[skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices);
Vercel `react-best-practices` compiles its rule files into one document.

**Revisit when** a skill has far more notes than it needs per task; then selective reading in
`per-rule` may beat reading one long file.

## D15 Agents get knowledge passively, through preloaded knowledge skills

**Decision.** For each domain and language there is a generated knowledge skill with
`user-invocable: false` (`storybook-rules`, `builder-rules-ts`, `builder-rules-py`). Agents preload
it with `skills:` instead of preloading full procedure skills. Its SKILL.md has a line budget
(`maxLines`, default 300) and a description limit of 1024 characters.

**Why.** Vercel's eval: a docs index always in context scored 100%, a skill the agent had to
decide to invoke 53% (it never invoked it in 56% of cases). `skills:` injects the full skill at
startup, so it is the Claude Code form of always-in-context knowledge, and it is why the size must
be capped. In our own A/B, preloaded knowledge took Sonnet from 3.67/11 to 10.3 to 11 out of 11.

**Evidence.** [Vercel, AGENTS.md outperforms skills](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
(vendor eval, no variance reported); Claude Code docs,
[sub-agents](https://code.claude.com/docs/en/sub-agents.md) and
[skills](https://code.claude.com/docs/en/skills.md) (`user-invocable: false` is the documented
background-knowledge pattern).

**Consequences.** The repo's SKILL.md contract allows an optional `user-invocable` (done
2026-10-27, a major bump of `plugin-dev`). Agents that preload skills from another plugin declare it
in `dependencies`. Which skills an agent preloads besides the knowledge skills: D22.

## D16 Profile full is the default

**Decision.** `full` renders Rule, Why, Incorrect and Correct. `lean` drops Incorrect unless the
note is critical. `compact` additionally keeps only the first sentence of Why. The default is
`full` everywhere; use the others only when `maxLines` binds.

**Why.** A/B with headless Sonnet (`poc/ab`), one component with a portalled dialog, 11 regex
checks, one per note:

| Profile | Runs | Mean | Knowledge tokens |
| --- | --- | --- | --- |
| none | 3 | 3.67/11 | 0 |
| full | 9 | 11/11 | 3045 |
| lean | 6 | 10.83/11 | 2769 |
| compact | 9 | 10.3 to 11/11 | 2470 |

Every miss (3 in 15 trimmed runs, 0 in 9 full runs) was the same subtle defect: asserting a dialog
is absent with `canvas.queryByRole("dialog")`, which always passes because `canvas` never sees the
portal. That is the case the note's Incorrect example shows; `lean` kept the whole Why and still
missed once. The difference is not significant at this sample size, but `full` costs only about
575 more tokens and was the only profile without a miss.

**Revisit when** a broader A/B (more components, more runs, `skill-ab-optimizer`) shows the
trimmed profiles hold up, or when budgets bind.

## D17 check rebuilds and byte-compares; stamps tell stale from hand-edited

**Decision.** `check` builds in memory and compares every generated file byte for byte. Each
generated file carries a stamp: a hash of its notes and its target. Equal stamps with different
text mean "edited by hand"; different stamps mean "stale". Files the build owns but no longer
produces are "left behind". Invalid notes are reported apart from drift. Output is deterministic:
sorted, no dates.

**Why.** Drift is the failure this system exists to prevent, so CI must catch it, and the message
must say whether to rebuild or to move an edit back into a note.

## D18 Unfinished notes are blocked by {{TODO}}, not by the word TODO

**Decision.** The template's placeholders are `{{TODO}}`; `validate` rejects them. The plain word
TODO is allowed.

**Why.** The first version rejected the word TODO, which would have blocked legitimate notes whose
examples contain `// TODO:`.

## D19 Extraction is the main way to write notes

**Decision.** Notes are mostly extracted from existing SKILL.md and agent files, not written from a
blank page. Extraction merges into existing notes and stops on a contradiction, such as
`.build()` versus `.one()`, until the user says which is right.

**Why.** The rules already exist as prose in the skills; the risk is duplicating them or
silently picking one side of a conflict.

## D20 Languages: one skill per workflow, one knowledge skill per language

**Decision.**
- A concept whose workflow is the same in every language stays one skill that detects the stack
  (`builder-factory` reads `package.json` or `pyproject.toml`, then only that language's rules).
  Not built yet: as of 2026-10-27 `builder-factory` covers TypeScript and `mimicry-js` only.
- A different workflow gets its own skill, named after the tool (`vitest-unit-testing`,
  `pytest-testing`), so routing never has two candidates for "unit test".
- Agents preload one knowledge skill per language (`builder-rules-ts`, `builder-rules-py`),
  generated from the same notes with different filters; principles reach both.
- ~~The `testing` plugin stays one plugin for both languages until routing evals start confusing
  them or skill descriptions from the other language cost too much (about 100 tokens each per
  session).~~ Superseded 2026-10-27 by D23: language-specific skills live in the language's plugin
  (`builder-rules-ts` in `typescript`, `builder-rules-py` in `python`); a skill moves to the
  technology-agnostic `testing` core only once it really serves every stack (`builder-factory` is
  TypeScript-only today, so it lives in `typescript`).

**Why.** Copying a skill per language would copy the drift problem; a filter is free.

## D21 The tooling is a skill in knowledge-dev, zero dependencies

**Decision.** `knowledge.mjs` lives in `plugins/knowledge-dev/skills/knowledge-author/scripts/`,
takes the repo root as `--root`, and uses only Node built-ins (Node 22+, the version CI uses).

**Why.** It mirrors how `marketplace-doctor` ships its script, so moving the PoC into the repo is a
copy, and the repo needs no `package.json`.

**Consequences.** The tests run against `tests/fixture/`, a frozen copy of the PoC notes, targets
and the two hand-written skills they fill, not against the repository's own notes: assertions about
specific notes (the coverage gaps, which files a build writes) would otherwise break every time a
rule is added. The fixture holds inputs only; a test that needs generated files builds them first.
One test checks that the repository's own renderings are current.

## D22 An agent preloads the procedure it runs and the knowledge it applies

**Decision.** An agent's `skills:` lists the procedure skill it executes end to end (for
`storybook-tester`, `create-stories`) plus the knowledge skills whose rules it must always apply
(`storybook-rules`, `builder-rules-ts`). A full procedure skill the agent only consults, such as
`builder-factory` for an agent that uses builders but is not asked to design them, is replaced by
its knowledge skill.

**Why.** Plugin agents get no `Skill` tool in their `tools:`, so a procedure they must follow can
only reach them as a preload, and dropping it would leave the agent without its steps. Knowledge,
on the other hand, has to be passive (D15), and a full skill preloaded only for its rules costs its
whole workflow in context.

**Cost.** The procedure skill's own index block and the knowledge skill's inlined rules overlap:
for `storybook-tester`, about 18 index rows on top of the inlined critical and high rules. Revisit
if a preload budget binds; the fix would be a target option that renders the index without the
rules a preloaded knowledge skill already carries.

## D23 Plugins by technology, layered, with an agnostic testing core

**Decision.** Plugins group skills and agents by technology, not by domain. Technology plugins are
named from the `knowledge.config.json` vocabulary and form layers that depend only downward:
`testing` (technology-agnostic core) ← `typescript` ← `react` ← `nextjs` ← `firebase`, with `design`
(no agents, so no dependencies) under `react` and `nextjs`, and `python` standalone.
- A skill lives in the most general plugin whose stack it needs: Vitest in `typescript`, Storybook in
  `react`, route handler tests in `nextjs`, Playwright in `testing`. A skill counts as
  agnostic only for what it does today, not what a decision plans for it: `builder-factory` is in
  `typescript` because it covers only TypeScript.
- An agent lives in the lowest plugin from which every preload points into its own plugin or down.
  A preload that would point up is dropped (D22) or the agent moves up a layer: `frontend-expert`
  and `library-updater` dropped theirs; `code-reviewer`, `performance-analyzer` and
  `testing-strategist` moved to `nextjs`.
- Plugins that serve any stack (`code-quality`, `git-workflow`, `plugin-dev`, `skill-dev`,
  `knowledge-dev`, `shared-rules`, `product-management`, `ai-tools`) stay grouped by purpose.

**Why.** Grouping by domain assumed one stack: `testing` mixed Vitest, Storybook, a Next.js route
tester and a Python knowledge skill, and a Python user had to install all of it. With layers, a new
technology is a new plugin, and installing one pulls in exactly the layers under it. The ban on
mutual plugin dependencies already forces a direction; tying it to the technology stack makes the
direction predictable.

**Rejected.** Dissolving `testing` completely: Playwright would land in `typescript`, which a
Python project would then have to install. Keeping `testing` whole (the old
D20 bullet): it is the plugin a second language breaks first.

**Cost.** Namespaces changed (`testing:unit-tester` is now `typescript:unit-tester`), a breaking
change for anything that names agents with their plugin prefix. The root README carries the
old-to-new table.

## Open questions

Verified neither in the PoC nor in the docs. Settle before relying on them:

- Does `skills:` in a plugin agent resolve a skill from another plugin by bare name, or does it need
  `plugin:skill`? (plan, spike 0a)
- Does `skills:` really load a generated knowledge skill in a live session? The A/B simulated the
  preload with an appended system prompt.
- Can an agent that preloads a knowledge skill open the `references/rules.md` its injected SKILL.md
  links to? D11 and D15 assume the medium and low rules are one file away; if the relative link does
  not resolve for a preloaded skill, those rules never reach the agent.
- Is CSF Next (`preview.meta`, `.test()`) supported by the Vue renderer? Decides how much of the
  Storybook knowledge Vue shares. (plan, spike 0d)
- The `rules-file` target (notes rendered into `.claude/rules/*.md` for `sync-rules`) is designed
  but not built.

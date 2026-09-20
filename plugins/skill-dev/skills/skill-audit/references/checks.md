<!-- Authoring constraint: every message quoted here must sit inside backticks. The script blanks
     fenced blocks and inline code spans before running any prose regex, so a message quoted as
     bare prose would make this file flag itself for shouting, Polish or time-sensitive wording. -->

# What each check means, and how to repair it

Grouped by the scope the script prints. Every check here is a fact about bytes on disk — none of
them involve judgement about whether the skill is *good*, only whether it is built the way the
runtime needs it to be. The judgement half lives in `rubric.md`, the other file this skill
carries; both are linked from `SKILL.md`, and neither needs the other to be read first.

## Contents

- Severity, and what fails a run
- `frontmatter` — the contract that decides whether the skill loads at all
- `budget` — progressive disclosure
- `links` — the graph Claude walks
- `prose` — the three signals that survive being measured
- `scripts` — bundled executables
- Metrics, and why they are not issues

---

## Severity, and what fails a run

`error` means the skill is broken or will misbehave: a contract violation, a dead link, a
reference nothing can reach. `warn` means it works but degrades. A run exits 1 on any `error`,
and on warnings too under `--strict`.

There is no ignore file, by the same reasoning `marketplace-doctor` uses: a check that needs
silencing is a check that should be demoted to a metric or deleted. If one of these fires on
something you meant, the check is wrong — say so rather than working around it.

---

## `frontmatter` — the contract that decides whether the skill loads at all

The `name` and `description` are the only things in context before the skill fires. Everything
in this section is therefore load-bearing in a way the body is not.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `SKILL.md has no YAML frontmatter` | The opening `---` is not the file's first line, so the runtime reads the whole file — markers included — as skill content. The skill has no name and no description, and never triggers. | Move the frontmatter to the top. Check for a BOM or a blank first line. |
| `frontmatter carries keys outside the four-field contract: <keys>` | This repo locks `SKILL.md` frontmatter to `name`, `description`, `allowed-tools`, `argument-hint`. Anything else is rejected on upload to claude.ai and by the Skills API. | Delete the key. If it was `version`, the version lives in the plugin's `plugin.json`, not here. |
| `frontmatter keys are out of order: <keys>` | Cosmetic in the runtime, enforced here so every skill in the repo reads the same way. | Reorder to `name`, `description`, `allowed-tools`, `argument-hint`. |
| `frontmatter name "<x>" does not match the folder "<y>"` | The folder name is what becomes the slash command; the `name` field is what the listing shows. Disagreement means the command and the label are two different strings. | Rename whichever one is wrong — usually the field, since renaming the folder breaks existing links. |
| `name "<x>" is not lowercase kebab-case` | Lowercase letters, digits and single hyphens only. Leading, trailing and consecutive hyphens are rejected. | Rewrite the name. Prefer a gerund (`processing-pdfs`) or a verb phrase (`create-commit`). |
| `name "<x>" is <n> characters — the limit is 64` | Hard limit. | Shorten it. |
| `name "<x>" contains the reserved word "<w>"` | `anthropic` and `claude` are reserved in skill names and rejected by claude.ai. | Drop the word — it carries no information anyway, since every skill here runs under Claude. |
| `SKILL.md has no description — the description is the only thing loaded until the skill fires` | Without it the model has nothing to match a request against. The skill exists and is invisible. | Write one: what it does, then when to use it. |
| `description is <n> characters — the limit is 1024` | Over the limit the description is rejected by the Skills API and truncated elsewhere — the trigger clause at the end is usually what gets cut. | Cut the *what*, keep the *when*. Implementation detail belongs in the body, which costs nothing until the skill fires. |
| `description is written in the first or second person: "<match>"` | The description is injected into the system prompt. A first- or second-person voice there reads as instructions to the model rather than a statement about a capability, and discovery suffers. | Rewrite in third person: `Audits one skill…`, never `I can audit…` or `You can use this to…`. |
| `description never says when to use the skill` (warning) | Two weak signals ANDed: no trigger marker, and short enough that it cannot be implying one. Claude under-triggers by default, so a description that only says *what* will sit unused. | Add the contexts and the phrasings a user would actually type. Being a little pushy is correct here. Exclusion clauses (`NOT for X, use Y`) help as much as positive triggers. |
| `frontmatter has no argument-hint but the body documents an argument` (warning) | The body reads `$ARGUMENTS`, but the slash-command menu shows nothing about what to pass. | Add `argument-hint` with a bracketed phrase describing the argument. |

The person check uses a closed list of six literal phrases and runs against the description only.
Quoted trigger phrasings elsewhere legitimately contain `you`, which is why it is not a general
person detector.

---

## `budget` — progressive disclosure

The body enters the conversation when the skill fires and **stays there for the rest of the
session** — the runtime does not re-read it on later turns. That is why the budget is not
advisory, and why the body should read as standing instructions rather than as steps to perform
once.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `SKILL.md body is <n> lines — the budget is 500` (warning) | Past this the body starts crowding out conversation history and other skills' metadata for the whole session. | Move detail into `references/` and point at it from the body. Bundled files cost nothing until read. |
| `SKILL.md body is roughly <n> tokens — the budget is 5000` (warning) | Same failure, measured the way the context window actually charges for it. Line count and token count disagree when the body is mostly code blocks or mostly tables. | As above. A body over budget on tokens but not on lines is usually carrying an example that belongs in a reference file. |
| `SKILL.md has no H1 title` (warning) | Nothing orients a reader who opens the file. | Add one H1 naming the skill. |
| `heading "<h>" has no content before the next heading` (warning) | A heading with nothing under it costs tokens and promises something the file does not deliver. A heading whose next heading is *deeper* is a parent of subsections and is not flagged. | Write the section, or delete the heading. |
| `duplicate heading "<h>" at lines <a> and <b>` (warning) | Two sections with one name; a reader cannot tell which one an instruction meant, and neither can the model. | Rename one, or merge them. |

---

## `links` — the graph Claude walks

Claude navigates the skill directory like a filesystem. When a file is referenced from another
referenced file, it may be previewed with a partial read rather than read in full — which is why
depth matters more than tidiness here.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `link target does not exist: <path>` | A dead link. The model follows it, gets nothing, and continues without the content the body promised. | Fix the path or delete the link. Links pointing outside the skill directory, template placeholders such as `{author-url}`, and illustrative targets such as `(url)` are skipped, so a hit here is a real file that is missing. |
| `<path> is only reachable through <other> — two hops from SKILL.md` | The nested-reference failure. Claude previews files reached this way with commands like `head -100`, so it reads part of the file and proceeds as though it read all of it. | Link it directly from `SKILL.md`. All reference files should be one hop away. |
| `path uses backslashes: <text>` | A Windows path in prose. Forward slashes work on every platform; backslashes break on Unix. | Rewrite with forward slashes. |
| `<file> links sideways to <other>` (warning) | One reference file links to another, which is what creates the two-hop read even when both are also linked from `SKILL.md`. | Make each reference file readable cold. Repeat the one fact it needed, or merge the two files. |
| `<path> is not linked from SKILL.md or from any file SKILL.md links` (warning) | An orphan. Nothing reads it today — it is documentation that exists only for whoever browses the folder. | Link it where it is needed, or delete it. A file counts as reached when it is linked *or* named, so a script invoked as `node scripts/x.mjs` in a fenced block is not an orphan. |
| `<file> is <n> lines with no table of contents` (warning) | A preview reads the top of the file. The published guidance is 100 lines; the trigger here is 200, because that is where the reader starts seeing under half the file and a contents list begins carrying real weight. | Add a short contents list at the top — three or more items, or a heading containing `Contents`. |
| `filename "<f>" does not say what it contains` (warning) | Names like `doc2.md` or `notes.md` force a read to find out what the file is for. | Rename after the content: `form-validation-rules.md`. |
| `the reference block lists <file>, which the body already links at line <n>` (warning) | The pointer blockquote at the top is an index. A target listed there *and* linked again in the body is paid for twice, and the blurb in the header describes a file the reader has not reached yet. | Pick one. Either drop the header entry and keep the link where the reader needs it, or keep the block as the only index and drop the inline link. |

The last one is narrow on purpose: the header link counts as redundant **only** when the same
target is linked again from the body. Whether a blurb would read better as prose at the point of
use is a judgement call, and belongs to the probe layer.

---

## `prose` — the three signals that survive being measured

Most prose defects need a reader. These three do not, and each one is scoped tightly enough to
stay quiet on the cases that look similar but are fine.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `<n> all-caps imperatives in <file> — <k> per 50 lines` (warning) | Shouting substitutes for explanation. A body that leans on capitals is usually one where the reasoning was never written down, so the model follows the rule without understanding when it stops applying. | State why instead. Density is the signal here — the check never names a single line, because a lone justified `NEVER` is fine and flagging it is how a linter teaches people to ignore it. The probe layer names the unearned instances. |
| `time-sensitive phrasing at <file>:<n>: "<match>"` (warning) | A skill has no idea what day it is. Wording like `currently` or `latest version` is written true and read later, when it is false. | Move superseded guidance into a collapsed `Old patterns` section and state the current method plainly. |
| `<file> line <n> repeats a paragraph from <other> line <m>` (warning) | The same paragraph in two files means the context pays twice for one idea, and the two copies drift. | Say it once, link to it. |
| `<file>:<n> looks like Polish, not English: "<line>"` (warning) | A language intrusion. Skills are read by a model primed by an English system prompt, and a mixed-language file reads as two voices. | One language per skill. **Check first** whether the line is a quoted user phrasing or a domain proper noun — a skill about a Polish registry legitimately contains Polish, and so does a skill that lists Polish trigger phrases on purpose. Those are correct as they stand. |

The language check requires two Polish stopwords outside quotes, or three diacritics, in one
line. A single word is not enough: proper nouns and deliberately quoted phrasings would drown the
signal.

---

## `scripts` — bundled executables

A script costs nothing but its output, which makes it the cheapest thing a skill can carry. The
checks here are about whether it can actually be run.

| Message | What actually broke | Repair |
| --- | --- | --- |
| `<script> has no shebang` (warning) | The file cannot be executed directly, only handed to an interpreter. | Add `#!/usr/bin/env node` or the equivalent. |
| `<script> imports "<pkg>", which is not a Node builtin` (warning) | A skill script cannot assume an install step ran. The import throws, and the skill degrades to whatever the model improvises. | Rewrite with builtins, or state the install command in `SKILL.md` and say what happens if it is missing. |
| `SKILL.md never says whether to run or read <script>` (warning) | The script is named but the instruction is ambiguous, so the model may read it into context — paying for every line — when executing it would have cost only the output. | Write `Run <command>` for execution, or `See <file> for the algorithm` when the code is the documentation. Execution is usually what you want. |

---

## Metrics, and why they are not issues

`--json` carries a `metrics` block that never appears in the text report and never affects the
exit code: description length and sentence count, heading and link counts, shouting density,
language suspects, synonym-group frequencies, undocumented numeric literals in scripts, and a
per-reference-file summary.

These are the rules that look checkable and are not. A synonym-group count tells you the file
says `endpoint` seven times and `route` four times; whether that is inconsistent terminology or
two different things needs a reader. An undocumented numeric literal is sometimes a voodoo
constant and sometimes an HTTP status. Emitting them as warnings would produce a report nobody
finishes, so they are emitted as evidence for the probe layer instead.

The rule that governs the whole script: **it reports an issue only when the defect is a fact
about bytes.** One noisy check discredits the other twenty-nine.

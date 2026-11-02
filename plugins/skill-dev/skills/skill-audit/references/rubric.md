<!-- Authoring constraint: quote every literal message and every example of bad wording inside
     backticks or a fenced block. The script blanks code before running its prose regexes, so an
     example written as bare prose would make this file flag itself. -->

# The judgement rubric

What a reader can see and a regex cannot. Each rule has an id; a probe cites it in its `rule:`
field so the merge step can tell two findings about the same defect apart from two findings that
merely share a line.

The deterministic half is in `checks.md`, the other file this skill carries. Nothing here repeats
it — if the script already reports a defect, it is not in this file.

## Contents

- How to weigh a finding
- `R1.*` — routing surface (probe P1)
- `R2.*` — standing instructions (probe P2)
- `R3.*` — prose and language (probe P3)
- `R4.*` — the bundle (probe P4)
- The progress-list block: the repair for `R2.progress-list`, when a list is needed, and what makes one fail
- What not to report

---

## How to weigh a finding

Two severities, and probes may use only these:

- `warn` — the skill works but degrades: it will misfire, mislead, or cost more than it returns.
- `polish` — taste. Wording, repetition, a link that adds nothing.

Probes never emit `error`. `error` means *broken on disk*, and only the script can know that.
Without this rule severity inflates until every finding is an error and the ordering stops
meaning anything.

A finding earns its place when a reader could act on it today. `this section could be clearer`
is not a finding; `these three sentences say the same thing, keep the second` is.

---

## `R1.*` — routing surface

The description decides whether the skill ever fires. It is the only part loaded before the
skill triggers, and it competes for attention with every other skill's description.

| Rule | What to look for |
| --- | --- |
| `R1.specificity` | Does the description name concrete triggers — file extensions, tool names, verbs, phrasings a user would actually type? A description that could describe four different skills will be picked for none of them. |
| `R1.pushiness` | Claude under-triggers. A description that only states a capability sits unused. The fix is an explicit invitation: name the situations, including ones where the user would not think to ask for this skill by name. |
| `R1.exclusion` | Does it say what it is *not* for, and where to go instead? Exclusion clauses cut false fires as effectively as triggers cause real ones, and they matter most where two sibling skills overlap. |
| `R1.overlap` | Compare against the other skills in the same plugin. If two descriptions would both match the same request, say which one should win and what wording would settle it. |
| `R1.what-vs-when` | The description carries both halves. If the *when* half is missing, the body cannot compensate — the body is not loaded yet. |
| `R1.hint-accuracy` | Does `argument-hint` describe what the body actually reads? A hint promising a path while the body expects a name is worse than no hint. |
| `R1.tools` | Does `allowed-tools` match what the workflow does? Note the semantics before judging: **`allowed-tools` grants permission, it does not restrict.** Omitting a tool does not remove it — it only means using that tool prompts for approval instead of running silently. Removal requires `disallowed-tools`, which this repo's four-field contract does not permit. So a missing tool is a friction question, and an over-broad list is a blast-radius question. |

---

## `R2.*` — standing instructions

The body enters the conversation once and stays for the session. It is read as a persistent
frame, not as a script executed top to bottom.

| Rule | What to look for |
| --- | --- |
| `R2.standing` | Does the body read as guidance that holds all session, or as one-time steps? `Now open the file and check X` ages badly by turn thirty; `X is checked against Y` does not. |
| `R2.freedom` | Does the specificity match the fragility? Open tasks with many valid routes want prose and a direction. Fragile or destructive ones want an exact command and a refusal to improvise. The failure runs both ways: a rigid procedure imposed on an open task makes the skill stupid, and a vague instruction over a destructive one makes it dangerous. |
| `R2.why` | Are rules explained or asserted? A rule with its reason attached survives the situation its author did not foresee; a bare imperative does not. This is the judgement half of the script's shouting-density warning — name the instances that were never justified. |
| `R2.default` | One recommended path with an escape hatch, or a menu of options? A list of five libraries with no default hands the choice back to the reader, which is the decision the skill existed to make. |
| `R2.shape` | Does the task have the structure it needs? Quality-critical work wants a validate → fix → repeat loop that ends only when validation passes. Destructive or batch work wants a verifiable intermediate artifact produced *before* any side effect. Note the shape that is missing, not the shape that is merely absent from a task that does not need it. Visible progress on multi-step work is `R2.progress-list`. |
| `R2.progress-list` | Does an ordered flow show its progress in a task list? Decide from the conditions in *The progress-list block* below; the script's `workflow` metric points at candidates and proves nothing. A skill that needs a list and has none is a `warn`, and the repair is that block filled in with the skill's own steps, ready to apply. A list that exists but fails one of the listed defects is a `warn` too, with the repair for that defect. |
| `R2.self-contained` | Can the workflow be followed without opening the reference files? If the body defers a decision to a file it never says to read at that moment, the reader has to guess. |
| `R2.contradiction` | Two instructions that cannot both be followed. Rare, expensive, worth a full read to find. |

---

## `R3.*` — prose and language

Every token in the body competes with conversation history for the whole session. The default
assumption is that the model is already competent: only context it does not have earns space.

| Rule | What to look for |
| --- | --- |
| `R3.known` | Paragraphs explaining what the model already knows — what a PDF is, what a library does, why testing matters. Cut them entirely rather than shortening them. |
| `R3.verbosity` | Sentences that restate the previous sentence, throat-clearing before an instruction, a preamble announcing what the section will cover. Quote the passage and give the replacement wording, not a note that it is long. |
| `R3.repetition` | The same idea in two places in the same file, or across a file and its references. The script catches identical paragraphs; near-duplicates are yours. |
| `R3.link-blurbs` | A link followed by a description of what is behind it, where the description says nothing the link text did not. This is the common shape of a generated pointer block: three links, three blurbs, and the blurbs are the file names in a sentence. Either the blurb says when to read the file — which is useful — or it should be deleted and the link moved to the point of use. |
| `R3.empty-section` | A section that exists because the template had one: a heading with two sentences of filler under it. |
| `R3.terminology` | One term per concept. Mixing `endpoint`, `URL` and `route` for one thing makes the reader resolve an ambiguity on every mention. The script's `synonymGroups` metric gives the counts; decide whether the mixing is real. |
| `R3.language` | One language per skill. The script flags suspect lines; decide whether each is a genuine intrusion or a legitimate quoted user phrasing or domain proper noun. A skill about a Polish registry contains Polish correctly, and so does a skill that lists Polish trigger phrases on purpose — say so plainly rather than proposing a rewrite. |

---

## `R4.*` — the bundle

A bundled file costs nothing until it is read, which makes the question *does it earn a read*,
not *does it cost anything*.

| Rule | What to look for |
| --- | --- |
| `R4.earns-it` | Would anything be lost if this file were deleted? A reference nobody would open, or one that restates the body, is a file to remove. |
| `R4.cold-read` | Can the file be understood by someone who opens it alone, one hop from the body, with no other context? That is how it will actually be read. |
| `R4.granularity` | Should two files be one, or one file be two? Split by what a task needs at once: a reader working on sales should not load the finance reference to reach the sales one. |
| `R4.toc-quality` | Where a contents list exists, does it describe the sections or merely list their titles? A contents list that repeats the headings adds nothing a preview would not show. |
| `R4.solve-dont-defer` | Does a bundled script handle its error conditions, or throw and leave the model to work it out? A script that fails with a bare stack trace has handed the problem back. |
| `R4.constants` | Check the script's `magicNumbers` metric. A number with no explanation that the reader cannot derive is a voodoo constant — but most entries are HTTP statuses, indices or obvious limits. Report only the ones where you could not work out the value's reason. |
| `R4.deps` | Does the script assume something is installed without saying so? |
| `R4.prerequisites` | A skill that bundles scripts, or whose text calls external tools (CLI commands, MCP servers, env vars), needs a `## Prerequisites` section in `SKILL.md` listing each one, a check command and how to install it. Missing section or an unlisted dependency is a `warn`. |
| `R4.execute-or-read` | At the call site, is it clear whether to run the file or read it? Running costs the output; reading costs every line. |
| `R4.mcp-names` | MCP tools referenced in prose need the fully qualified `ServerName:tool_name` form. Without the prefix the lookup fails when several servers are connected. |

---

## The progress-list block

A list lets the user follow a long run and see where it stopped. It costs a few calls, so it has to
be earned.

**A skill needs one** when a single run has three or more ordered steps and at least one of these
holds: a step has side effects (writes files, commits, pushes, deploys); the run is long; it pauses
for a user decision; it loops over items found at runtime; it invokes other skills.

**A skill does not need one** when it is background knowledge (`user-invocable: false`), when its
numbered items are alternatives, rules or examples rather than a sequence, or when it answers a
read-only question in a few calls. Do not report these.

**The repair** goes directly after the skill's introduction, before its first step. Fill in the
angle brackets and delete the bullets that do not apply:

````markdown
## Progress list

**Your first tool call in this skill creates the task list, before any command below.** <Why the user
needs it here, in one clause.> Keep it current to the last step. A one-line announcement in chat does
not replace it.

Use the task-list tool the session has: `mcp__ccd_turn__update_plan` in the Claude desktop app,
otherwise `TaskCreate` and `TaskUpdate`, or `TodoWrite`. Load it with `ToolSearch` first if it is only
listed as deferred. If the session has none of them, print the items as a Markdown checklist and
reprint it each time a step finishes.

Create it with these items, in the user's language:

```text
<one short imperative line per step>
```

- **One item in progress at a time.** Finish it when its step ends, and start the next in the same update.
- **After <step>,** replace `<placeholder item>` with one item per <unit found at runtime>.
- **While waiting for the user,** say so in the item: `<item>: waiting for your decision`.
- **Show the outcome when it isn't a plain success:** `<item>: rolled back`. A finished item must not
  read as if the step succeeded.
- **A step that won't run** stays on the list with the reason, rather than being deleted.
- **Skills invoked along the way** use this same list and add no list of their own.
````

**Defects in a list that already exists**, each with its repair:

| Defect | Why it fails | Repair |
| --- | --- | --- |
| The instruction sits inside a step or after the first command, or only says to track progress | The model starts working and never comes back to it. In a test of `update-deps`, `Create it before Step 0's first command` was loaded and skipped in the one run tried; `Your first tool call in this skill creates the task list` produced the list in both runs tried. A small sample, but cheap to follow. | Move it before the first step and use the block's opening sentence. |
| It names one tool only | Which tools exist depends on the model and the surface, so the instruction can fail silently. | Use the block's tool sentence, fallback included. |
| It tracks only part of the flow, such as one item per group | Nothing shows before the first group or after the last. | List every step. |
| Items are finer than the skill's steps, or are vague (`Do the work`) | The list stops being readable at a glance. | One short imperative line per step, and about twelve at most. |
| Items found at runtime never replace their placeholder | The longest stretch of the run shows as one item. | Add the `After <step>` bullet. |
| Failed, skipped or deferred steps end up looking done | A finished list then claims success the run did not have. | Add the outcome bullets. |

A Markdown checklist the skill tells the model to copy and reprint is the fallback, so on its own it
counts as naming one tool. A task-list tool missing from `allowed-tools` is not a finding here: that
list only pre-approves tools, and the question belongs to `R1.tools`.

Sources. [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices):
copyable checklists for complex workflows. [Todo tracking](https://code.claude.com/docs/en/agent-sdk/todo-tracking.md):
lists for three or more distinct actions, and completion meaning the task finished successfully.
[Tool reference](https://code.claude.com/docs/en/tools-reference.md#task-tool-availability): tool
availability by model. One item in progress at a time, and the item wording, are this repo's
conventions and do not come from the public documentation.

---

## What not to report

- Anything already in the script's `issues[]`. It is handed to you precisely so you can skip it.
- Anything outside your probe's ownership. The roster is exclusive so the merge step has a
  deterministic tiebreak; a finding filed against someone else's rule is dropped, not merged.
- Style preferences with no consequence — heading capitalisation, serial commas, table alignment.
- Speculation about runtime behaviour you cannot see in the files.
- A rewrite of the whole skill. Findings are local and actionable, or they are not findings.

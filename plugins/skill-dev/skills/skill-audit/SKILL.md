---
name: skill-audit
description: >-
  Audits one Claude Code skill for authoring quality — the frontmatter contract, whether the
  description will actually trigger, the progressive-disclosure budget, dead links and orphan
  reference files, prose economy, language consistency, and whether bundled scripts and
  references earn their cost, and whether a multi-step flow shows its progress in a task list.
  Use whenever the user asks to review, audit, tighten, trim, or clean up a skill, says a SKILL.md
  has grown bloated or rambling, wonders whether its reference files are still linked or whether
  anyone reads them, asks why a skill never fires, or wants to know what to cut before shipping
  it. Not for auditing a whole marketplace repo's manifests and
  READMEs — that is marketplace-creator — and not for measuring whether a wording change improved
  triggering, which is skill-ab-optimizer. This one reads the skill and proposes edits.
allowed-tools: Read, Glob, Grep, Bash, Task, TaskCreate, TaskUpdate, TodoWrite, mcp__ccd_turn__update_plan
argument-hint: "[path to the skill directory to audit]"
---

# Skill Audit

A skill's body is paid for in every session it fires, and stays in context once it does. Almost
nobody reopens their own `SKILL.md` afterwards to ask whether it still earns that. So skills
accumulate: a reference file nothing links any more, a paragraph explaining what the model
already knew, a description too vague to fire on the requests it was written for. None of it
breaks loudly. It just makes the skill cost more and work less.

This skill audits one skill and says what to change. It proposes edits; it does not make them.

> - `scripts/check-skill.mjs` — the deterministic sweep. Run it first; it is cheap and it tells
>   you which files are worth opening.
> - [references/checks.md](./references/checks.md) — what each message means, what actually broke,
>   and the right repair. Read it for any issue class you do not recognise before proposing a fix.
> - [references/rubric.md](./references/rubric.md) — the judgement rules, with the ids the probes
>   cite. The probes read it; you need it only to resolve a disagreement.

## Progress list

**Your first tool call in this skill creates the task list, before any command below.** Probes can
run for a while, and the list shows the user where the audit is. Keep it current to the last step. A
one-line announcement in chat does not replace it.

Use the task-list tool the session has: `mcp__ccd_turn__update_plan` in the Claude desktop app,
otherwise `TaskCreate` and `TaskUpdate`, or `TodoWrite`. Load it with `ToolSearch` first if it is only
listed as deferred. If the session has none of them, print the items as a Markdown checklist and
reprint it each time a step finishes.

Create it with these items, in the user's language:

```text
Run the script
Read the metrics
Run the four probes
Verify the evidence
Merge the findings
Write the report
```

- **One item in progress at a time.** Finish it when its step ends, and start the next in the same update.
- **Show the outcome when it isn't a plain success:** `Run the four probes: ran sequentially`.
- **Probes add no list of their own.**

## What this is not

`marketplace-creator`'s audit asks whether the **repo** describes itself truthfully — manifests against
the plugins on disk, READMEs against the skills they enumerate. This asks whether **one skill**
is well built. The two overlap on the frontmatter contract, which is checked here as well
because the target may be a skill that lives outside a marketplace repo entirely, where there is
no `plugin.json` to hang the check on.

`skill-ab-optimizer` measures. It runs the skill, scores the outcomes, and promotes a variant
only when the numbers move. This reads. The pairing: **the audit finds what to change; the
optimizer proves the change helped.**

And this is not a rewriter. It has no `Write` and no `Edit` in `allowed-tools`, which in Claude
Code means an edit prompts for approval rather than happening quietly — the report ends with
proposed diffs and stops there. The value of an audit is that you can check its findings
afterwards, and you cannot do that against a file it already changed.

## Run it

The script sits next to this `SKILL.md` — invoke it by an absolute path built from this skill's
own directory, not from the repo being audited. The argument is the target skill's directory:

```bash
node "<skill-dir>/scripts/check-skill.mjs" plugins/<plugin>/skills/<skill>
```

| Flag | Effect |
| --- | --- |
| `--json` | Full report: the file inventory, the `metrics` block, and every issue. This is the form the probes are given, so prefer it. |
| `--strict` | Warnings fail the run too (exit 1). Use it when a skill has been through an audit already and should stay clean. |

Exit code is 0 when clean, 1 when anything failed. The script never writes to the skill it reads,
and `Bash` is here to run that one command — no redirects, no `sed -i`, no `git` writes.

With no argument: if the working directory is inside a skill directory, audit that one.
Otherwise list the `plugins/*/skills/*` directories found and ask which. Do not fall back to
auditing the whole repo — that is a different skill's job.

## What the script cannot see

The script proves facts about bytes: a link that resolves to nothing, a name that disagrees with
its folder, a body over budget. It stops where judgement begins, and emits what it measured as a
`metrics` block instead of guessing. Whether a paragraph earns its tokens, whether a procedure is
too rigid for an open task, whether a reference file would be missed if it vanished — those need
a reader. That is the second layer.

## The workflow

1. **Run the script with `--json` before opening any file.** It is cheap, and its `issues[]` is
   what keeps the probes from re-reporting what is already known.
2. **Read the `metrics` block.** It carries the counts the probes would otherwise compute by
   hand — description length, shouting density, synonym frequencies, per-reference-file sizes.
3. **Spawn the four probes in a single message**, one subagent each, so they run at once. Give
   every probe the preamble below. If the session exposes no subagent tool, run the four passes
   yourself in roster order and say in the report that they ran sequentially.
4. **Verify every finding's evidence** before it reaches the report.
5. **Merge**, then write the report, then stop and ask.

## The probes

Ownership is exclusive. That is what makes the merge tiebreak deterministic, and it is why each
probe is told what it may not look at.

| Probe | Owns | Does not look at | Reads |
| --- | --- | --- | --- |
| **P1 routing-surface** | `R1.*` — the description as a routing artifact: specificity, pushiness, exclusion clauses, overlap with sibling skills, `argument-hint` accuracy, tool scope | the body below the first H2, reference files, scripts, anything about length | the frontmatter; the `name` and `description` of sibling skills in the same plugin |
| **P2 standing-instructions** | `R2.*` — the body as instructions that persist all session: standing framing, degrees of freedom against task fragility, one default with an escape hatch, the missing workflow shape, a flow that shows no progress (`R2.progress-list`, whose block the proposed edit inserts), contradictions | the frontmatter, wording economy, reference-file content, script code | the `SKILL.md` body |
| **P3 prose-and-language** | `R3.*` — words across every Markdown file: what the model already knows, verbosity, near-duplicate passages, empty sections, link blurbs that say nothing, terminology drift, language intrusions. Adjudicates the script's Polish and shouting warnings | the frontmatter, file structure, the link graph, orphans, contents lists | the body and every `references/*.md` |
| **P4 bundle** | `R4.*` — whether each bundled file earns a read and works cold: granularity, contents-list quality, script error handling, voodoo constants against the `magicNumbers` metric, assumed dependencies, `## Prerequisites` section (`R4.prerequisites`), execute-or-read clarity, MCP tool naming | wording inside any file, the frontmatter, instruction design in the body | `references/`, `scripts/`, `assets/`, and only the body lines that link or invoke them |

P3 and P4 both open the reference files. State the boundary in both prompts in these words:
**P4 does not comment on wording; P3 does not comment on file structure.**

Every probe gets the same preamble: the absolute path of the skill; the script's `--json` output
verbatim, with *do not report anything already in `issues[]` — the deterministic layer has it*;
its own section of the rubric (for P2, also *The progress-list block*); *you have Read, Glob and Grep, do not edit anything*; and a cap of
twelve findings, ranked, keeping the ones that cost the reader most. When a skill has more than
three reference files, tell P3 which two are largest and to read those in full and skim the rest
— decide that for it rather than leaving it to guess.

The output contract goes into every probe prompt verbatim:

```
Return nothing but findings in this format, one block per finding:

### <short-kebab-id>
severity: warn | polish
file: <path relative to the skill directory>
line: <line number, or - if the finding is about the whole file>
rule: <rule id from the rubric>
claim: <one sentence naming the defect>
evidence: <up to two lines copied verbatim from the file, unmodified>
repair: <the concrete edit — the replacement wording, or the exact deletion>

End with a single line: FINDINGS: <count>
If you found nothing, return exactly: FINDINGS: 0
```

Two details in that contract carry the weight. `evidence` is copied, never paraphrased, so it can
be checked. And probes may not emit `error` — that severity means *broken on disk*, which only
the script can establish, and without the restriction severity inflates until the ordering stops
meaning anything. The closing `FINDINGS:` line exists so you can tell a truncated response from a
quiet one and rerun that single probe.

## Merging

1. **Grep each finding's `evidence` against the file it names**, after normalising whitespace.
   Drop what does not match and report the count — never silently. A probe that invents evidence
   twice is a probe to rerun.
2. Key each finding as `file` + `rule` + the line rounded to a group of three.
3. **On a script-versus-probe collision the script wins**, with its message kept word for word so
   the report stays greppable against `references/checks.md`. If it had no hint and the probe
   supplied a repair, keep the repair.
4. **On a probe-versus-probe collision, higher severity wins; on a tie, the probe that owns the
   rule wins.**
5. Order: every `error` by file, then every `warn` by file, then `polish` grouped by file and
   capped at ten. A report longer than the skill it audits is not a report.

## The report

Follow the reporting rules indexed at the end of this section; what follows is how they apply to a
skill audit. Write the report in the user's language, but keep the script's messages word for word,
so they stay greppable against `references/checks.md`.

| Mark | Comes from |
| :-: | --- |
| 🔴 | a script `error`: broken on disk. Never a probe |
| 🟡 | `warn` |
| 🔵 | `polish` |
| ⚪ | an area with nothing to check, or a probe that did not return |

Verdict words: 🔴 **Broken**, 🟡 **Needs work**, 🔵 **Polish only**, 🟢 **Clean**.

````markdown
## 🩺 Skill audit · `<plugin>/<skill>`

> 🟡 **Needs work** · 0 errors · 3 warnings · 2 polish
> `0 error(s), 3 warning(s)` · `6 files · 101 body lines · 1116 ≈tokens · 5 references`

| Area | Status | Found |
| --- | :-: | --- |
| Frontmatter | 🟢 | — |
| Description & routing | 🟡 | 1 warning |
| Instructions | 🟢 | — |
| Prose & language | 🔵 | 2 polish |
| Links & budget | 🟡 | 2 warnings |
| Bundled files | ⚪ | no scripts or assets |

| # | Sev | Where | Problem | Fix | By |
| :-: | :-: | --- | --- | --- | --- |
| 1 | 🟡 | `SKILL.md:3` | <claim, one line> | <repair, one line> | P1 |
| 2 | 🟡 | `references/guide.md` | <script message, verbatim> | <its hint, shortened> | script |
| 3 | 🔵 | `SKILL.md:140` | <claim> | <repair> | P3 |

### 1 · 🟡 <claim>

> <evidence, copied verbatim>

```diff
- <current line>
+ <proposed line>
```

**Not checked:** routing performance → `skill-ab-optimizer` · repo registration → `marketplace-creator`

**Next:** nothing is applied yet. Reply with the numbers to apply (`1 3`) or `all`.
````

- **Scorecard rows are fixed:** Frontmatter (script `frontmatter`), Description & routing (P1),
  Instructions (P2), Prose & language (script `prose` and P3), Links & budget (script `links` and
  `budget`), Bundled files (script `scripts` and P4).
- **`By`** names the source: `script`, `P1`–`P4`, or two probes joined (`P3+P4`) when they
  reported the same repair. The findings follow the merge order above.
- **A detail block quotes the probe's `evidence`**, so it can be checked against the file.
- **The line above `Not checked`** carries the run's own leftovers: probes run sequentially,
  findings dropped because their evidence did not match (with the count), a probe rerun after a
  truncated reply, findings merged across probes, polish cut by the cap of ten.

Applying the edits happens in the turn after approval, under the normal tool set. Say so in the
`Next` line, and say that applying them obligates a version bump of the **audited** plugin in
its own `plugin.json` — not of `skill-dev`.

<!-- BEGIN:knowledge -->
<!-- generated by knowledge.mjs from 8 note(s) (sha256 e8aa3c282268); edit the notes in knowledge/, then run build -->

| Impact | Rule | Applies to |
| --- | --- | --- |
| high | [List findings in one numbered table, worst first](references/rules.md#list-findings-in-one-numbered-table-worst-first) — Columns #, Sev, Where, Problem, Fix, one line per cell; past fifteen rows, one table per file, numbered on. | any |
| high | [Mark every status with the shared five-mark scale](references/rules.md#mark-every-status-with-the-shared-five-mark-scale) — 🔴 broken · 🟡 fix it · 🔵 worth tidying · 🟢 nothing found · ⚪ not checked, in verdict, scorecard and findings alike. | any |
| high | [Open an audit report with a verdict line that quotes the tool's own summary](references/rules.md#open-an-audit-report-with-a-verdict-line-that-quotes-the-tools-own-summary) — First line is the worst status, the count at each severity, and the checking tool's summary line as evidence. | any |
| medium | [Show a scorecard when the audit covers a fixed set of areas](references/rules.md#show-a-scorecard-when-the-audit-covers-a-fixed-set-of-areas) — One row per area with its worst mark and counts, in an order the skill fixes, so two runs compare line by line. | any |
| medium | [Give a detail block only to findings whose fix will not fit the table, at most five](references/rules.md#give-a-detail-block-only-to-findings-whose-fix-will-not-fit-the-table-at-most-five) — Evidence and a diff for the few 🔴 and 🟡 findings that need one; the table row settles every other finding. | any |
| medium | [Close an audit report with what was not checked and the one next step](references/rules.md#close-an-audit-report-with-what-was-not-checked-and-the-one-next-step) — A Not checked line names what the run could not see; a Next line says what the user does now. | any |
| medium | [Report a clean run as the heading and one line](references/rules.md#report-a-clean-run-as-the-heading-and-one-line) — When nothing was found, skip the scorecard, the table and any list of what passed. | any |
| low | [Write reports in GitHub-flavoured Markdown without HTML](references/rules.md#write-reports-in-github-flavoured-markdown-without-html) — Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour. | any |

<!-- END:knowledge -->

## Reporting back

Never call a skill clean unless the script exited 0 and every probe returned `FINDINGS: 0`. When
that happens, the whole report is the heading and one line:

```markdown
> 🟢 **Clean** · `0 error(s), 0 warning(s)` · probes: `FINDINGS: 0`
```

A clean report padded with a restatement of everything that was checked is how a reader learns
to skim the next one.

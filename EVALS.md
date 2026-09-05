# Eval suites

Every plugin in this marketplace carries an `evals/` directory with cases that measure whether its
skills actually fire on natural requests. They are run with `claude plugin eval`, the native
harness — not a home-grown script.

A skill that never triggers is indistinguishable from a skill that does not exist. That is the
failure this suite is here to catch, and it is invisible to `claude plugin validate`, to
`/marketplace-doctor`, and to reading the Markdown.

## Status

`claude plugin eval` is in **early access**. The subcommand is compiled into current builds and
appears in `claude plugin --help`, but running it is gated per organization: when the gate is
closed both `eval` and `eval init` print `` `plugin eval` is currently in early access `` and exit
1.

**The cases in this repo have therefore been authored against the documented case format but have
not yet been executed.** Treat the first real run as a shakedown of the suite itself: expect to
adjust prompts that turn out to be ambiguous, and `max_turns` where a case runs out of room.

Enablement arrives automatically on first-party clients after `claude update` and a fresh session.
Clients that route through Bedrock, Vertex, an LLM gateway, or a custom `ANTHROPIC_BASE_URL` — and
any client with `DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` or
`DISABLE_GROWTHBOOK` set — need an enablement environment variable instead, obtained through
early-access onboarding.

## Layout

```
plugins/<plugin>/evals/
  routing-<skill>/
    prompt.md                     the request, phrased as a user would actually phrase it
    graders/routes-to-<skill>.md  a tool_used grader asserting the Skill call happened
  <outcome-case>/
    case.yaml                     everything, including context.scaffold_script
    fixture.sh                    builds the sandbox state the case needs
```

Two kinds of case:

- **Routing cases** — one per skill, in every plugin. The prompt never names the skill, never
  quotes its description, and never says "use the X skill": it is the request a user would type
  before knowing the skill exists. The single grader is deterministic and free (`tool_used` on
  `Skill`), so a full routing sweep costs agent runs and no judge calls.
- **Outcome cases** — fewer, and only where the artifact is worth grading. They scaffold a fixture,
  let the skill work, then grade what it produced. `plugins/plugin-dev/evals/marketplace-doctor-reports-drift/`
  is the worked example: a mini-marketplace with four planted defects, graded on whether the
  report names all four.

Every case is tagged `routing` or `outcome`; roughly a third are additionally tagged `smoke` — the
cheap subset CI runs.

## Running them

```bash
# every case in one plugin
claude plugin eval plugins/nextjs

# the cheap subset, one run each, no baseline arm — a pilot
claude plugin eval plugins/nextjs --tag smoke --runs 1 --ablation none

# one case, while you are iterating on its prompt
claude plugin eval plugins/nextjs --case routing-devlogs
```

Results land in `plugins/<plugin>/evals/results/<timestamp>/` (`aggregate-result.json` plus an
HTML report). Add `--no-publish` to keep the report local.

**The outcome case needs two extra grants**, because its fixture writes files and the skill shells
out to node:

```bash
claude plugin eval plugins/plugin-dev \
  --case marketplace-doctor-reports-drift \
  --scaffold \
  --allow-tools Write "Bash(node:*)" "Bash(bash:*)"
```

`--scaffold` runs author-supplied bash as you. It is off by default for good reason — only pass it
for cases in this repo, which you can read.

## The baseline arm

Naming a plugin (rather than a path) turns on `--ablation with-without` by default: each case runs
twice, once with the plugin and once with nothing loaded, and the report shows the delta.

For routing cases the delta is the entire point — but note the harness's rule: a `tool_used` grader
on `Skill` with no explicit `arm` is treated as a plugin-fired indicator and is **excluded from the
score in both arms**. Since routing cases have exactly one grader and it is that grader, the
"every grader is with-only" exception applies and they are scored normally. If you add a second
grader to a routing case, re-read that rule before trusting the number.

## Writing a new case

1. `claude plugin eval init` from the plugin root runs an interview and writes the files. With the
   gate closed, copy an existing case instead — they are four lines of frontmatter and a sentence.
2. **Write the prompt as a user, not as an author.** If the prompt contains the skill's name, its
   trigger words, or a phrase lifted from its `description`, the case proves nothing.
3. Keep `runs: 3`. A single run against a non-deterministic agent is noise, not a measurement.
4. Prefer deterministic graders. Use `llm` only for bounded output, and write the rubric as
   concrete checkable claims — the judge is a small fast model by default.
5. Grade the outcome *and* the mechanism: what the skill produced, plus a `tool_used` assertion
   that it was the skill that produced it.

## CI

`.github/workflows/validate.yml` has an `evals` job, one matrix leg per plugin, running the `smoke`
tag with pinned models. It is `workflow_dispatch`-only: the harness is gated and each run costs
real API spend, so it is not wired to push or pull_request. Once early access opens for this
account, switching the trigger is a one-line change.

Pin `--model` whenever comparing runs over time — otherwise a model rollout looks exactly like a
plugin regression.

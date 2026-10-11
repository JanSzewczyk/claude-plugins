# Workflow shapes and quality patterns

Each shape below is the smallest script that does the job well. Compose them; the bundled
reference says plainly that novel harnesses are welcome when the task calls for one.

## Pick the primitive

`pipeline()` by default. A barrier (`parallel()` between stages) is right only when stage N
needs cross-item context from all of stage N-1:

- dedup or merge across the full set before expensive downstream work;
- early exit when the total is zero ("0 findings, skip verification");
- a prompt that compares an item against "the other findings".

A barrier is not justified by "I need to flatten or filter first" (do it inside a stage),
"the stages are conceptually separate" (that is what a pipeline models) or "it reads better".
If five finders run and the slowest takes three times the fastest, a barrier wastes two
thirds of the fast finders' time. The smell:

```javascript
const a = await parallel(...)
const b = transform(a)            // no cross-item dependency
const c = await parallel(b.map(...))
```

Rewrite as `pipeline(items, stageA, r => transform([r]).flat(), stageB)`.

## Shape 1: discover, transform, verify (migrations, mechanical rewrites)

```javascript
export const meta = {
  name: 'migrate-router',
  description: 'Migrate each file off the old router API in an isolated worktree and verify',
  phases: [{ title: 'Discover' }, { title: 'Migrate' }, { title: 'Verify' }],
}
const FILES = { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string' } } } }
const RESULT = { type: 'object', required: ['changed'], properties: { changed: { type: 'boolean' }, branch: { type: 'string' }, worktreePath: { type: 'string' }, note: { type: 'string' } } }
const VERDICT = { type: 'object', required: ['pass'], properties: { pass: { type: 'boolean' }, reason: { type: 'string' } } }

const root = (args && args.root) || 'src'
phase('Discover')
const { files } = await agent(`List every file under ${root} that imports the old router API. Repo-relative paths only.`, { schema: FILES, effort: 'low' })
log(`${files.length} files to migrate`)

const done = await pipeline(
  files,
  (f) => agent(`Migrate ${f} from the old router API to the new one. Keep behaviour identical. Commit on your branch and report the branch and the worktree path from "git rev-parse --show-toplevel".`,
    { label: `migrate:${f}`, phase: 'Migrate', isolation: 'worktree', schema: RESULT }).then((r) => r && { file: f, ...r }),
  (r, f) => r.changed
    ? agent(`In ${r.worktreePath}: run the tests and type-check, then try to find any behaviour ${f} lost. Do not edit anything. Default to pass=false when unsure.`,
        { label: `verify:${f}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ ...r, ...v }))
    : { ...r, pass: false, reason: r.note || 'unchanged' },
)
const results = done.filter(Boolean)
if (results.length < files.length) log(`${files.length - results.length} files dropped (agent stopped or failed)`)
return { readyToMerge: results.filter((r) => r.pass), manual: results.filter((r) => !r.pass) }
```

What matters here: the worktree starts from the default branch unless `worktree.baseRef` is
`"head"`; the script cannot merge, so it returns branches; verify runs in the agent's
worktree, which lives inside the repo so no extra read permission is needed; a `null` from
the migrate stage short-circuits the item.

## Shape 2: review dimensions, then verify each finding (reviews, audits)

```javascript
const DIMENSIONS = [{ key: 'bugs', prompt: '…' }, { key: 'security', prompt: '…' }]
const results = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS }),
  (review) => parallel(review.findings.map((f) => () =>
    agent(`Try to refute this finding. Default to refuted=true when uncertain: ${JSON.stringify(f)}`,
      { label: `verify:${f.file}`, phase: 'Verify', schema: VERDICT }).then((v) => ({ ...f, verdict: v })))),
)
const confirmed = results.flat().filter(Boolean).filter((f) => f.verdict && !f.verdict.refuted)
return { confirmed }
```

Findings from the `bugs` dimension verify while `security` is still reviewing. With your own
review agents, pass `agentType: 'vue-expert'` and friends; their rules files load with them.

## Shape 3: loop until a check passes (type errors, lint, flaky tests)

```javascript
let round = 0, lastCount = Infinity, stalled = 0
while (round < 6 && stalled < 2) {
  round++
  const check = await agent('Run `npx tsc --noEmit` and list each error as {file, line, message}.', { schema: ERRORS, effort: 'low', label: `check:${round}` })
  if (!check || check.errors.length === 0) { log(`round ${round}: clean`); break }
  stalled = check.errors.length >= lastCount ? stalled + 1 : 0
  lastCount = check.errors.length
  log(`round ${round}: ${check.errors.length} errors`)
  const byFile = Object.groupBy(check.errors, (e) => e.file)
  await parallel(Object.entries(byFile).map(([file, errs]) => () =>
    agent(`Fix these type errors in ${file} without changing behaviour: ${JSON.stringify(errs)}`, { label: `fix:${file}`, phase: 'Fix' })))
}
return { rounds: round, remaining: lastCount === Infinity ? 0 : lastCount }
```

The barrier is correct: the next check needs every fix applied. Two guards, a round cap and a
no-progress counter, because a loop that does not converge is a design problem.

## Shape 4: loop until dry (unknown-size discovery)

```javascript
const seen = new Set(), confirmed = []
let dry = 0, rounds = 0
while (dry < 2 && rounds < 8) {
  rounds++
  const found = (await parallel(FINDERS.map((f, i) => () => agent(`${f.prompt} (angle ${i + 1})`, { phase: 'Find', label: `find:${f.key}`, schema: BUGS })))).filter(Boolean).flatMap((r) => r.bugs)
  const fresh = found.filter((b) => !seen.has(key(b)))
  if (!fresh.length) { dry++; continue }
  dry = 0
  fresh.forEach((b) => seen.add(key(b)))
  const judged = await parallel(fresh.map((b) => () =>
    parallel(['correctness', 'security', 'repro'].map((lens) => () =>
      agent(`Judge "${b.desc}" through the ${lens} lens. Real?`, { phase: 'Verify', label: `judge:${lens}`, schema: VERDICT })))
      .then((vs) => ({ b, real: vs.filter(Boolean).filter((v) => v.real).length >= 2 }))))
  confirmed.push(...judged.filter(Boolean).filter((v) => v.real).map((v) => v.b))
  log(`round ${rounds}: ${fresh.length} new, ${confirmed.length} confirmed`)
}
return confirmed
```

Dedup against `seen`, not `confirmed`, or judge-rejected findings reappear every round.

## Shape 5: judge panel (design decisions, plans)

Generate N attempts from distinct angles (MVP-first, risk-first, user-first), score each with
parallel judges, synthesize from the winner while grafting the best ideas from the runners-up.
Beats one attempt iterated when the solution space is wide.

## Shape 6: budget-scaled depth

```javascript
const FLEET = budget.total ? Math.floor(budget.total / 100_000) : 5
while (budget.total && budget.remaining() > 50_000 && rounds < 20) { … }
```

`budget.total` is `null` without a `+Nk` directive and `remaining()` is then `Infinity`;
always guard on `total` and keep a hard round cap.

## Quality patterns to compose

- **Adversarial verify.** N independent skeptics per finding, each told to refute and to
  default to refuted when uncertain. Keep a finding only when a majority fails to refute it.
- **Perspective-diverse verify.** When a finding can fail in several ways, give each verifier
  a different lens instead of N identical refuters.
- **Completeness critic.** A last agent asks what is missing: a modality not run, a claim
  unverified, a source unread. Its answer is the next round of work.
- **Multi-modal sweep.** Parallel finders that each search a different way: by container, by
  content, by entity, by time. Each is blind to what the others surface.
- **No silent caps.** Any top-N, sampling or no-retry bound is logged with the dropped count.

## Cost and speed levers

- **Prompt-cache prefix.** Agents with the same model, effort, agentType, tools, schema and
  working directory share a cached prefix; the runtime holds matching siblings until the first
  response starts so they read it. Vary prompts by content, not by shuffling those fields per
  agent. `subagentPromptCacheTtl: "1h"` keeps the cache for long runs.
- **Effort per stage.** `low` for list, grep and mechanical rewrite stages; the session
  default or higher for judge and verify stages.
- **Pipeline over barrier.** Wall-clock becomes the slowest single-item chain instead of the
  sum of the slowest item per stage.
- **Slice first.** Run on one directory with `args`, read `/workflows` token totals, then
  scale. `workflowSizeGuideline` (`small`, `medium`, `large`) tells Claude how many agents to
  aim for when it writes a script.
- **Hybrid.** Scout inline first (list files, scope the diff), then hand the list to the
  workflow through `args`. The script does not need to know the shape before the task, only
  before the orchestration step.

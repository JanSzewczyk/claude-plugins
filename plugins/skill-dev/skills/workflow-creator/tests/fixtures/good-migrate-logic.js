export const meta = {
  name: 'good-migrate-logic',
  description: 'Migrate many Vue elements with one lens: tests on old code, rewrite in worktrees, verify',
  whenToUse: 'Many elements, one mechanical migration. One element with gates is /migration.',
  phases: [
    { title: 'Discover', detail: 'elements the lens applies to' },
    { title: 'Characterize', detail: 'behaviour tests, green on old code' },
    { title: 'Migrate', detail: 'rewrite in an isolated worktree' },
    { title: 'Verify', detail: 'vitest and tsc in the worktree, refutation' },
  ],
}

const root = (args && args.root) || 'src/components'
const lens = (args && args.lens) || 'options-to-composition'
const repo = args && args.repo
if (!repo) throw Error('args.repo (absolute path to the main checkout) is required')

const FILES = { type: 'object', required: ['files'],
  properties: { files: { type: 'array', items: { type: 'string' } } } }
const TESTS = { type: 'object', required: ['testFile', 'passed', 'commit'],
  properties: { testFile: { type: 'string' }, passed: { type: 'boolean' }, commit: { type: 'string' }, note: { type: 'string' } } }
const MIGRATED = { type: 'object', required: ['changed'],
  properties: { changed: { type: 'boolean' }, worktreePath: { type: 'string' }, branch: { type: 'string' }, note: { type: 'string' } } }
const VERDICT = { type: 'object', required: ['pass'],
  properties: { pass: { type: 'boolean' }, reason: { type: 'string' } } }

phase('Discover')
const { files } = await agent(
  `List every Vue single-file component under ${root} that the "${lens}" migration applies to. Return repo-relative paths only.`,
  { schema: FILES, effort: 'low' })
log(`${files.length} elements to migrate with lens ${lens}`)

const results = await pipeline(
  files,
  async (file) => {
    const t = await agent(
      `You are in a fresh git worktree of ${repo}. Write characterization tests for ${file}: behaviour visible from outside only. Create one new test file and touch nothing else. Run it with vitest on the unmodified code, then commit it on your branch. Report the test file path, whether it passes, and the commit sha from "git rev-parse HEAD".`,
      { label: `tests:${file}`, phase: 'Characterize', agentType: 'fe-tester', isolation: 'worktree', schema: TESTS })
    return { file, ...t }
  },
  async (t, file) => {
    if (!t.passed) return { ...t, changed: false, note: 'skipped: characterization tests red on old code' }
    const m = await agent(
      `You are in a fresh git worktree. Run "git cherry-pick ${t.commit}" to bring in the characterization test ${t.testFile} (worktrees share the repository history). Then migrate ${file} with the "${lens}" lens, changing how it works and not what it does. Never edit ${t.testFile}. Commit on your branch. Report changed, the worktree path from "git rev-parse --show-toplevel" and the branch from "git branch --show-current".`,
      { label: `migrate:${file}`, phase: 'Migrate', agentType: 'vue-expert', isolation: 'worktree', schema: MIGRATED })
    return { ...t, ...m }
  },
  async (m, file) => {
    if (!m.changed) return { ...m, pass: false, reason: m.note }
    const v = await agent(
      `In ${m.worktreePath}: run vitest for ${m.testFile} and the package type-check. Then try to refute the migration of ${file}. Default to pass=false when uncertain. Do not edit anything.`,
      { label: `verify:${file}`, phase: 'Verify', schema: VERDICT })
    return { ...m, ...v }
  },
)

const done = results.filter(Boolean)
if (done.length < files.length) log(`${files.length - done.length} elements dropped (agent stopped or failed)`)
return {
  readyToMerge: done.filter((r) => r.pass).map((r) => ({ file: r.file, branch: r.branch, worktreePath: r.worktreePath })),
  manual: done.filter((r) => !r.pass).map((r) => ({ file: r.file, reason: r.reason || r.note })),
}

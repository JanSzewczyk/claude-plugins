#!/usr/bin/env node
// Offline test for scripts/check_workflow.mjs: runs the linter on each fixture
// and asserts the verdict plus the finding codes that must (and must not) appear.
//   node tests/test_check.mjs

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const linter = join(here, '..', 'scripts', 'check_workflow.mjs')

const cases = [
  {
    fixture: 'good-migrate-logic.js',
    verdict: 'WARN', // only WORKTREE_BASEREF_FRESH unless the machine sets worktree.baseRef = head
    expect: ['WORKTREE_BASEREF_FRESH'],
    forbid: ['META_NOT_FIRST', 'META_IMPURE', 'SYNTAX', 'NONDETERMINISTIC', 'PARALLEL_NOT_THUNK', 'NULL_NOT_FILTERED', 'PHASE_UNUSED', 'PHASE_UNDECLARED', 'ARGS_UNGUARDED', 'NO_SCHEMA_AT_HANDOFF', 'PARALLEL_WRITERS_SHARED_CHECKOUT'],
    agents: 4,
  },
  {
    fixture: 'broken-audit-routes.js',
    verdict: 'FAIL',
    expect: ['META_NOT_FIRST', 'META_IMPURE', 'SCHEMA_UNSATISFIABLE', 'NONDETERMINISTIC', 'PARALLEL_NOT_THUNK', 'BUDGET_UNGUARDED', 'NO_SCHEMA_AT_HANDOFF', 'ARGS_UNGUARDED', 'NULL_NOT_FILTERED', 'SILENT_CAP'],
    forbid: ['SYNTAX', 'PHASE_RACE'],
    agents: 3,
  },
  {
    fixture: 'slow-review.js',
    verdict: 'WARN',
    expect: ['NULL_NOT_FILTERED', 'MODEL_OVERRIDE', 'BARRIER_SMELL', 'NO_LABEL', 'NO_LOGS'],
    forbid: ['META_NOT_FIRST', 'SYNTAX', 'PARALLEL_NOT_THUNK', 'PHASE_UNUSED'],
    agents: 3,
  },
]

let failed = 0
for (const c of cases) {
  let out
  try {
    out = execFileSync('node', [linter, join(here, 'fixtures', c.fixture), '--json', '--settings-dir', here], { encoding: 'utf8' })
  } catch (e) {
    out = e.stdout // non-zero exit carries the JSON on stdout
  }
  const r = JSON.parse(out)
  const codes = new Set(r.findings.map((f) => f.code))
  const problems = []
  if (c.verdict && r.verdict !== c.verdict && !(c.fixture.startsWith('good') && r.verdict === 'PASS')) problems.push(`verdict ${r.verdict}, expected ${c.verdict}`)
  for (const e of c.expect) if (!codes.has(e) && !(e === 'WORKTREE_BASEREF_FRESH' && codes.has('WORKTREE_INFO'))) problems.push(`missing ${e}`)
  for (const f of c.forbid) if (codes.has(f)) problems.push(`unexpected ${f}`)
  if (c.agents !== undefined && r.agents !== c.agents) problems.push(`agents ${r.agents}, expected ${c.agents}`)
  if (problems.length) { failed++; console.log(`FAIL ${c.fixture}: ${problems.join('; ')}`) } else console.log(`ok   ${c.fixture} (${r.verdict}, ${r.findings.length} findings)`)
}
process.exit(failed ? 1 : 0)

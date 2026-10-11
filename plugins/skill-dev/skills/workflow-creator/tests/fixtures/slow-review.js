export const meta = {
  name: 'slow-review',
  description: 'Review changed files across dimensions and verify findings',
  phases: [{ title: 'Review' }, { title: 'Verify' }, { title: 'Summarize' }],
}

const DIMENSIONS = [
  { key: 'bugs', prompt: 'Find correctness bugs in the changed files.' },
  { key: 'perf', prompt: 'Find performance problems in the changed files.' },
  { key: 'security', prompt: 'Find security issues in the changed files.' },
]
const FINDINGS = { type: 'object', required: ['findings'],
  properties: { findings: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, file: { type: 'string' } } } } } }
const VERDICT = { type: 'object', required: ['isReal'], properties: { isReal: { type: 'boolean' } } }

phase('Review')
const reviews = await parallel(DIMENSIONS.map((d) => () => agent(d.prompt, { schema: FINDINGS, model: 'opus' })))
const findings = reviews.flatMap((r) => r.findings)

phase('Verify')
const verdicts = await parallel(findings.map((f) => () => agent(`Adversarially verify: ${f.title} in ${f.file}`, { schema: VERDICT, model: 'opus' })))
const confirmed = findings.filter((f, i) => verdicts[i] && verdicts[i].isReal)

phase('Summarize')
const summary = await agent(`Rank and deduplicate these findings: ${JSON.stringify(confirmed)}`)
return { confirmed, summary }

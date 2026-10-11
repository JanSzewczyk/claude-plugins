// Seeded defects, one per line comment marked SEED.
const DIMENSIONS = ['auth', 'input-validation', 'error-handling'] // SEED: statement before meta

export const meta = {
  name: 'broken-audit-routes',
  description: 'Audit route handlers for ' + DIMENSIONS.length + ' dimensions', // SEED: impure meta
  phases: [{ title: 'Audit' }, { title: 'Verify' }],
}

const FINDING = { type: 'object', required: ['findings', 'summary'], // SEED: required not in properties
  properties: { findings: { type: 'array', items: { type: 'object' } } } }
const VERDICT = { type: 'object', required: ['real'], properties: { real: { type: 'boolean' } } }

const startedAt = Date.now() // SEED: nondeterministic
const { files } = await agent(`List every route handler under ${args.root}.`) // SEED: args unguarded, no schema

const audits = await parallel(files.map(f => agent(`Audit ${f} for ${DIMENSIONS.join(', ')}.`, { schema: FINDING }))) // SEED: not thunks
const flat = audits.flatMap(a => a.findings) // SEED: null not filtered

const verified = []
while (budget.remaining() > 50000) { // SEED: budget unguarded
  phase('Verify') // fine here (top level)
  const v = await parallel(flat.slice(0, 10).map(f => () => agent(`Refute: ${f.title}`, { schema: VERDICT })))
  verified.push(...v)
}

return { verified, elapsed: Date.now() - startedAt }

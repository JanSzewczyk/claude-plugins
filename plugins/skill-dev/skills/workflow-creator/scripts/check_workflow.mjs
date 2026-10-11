#!/usr/bin/env node
// Static checker for Claude Code dynamic workflow scripts.
//
//   node check_workflow.mjs <script.js> [--json] [--settings-dir <dir>]
//
// Exit code: 2 when a blocker was found, 1 when only majors, 0 otherwise.
// Zero dependencies. The checks mirror what the Claude Code runtime enforces
// (meta literal, determinism, thunks) plus the authoring rules that the runtime
// cannot see (null handling, loop caps, schemas, worktree base branch).

import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { homedir } from 'node:os'
import vm from 'node:vm'

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2)
const jsonOut = argv.includes('--json')
const file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--settings-dir')
const settingsDirIdx = argv.indexOf('--settings-dir')
const settingsDir = settingsDirIdx >= 0 ? argv[settingsDirIdx + 1] : process.cwd()

if (!file) {
  console.error('usage: node check_workflow.mjs <script.js> [--json] [--settings-dir <dir>]')
  process.exit(3)
}
if (!existsSync(file)) {
  console.error(`file not found: ${file}`)
  process.exit(3)
}

let src = readFileSync(file, 'utf8')
const findings = []
const lineOf = (idx) => src.slice(0, idx).split('\n').length
const add = (severity, code, idx, message) =>
  findings.push({ severity, code, line: idx == null ? null : lineOf(idx), message })

// ------------------------------------------------------ string/comment mask
// Returns a copy of `s` with the same length where the contents of string
// literals and comments are replaced by spaces. Quotes and newlines are kept,
// and `${ ... }` expressions inside template literals stay visible. Matching
// parentheses on the mask therefore ignores anything inside a prompt string.

function mask(s) {
  const out = s.split('')
  const stack = [] // saved brace depths of enclosing code levels, one per open ${
  let i = 0
  let state = 'code'
  let depth = 0 // brace depth inside the current code level
  const blank = (j) => { if (out[j] !== '\n') out[j] = ' ' }
  while (i < s.length) {
    const c = s[i]
    const n = s[i + 1]
    if (state === 'code') {
      if (c === '/' && n === '/') { state = 'line'; blank(i); blank(i + 1); i += 2; continue }
      if (c === '/' && n === '*') { state = 'block'; blank(i); blank(i + 1); i += 2; continue }
      if (c === "'" || c === '"') { state = c; i++; continue }
      if (c === '`') { state = 'tpl'; i++; continue }
      if (c === '{') depth++
      if (c === '}') {
        if (depth === 0 && stack.length) { depth = stack.pop(); state = 'tpl'; i++; continue }
        depth--
      }
      i++; continue
    }
    if (state === 'line') { if (c === '\n') state = 'code'; else blank(i); i++; continue }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; blank(i); blank(i + 1); i += 2; continue }
      blank(i); i++; continue
    }
    if (state === "'" || state === '"') {
      if (c === '\\') { blank(i); blank(i + 1); i += 2; continue }
      if (c === state) { state = 'code'; i++; continue }
      if (c === '\n') { state = 'code'; i++; continue }
      blank(i); i++; continue
    }
    if (state === 'tpl') {
      if (c === '\\') { blank(i); blank(i + 1); i += 2; continue }
      if (c === '`') { state = 'code'; i++; continue }
      if (c === '$' && n === '{') { stack.push(depth); depth = 0; state = 'code'; i += 2; continue }
      blank(i); i++; continue
    }
    i++
  }
  return out.join('')
}

let code = mask(src)

// Find the index of the bracket that closes the one at `open`.
function matchBracket(open) {
  const pairs = { '(': ')', '[': ']', '{': '}' }
  const close = pairs[code[open]]
  let d = 0
  for (let i = open; i < code.length; i++) {
    const c = code[i]
    if (c === '(' || c === '[' || c === '{') d++
    else if (c === ')' || c === ']' || c === '}') { d--; if (d === 0) return c === close ? i : -1 }
  }
  return -1
}

// All call sites of `name(`: returns { start, open, close, args (raw), argsCode (masked) }.
function calls(name, from = 0, to = code.length) {
  const re = new RegExp(`(?<![\\w.$])${name.replace('.', '\\.')}\\s*\\(`, 'g')
  const out = []
  re.lastIndex = from
  let m
  while ((m = re.exec(code)) && m.index < to) {
    const open = m.index + m[0].length - 1
    const close = matchBracket(open)
    if (close < 0) break
    out.push({ start: m.index, open, close, args: src.slice(open + 1, close), argsCode: code.slice(open + 1, close) })
    re.lastIndex = open + 1
  }
  return out
}

// --------------------------------------------------------- 1. meta block

const lead = code.match(/^\s*/)[0].length
const metaRe = /(?<![\w$])export\s+const\s+meta\s*=\s*\{/g
let meta = null
let bodyStart = lead
let metaStart = -1
let metaEnd = -1
const metaMatch = metaRe.exec(code)
if (!metaMatch) {
  add('blocker', 'META_MISSING', lead, 'no `export const meta = { ... }` found; it must be the first statement (comments may precede it).')
} else {
  metaStart = metaMatch.index
  if (metaStart !== lead)
    add('blocker', 'META_NOT_FIRST', metaStart, '`export const meta = { ... }` must be the first statement (comments may precede it). Move it above every other statement.')
  const open = code.indexOf('{', metaStart)
  const close = matchBracket(open)
  if (close < 0) {
    add('blocker', 'META_UNCLOSED', open, 'meta object literal is not closed.')
  } else {
    const literal = src.slice(open, close + 1)
    try {
      meta = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 })
    } catch (e) {
      add('blocker', 'META_IMPURE', open,
        `meta must be a pure literal (no variables, calls, spreads, template interpolation): ${e.message}. ` +
        'An impure meta drops /<name> from autocomplete.')
    }
    let after = close + 1
    while (/[\s;]/.test(code[after] || '')) after++
    metaEnd = after
    if (metaStart === lead) bodyStart = after
  }
}
// Body text with the meta statement blanked out when it is not in first position,
// so later checks see the rest of the script instead of cascading syntax errors.
const blankRange = (s, a, b) => a < 0 ? s : s.slice(0, a) + s.slice(a, b).replace(/[^\n]/g, ' ') + s.slice(b)
const srcBody = metaStart === lead ? src : blankRange(src, metaStart, metaEnd)
const codeBody = metaStart === lead ? code : blankRange(code, metaStart, metaEnd)
src = srcBody
code = codeBody

if (meta) {
  if (typeof meta.name !== 'string' || !meta.name.trim())
    add('blocker', 'META_NAME', lead, 'meta.name must be a non-empty string.')
  else if (!/^[a-z0-9][a-z0-9_-]*$/.test(meta.name))
    add('minor', 'META_NAME_FORMAT', lead, `meta.name "${meta.name}" should be kebab-case: it becomes the /<name> command.`)
  if (typeof meta.description !== 'string' || !meta.description.trim())
    add('blocker', 'META_DESCRIPTION', lead, 'meta.description must be a non-empty one-line string (shown in the permission dialog).')
  else if (meta.description.includes('\n'))
    add('minor', 'META_DESCRIPTION_MULTILINE', lead, 'meta.description should be one line.')
  if (meta.phases !== undefined) {
    if (!Array.isArray(meta.phases)) add('blocker', 'META_PHASES_TYPE', lead, 'meta.phases must be an array of { title, detail?, model? }.')
    else meta.phases.forEach((p, i) => {
      if (!p || typeof p.title !== 'string') add('blocker', 'META_PHASE_TITLE', lead, `meta.phases[${i}] needs a string title.`)
      else Object.keys(p).forEach((k) => {
        if (!['title', 'detail', 'model'].includes(k)) add('minor', 'META_PHASE_KEY', lead, `meta.phases[${i}] has unknown key "${k}".`)
      })
    })
  }
  Object.keys(meta).forEach((k) => {
    if (!['name', 'description', 'phases', 'whenToUse'].includes(k))
      add('minor', 'META_UNKNOWN_KEY', lead, `meta has unknown key "${k}" (known: name, description, whenToUse, phases).`)
  })
  const fname = basename(file)
  if (meta.name && fname !== `${meta.name}.js`)
    add('minor', 'FILENAME_MISMATCH', null, `file is "${fname}" but meta.name is "${meta.name}"; name the file <name>.js so the two stay in sync.`)
}

// --------------------------------------------------------- 2. body syntax

const body = srcBody.slice(bodyStart)
const bodyCode = codeBody.slice(bodyStart)
if (!body.trim()) add('blocker', 'BODY_EMPTY', bodyStart, 'script body is empty.')

const wrapped = `(async () => {\n${body}\n})`
try {
  new vm.Script(wrapped, { filename: file })
} catch (e) {
  let hint = ''
  if (/:\s*(string|number|boolean|any|unknown|void|Promise<|Array<|Record<)\b|\binterface\s+\w|\bas\s+const\b|<\w+>\s*\(/.test(bodyCode))
    hint = ' Looks like TypeScript: scripts are plain JavaScript, no type annotations, interfaces or generics.'
  const m = /:(\d+)$/.exec(e.stack?.split('\n')[0] || '')
  const line = m ? Number(m[1]) - 1 + lineOf(bodyStart) - 1 : null
  findings.push({ severity: 'blocker', code: 'SYNTAX', line, message: `${e.message}.${hint}` })
}

// ----------------------------------------------- 3. runtime hard rules

const at = (re, from = bodyStart) => { re.lastIndex = 0; const m = re.exec(code.slice(from)); return m ? from + m.index : -1 }
const each = (re, fn) => { const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = r.exec(bodyCode))) fn(bodyStart + m.index, m) }

each(/\bDate\.now\s*\(/, (i) => add('blocker', 'NONDETERMINISTIC', i, 'Date.now() throws inside a workflow (breaks resume). Pass a timestamp via args.'))
each(/\bMath\.random\s*\(/, (i) => add('blocker', 'NONDETERMINISTIC', i, 'Math.random() throws inside a workflow (breaks resume). Vary prompts by index instead.'))
each(/\bnew\s+Date\s*\(\s*\)/, (i) => add('blocker', 'NONDETERMINISTIC', i, 'new Date() with no argument throws inside a workflow. Pass the date via args.'))
each(/(?<![\w.$])import\s*\(/, (i) => add('blocker', 'NO_MODULES', i, 'import() is refused before the run starts. Put library work inside an agent task.'))
each(/(?<![\w.$])require\s*\(/, (i) => add('blocker', 'NO_MODULES', i, 'require() is not available in the script. Agents do the work that needs libraries.'))
each(/(?<![\w.$])(process|fs|child_process|fetch|XMLHttpRequest)\s*[.(]/, (i, m) => add('blocker', 'NO_RUNTIME_ACCESS', i, `${m[1]} is not available: the script has no filesystem, process or network access. Only agents do.`))
each(/^\s*(import|export)\s/m, (i, m) => add('major', 'EXTRA_MODULE_SYNTAX', i, `a second "${m[1]}" statement in the body; only the leading export const meta is allowed.`))

// secrets
each(/(sk-ant-[\w-]{10,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{12,}|xox[bap]-[\w-]{10,}|(password|secret|token|api[_-]?key)\s*[:=]\s*['"][^'"]{6,}['"])/i,
  (i) => add('blocker', 'SECRET_IN_SCRIPT', i, 'looks like a credential in the script; prompts are persisted under ~/.claude/projects and shown in /workflows.'))

// --------------------------------------------------- 4. orchestration API

const agentCalls = calls('agent', bodyStart)
const parallelCalls = calls('parallel', bodyStart)
const pipelineCalls = calls('pipeline', bodyStart)
const phaseCalls = calls('phase', bodyStart)
const logCalls = calls('log', bodyStart)
const workflowCalls = calls('workflow', bodyStart)

if (!agentCalls.length && !workflowCalls.length)
  add('blocker', 'NO_AGENTS', bodyStart, 'the body never calls agent() or workflow(); nothing would run.')

// parallel() must receive thunks
for (const p of parallelCalls) {
  const a = p.argsCode
  if (/^\s*\[\s*agent\s*\(/.test(a) || /\.map\s*\(\s*\(?[\w\s,]*\)?\s*=>\s*agent\s*\(/.test(a) || /,\s*agent\s*\(/.test(a))
    add('blocker', 'PARALLEL_NOT_THUNK', p.start, 'parallel() expects an array of functions: wrap each call as () => agent(...). Passing promises throws a TypeError at run time.')
  if (/^\s*[\w.]+\s*$/.test(a) && !/\.map/.test(a)) { /* variable holding thunks: fine */ }
}
each(/Promise\.all(Settled)?\s*\(/, (i) => add('major', 'PROMISE_ALL', i, 'use parallel() instead of Promise.all: parallel() turns a failed agent into null instead of rejecting the whole batch, and shows up in /workflows.'))
each(/\.map\s*\(\s*async\b/, (i) => { if (!/parallel\s*\(/.test(code.slice(Math.max(bodyStart, i - 80), i))) add('major', 'MAP_ASYNC_OUTSIDE_PARALLEL', i, '.map(async ...) outside parallel() creates unmanaged promises. Use parallel(items.map(x => () => agent(...))) or pipeline().') })

// phase() inside a concurrent callback races on global state
for (const c of [...parallelCalls, ...pipelineCalls]) {
  const inner = calls('phase', c.open, c.close)
  for (const ph of inner) add('major', 'PHASE_RACE', ph.start, 'phase() called inside parallel()/pipeline(): concurrent stages race on the global phase. Pass { phase: "Title" } per agent() instead.')
}

// pipeline stages must be functions
for (const p of pipelineCalls) {
  const stagesCode = p.argsCode
  const firstComma = (() => { let d = 0; for (let i = 0; i < stagesCode.length; i++) { const ch = stagesCode[i]; if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--; else if (ch === ',' && d === 0) return i } return -1 })()
  if (firstComma < 0) add('blocker', 'PIPELINE_NO_STAGES', p.start, 'pipeline(items, stage1, ...) needs at least one stage function.')
  else {
    const rest = stagesCode.slice(firstComma + 1)
    if (/^\s*agent\s*\(/.test(rest)) add('blocker', 'PIPELINE_STAGE_NOT_FUNCTION', p.start, 'pipeline() stages must be functions: pipeline(items, item => agent(...)).')
  }
}

// phase titles vs meta.phases
const titlesInCode = new Set()
for (const ph of phaseCalls) { const m = /^\s*(['"`])(.*?)\1\s*$/.exec(ph.args); if (m) titlesInCode.add(m[2]) }
for (const a of agentCalls) { const m = /\bphase\s*:\s*(['"`])(.*?)\1/.exec(a.args); if (m) titlesInCode.add(m[2]) }
if (meta && Array.isArray(meta.phases)) {
  const declared = new Set(meta.phases.map((p) => p.title))
  for (const t of titlesInCode) if (!declared.has(t)) add('minor', 'PHASE_UNDECLARED', null, `phase "${t}" is used in the body but not listed in meta.phases (it still gets its own group; declare it so the plan shows before the run).`)
  for (const t of declared) if (!titlesInCode.has(t)) add('minor', 'PHASE_UNUSED', null, `meta.phases lists "${t}" but no phase('${t}') or { phase: '${t}' } uses it. Titles are matched exactly.`)
} else if (titlesInCode.size && meta) {
  add('minor', 'META_PHASES_MISSING', lead, `the body uses phases (${[...titlesInCode].join(', ')}) but meta has no phases list; add one so the permission dialog shows the plan.`)
}

// null results from parallel()/pipeline()
const resultVars = []
each(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+(parallel|pipeline)\s*\(/, (i, m) => resultVars.push({ name: m[1], fn: m[2], idx: i }))
for (const v of resultVars) {
  const tail = bodyCode.slice(v.idx - bodyStart)
  const chainFiltered = (() => { const c = calls(v.fn, v.idx)[0]; return c && /^\s*\.filter\s*\(\s*Boolean\s*\)/.test(code.slice(c.close + 1)) })()
  const used = new RegExp(`(?<![\\w$])${v.name}(?![\\w$])`, 'g')
  // property access (obj.v) is not a use; spread (...v) is
  const uses = [...tail.matchAll(used)].filter((m) => !(tail[m.index - 1] === '.' && tail.slice(m.index - 3, m.index) !== '...')).length - 1
  const filtered = chainFiltered
    || new RegExp(`${v.name}\\s*\\.filter\\s*\\(\\s*Boolean`).test(tail)
    || new RegExp(`${v.name}\\s*\\.filter\\s*\\(\\s*\\(?\\w+\\)?\\s*=>\\s*\\w+\\s*(&&|\\?\\.|!=)`).test(tail)
    || new RegExp(`${v.name}\\s*\\[\\s*\\w+\\s*\\]\\s*(&&|\\?\\.)`).test(tail)
    || new RegExp(`for\\s*\\(\\s*(const|let)\\s+\\w+\\s+of\\s+${v.name}\\s*\\)[^{]*\\{\\s*if\\s*\\(\\s*!\\s*\\w+\\s*\\)`).test(tail)
  if (uses > 0 && !filtered)
    add('major', 'NULL_NOT_FILTERED', v.idx, `"${v.name}" comes from ${v.fn}() and can hold null for stopped or failed agents; call .filter(Boolean) (or guard each item) before using it.`)
}
each(/return\s+await\s+(parallel|pipeline)\s*\(/, (i, m) => {
  const c = calls(m[1], i)[0]
  if (c && !/^\s*\.filter\s*\(\s*Boolean/.test(code.slice(c.close + 1)))
    add('minor', 'NULL_RETURNED', i, `returning ${m[1]}() results directly passes null slots to the caller; add .filter(Boolean) or report the dropped count with log().`)
})

// loops
each(/\bwhile\s*\(/, (i) => {
  const open = i + code.slice(i).indexOf('(')
  const close = matchBracket(open)
  const cond = code.slice(open + 1, close)
  let bodyOpen = close + 1
  while (/\s/.test(code[bodyOpen] || '')) bodyOpen++
  const bodyClose = code[bodyOpen] === '{' ? matchBracket(bodyOpen) : bodyOpen
  const loopBody = code.slice(bodyOpen, bodyClose + 1)
  const hasBreak = /\bbreak\b/.test(loopBody)
  if (/\bbudget\.remaining\s*\(/.test(cond) && !/\bbudget\.total\b/.test(cond))
    add('blocker', 'BUDGET_UNGUARDED', i, 'budget.remaining() is Infinity when no token target is set, so this loop runs to the 1000-agent cap. Guard with `budget.total &&` and add a hard iteration cap.')
  else if (/^\s*true\s*$/.test(cond) && !hasBreak)
    add('blocker', 'UNBOUNDED_LOOP', i, 'while (true) without break: the run ends only at the 1000-agent cap. Add a counter or a dry-round condition.')
  else if (!/\d/.test(cond) && !/\bbudget\.total\b/.test(cond) && !hasBreak)
    add('major', 'LOOP_NO_HARD_CAP', i, 'loop condition has no numeric cap and the body has no break; a discovery loop needs a hard iteration cap even with a dry-round counter.')
})
each(/\bfor\s*\(\s*(const|let)\s+\w+\s+of\s+[^)]+\)\s*\{?[^}]*?\bawait\s+agent\s*\(/s, (i) => add('minor', 'SEQUENTIAL_LOOP', i, 'for...of with await agent() runs one agent at a time. Intended for dependent steps; otherwise use pipeline() or parallel().'))

// schemas
const schemaConsts = new Map()
each(/\b(?:const|let)\s+(\w+)\s*=\s*\{/, (i, m) => {
  const open = i + code.slice(i).indexOf('{')
  const close = matchBracket(open)
  if (close < 0) return
  const litCode = code.slice(open, close + 1)
  if (!/\btype\s*:/.test(litCode)) return
  const lit = src.slice(open, close + 1)
  let val
  try { val = vm.runInNewContext(`(${lit})`, Object.create(null), { timeout: 500 }) } catch { return }
  schemaConsts.set(m[1], { val, idx: i })
})
for (const [name, { val, idx }] of schemaConsts) {
  if (val.type !== 'object') { add('major', 'SCHEMA_ROOT', idx, `schema ${name}: root must be { type: 'object', properties: {...} }; the runtime rejects other roots.`); continue }
  const props = Object.keys(val.properties || {})
  if (!props.length) add('major', 'SCHEMA_NO_PROPERTIES', idx, `schema ${name} declares no properties; the agent cannot return anything useful.`)
  for (const r of val.required || []) if (!props.includes(r))
    add('blocker', 'SCHEMA_UNSATISFIABLE', idx, `schema ${name}: required "${r}" is not in properties; agent() throws before the subagent starts.`)
  if (val.additionalProperties === false && (val.required || []).some((r) => !props.includes(r)))
    add('blocker', 'SCHEMA_UNSATISFIABLE', idx, `schema ${name}: additionalProperties:false rules out a required key.`)
}

// handoffs read as data without a schema
for (const a of agentCalls) {
  const before = code.slice(Math.max(bodyStart, a.start - 60), a.start)
  const hasSchema = /\bschema\s*:/.test(a.argsCode)
  if (!hasSchema && /(const|let)\s*\{[^}]*\}\s*=\s*await\s*$/.test(before))
    add('major', 'NO_SCHEMA_AT_HANDOFF', a.start, 'result is destructured as an object but agent() has no schema, so it returns prose. Add { schema } so downstream code reads validated fields.')
  if (!hasSchema && /^\s*\.then\s*\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\(?\s*\{[^}]*\.\.\.\1/.test(code.slice(a.close + 1)))
    add('major', 'NO_SCHEMA_AT_HANDOFF', a.start, 'result is spread as an object but agent() has no schema; add one so the fields are validated.')
  if (/\bmodel\s*:/.test(a.argsCode)) add('minor', 'MODEL_OVERRIDE', a.start, 'model override on an agent: default to omitting it (inherits the session model); set effort per stage instead unless a different tier is clearly right.')
  if (/\bconsole\./.test(a.argsCode)) add('minor', 'CONSOLE_IN_ARGS', a.start, 'console inside agent args.')
}

// parallel writers in a shared checkout
const writerVerb = /\b(edit|write|rewrite|migrate|refactor|modify|apply|fix|create (a |the )?file|implement|update the file|commit)\b/i
for (const c of [...parallelCalls, ...pipelineCalls]) {
  const inner = calls('agent', c.open, c.close)
  const writers = inner.filter((a) => writerVerb.test(a.args) && !/\bisolation\s*:/.test(a.argsCode))
  const readOnlyHint = /\b(read[- ]only|do not (edit|modify|write)|don't (edit|modify|write)|report only|no edits)\b/i
  for (const w of writers) {
    if (readOnlyHint.test(w.args)) continue
    add('major', 'PARALLEL_WRITERS_SHARED_CHECKOUT', w.start, 'this agent runs concurrently and its prompt asks for edits, but it has no isolation: "worktree". Parallel writers in one checkout overwrite each other and Claude Code may block the writes. Add isolation or make the prompt read-only.')
  }
}

// worktree base branch
const usesWorktree = agentCalls.some((a) => /\bisolation\s*:\s*['"`]worktree['"`]/.test(a.args))
if (usesWorktree) {
  const candidates = [join(homedir(), '.claude', 'settings.json'), join(settingsDir, '.claude', 'settings.json'), join(settingsDir, '.claude', 'settings.local.json')]
  let baseRef = null
  for (const p of candidates) {
    try { const s = JSON.parse(readFileSync(p, 'utf8')); if (s?.worktree?.baseRef) baseRef = s.worktree.baseRef } catch { /* absent or invalid */ }
  }
  if (baseRef !== 'head')
    add('major', 'WORKTREE_BASEREF_FRESH', null, `isolation: "worktree" branches from the repository default branch (origin/HEAD), not from the current branch, because worktree.baseRef is ${baseRef ? `"${baseRef}"` : 'unset'} in ${candidates.map((c) => c.replace(homedir(), '~')).join(', ')}. Agents will not see feature-branch commits. Set { "worktree": { "baseRef": "head" } } or run from the default branch.`)
  else
    add('minor', 'WORKTREE_INFO', null, 'isolation: "worktree" in use; worktrees land in <repo>/.claude/worktrees/ and branch from HEAD (baseRef = head). Changed worktrees stay on disk; the script must return their branches, it cannot merge.')
  for (const a of agentCalls) if (/\bisolation\s*:/.test(a.argsCode) && /\bcwd\s*:/.test(a.argsCode))
    add('blocker', 'ISOLATION_CWD_CONFLICT', a.start, 'cwd and isolation: "worktree" are mutually exclusive.')
}

// args guard
if (/(?<![\w.$])args\s*[.[]/.test(bodyCode) && !/(args\s*&&|args\s*\?\.|args\s*\?\?|args\s*\|\||\(\s*args\s*\|\|\s*\{\s*\}\s*\)|typeof\s+args|args\s*===?\s*undefined|!args)/.test(bodyCode))
  add('major', 'ARGS_UNGUARDED', at(/(?<![\w.$])args\s*[.[]/), 'args is undefined when the workflow runs without input; `args.x` then throws. Guard with `args && args.x`, `args?.x`, or `const { x } = args || {}`.')
if (/(?<![\w.$])args\s*\.\s*(split|trim|match)\s*\(|JSON\.parse\s*\(\s*args\b/.test(bodyCode))
  add('major', 'ARGS_STRINGIFIED', at(/JSON\.parse\s*\(\s*args\b|args\s*\.\s*(split|trim|match)/), 'args arrives as structured JSON, not a string. Pass arrays/objects as real values and read args.items directly.')

// silent caps and logging
each(/\.slice\s*\(\s*0\s*,/, (i) => add(logCalls.length ? 'minor' : 'major', 'SILENT_CAP', i, 'a top-N slice bounds coverage; log() how many items were dropped so the result is not read as "covered everything".'))
if ((pipelineCalls.length || parallelCalls.length) && !logCalls.length)
  add('minor', 'NO_LOGS', bodyStart, 'no log() calls: log counts at stage transitions so a wrong result can be traced in /workflows.')
each(/\bconsole\.(log|info|warn|error)\s*\(/, (i) => add('minor', 'CONSOLE_LOG', i, 'console.* works but log() is the narrator line shown above the progress tree; prefer it.'))
for (const c of [...parallelCalls, ...pipelineCalls]) for (const a of calls('agent', c.open, c.close))
  if (!/\blabel\s*:/.test(a.argsCode)) { add('minor', 'NO_LABEL', a.start, 'fan-out agent without label: /workflows shows an anonymous row per item.'); break }

// barrier smell
if (parallelCalls.length >= 2 && !pipelineCalls.length)
  add('minor', 'BARRIER_SMELL', parallelCalls[1].start, 'two or more parallel() barriers and no pipeline(): if stage N does not need all of stage N-1 at once (dedup, early exit, cross-item comparison), rewrite as pipeline(items, stage1, stage2) so fast items are not held by slow ones.')
if (workflowCalls.length) add('minor', 'NESTED_WORKFLOW', workflowCalls[0].start, 'workflow() nests one level only; a child cannot call workflow() again.')

// ------------------------------------------------------------- output

const order = { blocker: 0, major: 1, minor: 2 }
findings.sort((a, b) => order[a.severity] - order[b.severity] || (a.line ?? 1e9) - (b.line ?? 1e9))
const counts = { blocker: 0, major: 0, minor: 0 }
for (const f of findings) counts[f.severity]++
const verdict = counts.blocker ? 'FAIL' : counts.major ? 'WARN' : 'PASS'

if (jsonOut) {
  console.log(JSON.stringify({ file, verdict, counts, meta: meta && { name: meta.name, phases: (meta.phases || []).map((p) => p.title) }, agents: agentCalls.length, findings }, null, 2))
} else {
  console.log(`${verdict}  ${file}  (${counts.blocker} blocker, ${counts.major} major, ${counts.minor} minor; ${agentCalls.length} agent() sites${meta?.name ? `; /${meta.name}` : ''})`)
  for (const f of findings) console.log(`  ${f.severity.padEnd(7)} ${f.code.padEnd(32)} ${f.line ? `L${f.line}`.padEnd(6) : '      '} ${f.message}`)
}
process.exit(counts.blocker ? 2 : counts.major ? 1 : 0)

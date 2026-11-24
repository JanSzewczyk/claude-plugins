# Draw in the interface: panes, the band, built-in sites, elements, input, redraw, state

Sources: https://code.claude.com/docs/en/plugins/mods/interface and
https://code.claude.com/docs/en/plugins/mods/gallery (checked against Claude Code 2.1.316; pane
titles, Desktop and 2.1.330 additions checked against the 2.1.330 type declarations and the
Desktop Code tab).
Props per site/element and limits: `reference.md`.

## Contents

- The render cycle
- Worked example: a pane with tabs, a counter and persistence
- Pick where to draw (pane, band, Claude Code's own sites)
- Opening and closing panes
- Rows in the transcript, the band list and agent rows
- Elements and samples
- Presses, typing, keys and focus
- Redrawing
- Keeping state (pointer to api.md)
- Desktop differences
- VS Code differences

## The render cycle

Claude Code fires `ui.render` each time it is about to draw a **render site**. Your hook returns
an element tree (or `next(e)`). A drawing is a snapshot: a callback changes state → calls
`$.ui.invalidate('ui.render')` (or writes `$.state`) → the hook runs again and builds a new tree
from the new state.

In the hook: `e.component` (the site), `e.surface` (`terminal`/`desktop`/`vscode`), `e.props`
(site data), `e.requestId` (for a pane: its `id`), `e.viewport` (`columns`, `rows` of the whole
window, `isFullscreen`; absent until measured in terminal/Desktop).

## Worked example: a pane with tabs, a counter and persistence

`hello-tabs/hooks/hooks.json` → `{ "modules": ["./register.ts"] }`. `register.ts`:

```javascript
const PANE = 'hello-tabs'
const PANE_TITLE = 'Hello tabs'                 // same title on every open (each open retitles)
let tab = 'one'
let count = 0

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hello-tabs', description: 'Open the hello-tabs pane' })
    const saved = await $.store.get('count')
    if (typeof saved === 'number') count = saved
    return next(e)
  })

  on('command.run', { command: 'hello-tabs' }, async ($) => {
    await $.ui.open({ id: PANE, title: PANE_TITLE, focus: true, closeOnEscape: true })
    return {}                                   // print nothing
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)    // leave other mods' panes alone
    const { Box, Text, Button } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')

    const tabButton = (name, label, hotkey) => Button({
      key: 'tab-' + name, label, hotkey, plain: true, dimColor: tab !== name,
      onPress: () => { tab = name; redraw() },
    })

    const body = tab === 'one'
      ? [Text({ children: ['This is the first tab.'] })]
      : [Box({ flexDirection: 'row', columnGap: 2, children: [
          Button({ key: 'more', label: 'Add one', hotkey: 'a', onPress: async () => {
            count += 1; redraw(); await $.store.set('count', count)
          } }),
          Text({ children: ['Count: ' + count] }),
        ] })]

    return Box({ flexDirection: 'column', children: [
      // Heading in the body: with one pane open no surface draws its title (see Pane titles)
      Text({ weight: 'bold', children: [PANE_TITLE] }),
      Box({ flexDirection: 'row', columnGap: 3, children: [tabButton('one', 'One', '1'), tabButton('two', 'Two', '2')] }),
      Text({ children: [' '] }),
      ...body,
    ] })
  })
}
```

Opening a pane draws nothing by itself — Claude Code then fires `ui.render` for it. Try:
`claude --plugin-dir ./hello-tabs`, `/hello-tabs`, press `2`, then `a`.

## Pick where to draw

Always narrow `ui.render` with a matcher (`{ component: 'Pane' }`), otherwise the hook runs for
every site.

- **Pane** (`Pane`): sidebar beside the transcript in a wide fullscreen terminal, otherwise a
  framed region above the prompt. Several panes → tabs with their titles (a lone pane has no
  title drawn: see Pane titles). Check `e.requestId === yourId`, or match both at once with
  `{ component: 'Pane', requestId: PANE }`.
- **Band above the prompt** (`AbovePrompt`): one strip shared by all mods. Return a tree to draw,
  `next(e)` to draw nothing. A tree **replaces** what later mods draw; to keep theirs, put
  `await next(e)` among a `Box`'s children (and don't give that Box or its ancestors `width`,
  `height`, `minWidth`, `minHeight`, `position`, offsets, `display` or `overflow`). Never make the
  band the only place for something the user must answer — the user can collapse it and the mod
  can't tell.
- **Built-in sites**: `UserMessage`, `AssistantMessage`, `ToolUse`, `ToolResult`,
  `ToolGroup`, `CommandOutput`, `AskUserQuestion`, `Spinner`, `ToolProgress`, `TurnDuration`,
  `InfoNotice`, `SessionMode`, `PromptHint`. The **permission prompt is not a site**.

At a built-in site, three choices:

```javascript
let calls = 0   // module-level counter, bumped in a tool.call hook (create.md → first-mod)

// Change a detail: pass changed props to next
on('ui.render', { component: 'Spinner' }, async ($, e, next) =>
  next({ ...e, props: { ...e.props, suffix: ' · tool calls: ' + calls + '…' } }))

// Replace: return your own tree, no next
on('ui.render', { component: 'Spinner' }, async ($, e) => {
  const { Text } = $.ui.resolve(e)
  return Text({ children: ['Claude has made ' + calls + ' tool calls'] })
})

// Wrap: next(e) returns a reference { type: 'engine', ref } to Claude Code's drawing
on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
  const { Box, Text } = $.ui.resolve(e)
  const theirs = await next(e)
  return Box({ flexDirection: 'column', children: [theirs, Text({ children: ['under the spinner'] })] })
})
```

For `AskUserQuestion`, the tree must contain the reference exactly once with your elements
above it, otherwise Claude Code draws its own dialog.

Fit to the site: draw to `e.props.bodyColumns`; for a pane with `placement: 'dock'` (beside the
transcript) `e.props.scroll.bodyRows` is the height; for `placement: 'inline'` (above the
prompt) the pane grows up to `bodyRows`. A taller tree scrolls as a whole.

## Opening and closing panes

```javascript
await $.ui.open({ id: 'hello-tabs', title: 'Hello tabs', focus: true })
await $.ui.close({ id: 'hello-tabs' })
```

| Field | Effect |
|---|---|
| `id` (required) | Pane name: letters, digits, `_`, `-`, ≤64 chars |
| `title` | Tab label when several panes are open (the `id` when omitted); see Pane titles |
| `focus` | Request keyboard focus (granted only while the prompt is empty and nothing else has focus) |
| `closeOnEscape` | Esc closes the pane |
| `holdToasts` | In the terminal, holds all toasts while this pane shows — for dialog-like panes only |
| `rows` | Height when above the prompt (default: a third of the space) |
| `columns` | Width beside the transcript (≤45% of terminal; a user-resized width wins) |

More `$.ui.open` fields (2.1.330 types): `backgroundColor` (what is painted under the body) and
`placement: 'widget'` (start as the small form of a pane on the Desktop app; a request that
surfaces without widgets ignore). `$.ui.panes()` lists this mod's own open panes
(`id`, `title`, `isShown`, `isFocused`, `isPlaced`), also after a reload.

### Pane titles

What the user sees depends on the app (verified in the Desktop Code tab, 2.1.330):

- **Desktop:** all mod panes share **one host tab labelled "Plugin"** next to Background tasks
  and Plan. A mod cannot rename it: no `title`, `displayName` or other field reaches it. Below it
  a second row of tabs shows each pane's `title`, **only while more than one pane is open**; with
  a single pane that row is absent and nothing names the mod.
- **Terminal:** same rule: with several panes each tab shows its `title`, with one pane no title
  is drawn.
- **VS Code:** everything the mod draws is framed and labelled with the plugin's name.

So a mod must not rely on `title` to identify itself. Rules:

1. Put a heading with the mod's name as the first element of the pane body (`Text` with
   `weight: 'bold'`); keep the title and the heading the same text, in one `const`.
2. Pass the same `title` on every `$.ui.open` for that id (auto-open and command): each open
   retitles the pane, so a later open without it falls back to the `id`.
3. Use a human label, not the raw id (`'Tool calls'`, not `'tool-calls'`). No control
   characters (the open is refused), never cut a title with `.slice()` through an emoji
   (drawn as U+FFFD), at most 4,096 characters.
4. If the title is built from data (`kind + ' · ' + slug`), make sure no part can be empty.

`focus`, `closeOnEscape`, `holdToasts` (and `autoFocus` on controls) accept **only `true`**:
passing `false` throws (`ui.open: focus is true or left out`). Add the field conditionally:
`$.ui.open(items.length ? { ...pane, focus: true } : pane)`.

A pane opened **without a user action** (timer, `turn.start`) appears only at ≥144 columns
(110 after the user opened it once). `$.ui.open` resolves `{ isPlaced: true }` or
`{ isPlaced: false, reason }`; a waiting pane appears when the user opens it or widens the
terminal. Use `$.ui.toast` to announce instead. Commands that open panes during a turn need
`immediate: true`. `ui.close` events report `e.origin.kind` `plugin`, `person` or `unload`.

## Rows in the transcript, the band list and agent rows

From the 2.1.330 types; none is in the docs pages the rest of this file follows.

- **`$.ui.place({ id })`** (2.1.314) puts one row at the transcript's end; it scrolls with the
  conversation and a `ui.render` hook on `{ component: 'Placed' }` draws it. Every plugin's
  hook hears every row: read `e.props.id` beside `e.props.plugin` and `next(e)` for others.
  Display only: the model and the transcript file never read it and `--resume` brings none
  back. Resolves `{ isPlaced: true, requestId }` or `{ isPlaced: false, reason }` (nothing
  draws it): reply with text instead. `e.props` also has `onScreen` (which of the row's lines
  the viewport shows; read-only). The 2.1.330 types say the site is raised on every attached
  surface, while a docs summary listed it as terminal-only: check `e.surface` and test it on
  the surfaces you target.
- **`AbovePromptList`** (2.1.323) is the band's arrangement once its rows settled:
  `e.props.rows` in chain order, one per plugin. Hide or reorder them in what `next(e)` gets and
  wrap them by answering around it, never with rows copied by value. A bad answer is passed
  over; to fail closed, answer no rows in `.catch`. A wrapper counts toward the tree limits.
- **`AgentRow`** (2.1.326) is a subagent's row in the at-a-glance agent list. `e.props` is the
  agent's `AgentInfo` (`id`, `description`, `type`, `status`, `parentId`, `name`, `usage`, …,
  `hasRow`) plus `rowIds` and `columns` (read-only), `body` (text that replaces the engine's
  columns, cut at the row's edge; `""` hides the row; may hold SGR styles and OSC 8 links) and
  `isHidden`. Hide, relabel or reword a row by passing changed props to `next`:
  `next({ ...e, props: { ...e.props, isHidden: e.props.status === 'idle' } })`. The Desktop
  shows one line and takes no presses (a Link is drawn as its text, a Button is left out);
  mobile keeps its own row and draws the tree or `body` under it. Some props refresh only every
  five seconds, on `$.ui.invalidate` or with a new status.
- **`e.props.isCollapsed`** on the band (2.1.321) says the user collapsed it.

## Elements and samples

Get elements with `const { Box, Text, Button, … } = $.ui.resolve(e)`. Each is a function taking
props; nested content goes in `children`. In `.tsx`/`.jsx` modules you can write JSX after
destructuring.

Props per element: `reference.md` → Element props, borders, spacing, typography.

| Element | What | Where |
|---|---|---|
| `Box` | Flex container with optional border | Everywhere |
| `Text` | Styled string (`color` is a theme key or a color such as `'red'`; prefer `weight` over deprecated `bold`) | Everywhere |
| `Button` | Pressable control calling `onPress(e)` | Everywhere |
| `Link` | URL with a label | Everywhere (Desktop/VS Code: plain text unless https or http://localhost, no raw `@`, canonical form) |
| `Code` | Syntax-colored source, or a diff with `format: 'diff'` | Everywhere (VS Code: plain text) |
| `Markdown` | Formatted text: content in **`text`**, not `children`; needs `key` with `onLinkPress` | Everywhere |
| `Input` | Text field (`rows` ≥2 for multi-line, v2.1.301+) | Terminal, Desktop, VS Code |
| `Select` | Dropdown (`options` ≥1 with unique values) | Terminal, Desktop, VS Code |
| `Svg` | SVG document | Desktop, VS Code only |
| `Client` | Region drawn by a second file (no mods API) for animation/pointer; posts data as `ui.message`; failures fire `ui.fault` | Terminal, Desktop |
| `Raster` | Grid of colored cells | Terminal only |
| `Image` | Picture from PNG/RGBA bytes or a file | Terminal only (kitty ≥0.28, Ghostty, iTerm2 ≥3.5) |
| `Progress` | Bar with `label` and a value | Every surface, mobile included (2.1.330 types) |

Also in the 2.1.330 types, not covered by the docs pages this file was written from: a fourth
surface `mobile` (`e.surface`; no `Client`; an `Input`/`Select` shows nothing unless the app says
it draws it); `Shader` for a `desktop`/`mobile` backdrop; a `ContextMenu` site for the Desktop
right-click menu (return a `Button` per row or an `https:` `Link`, `next(e)` for none).
`Box overflowX="scroll"`, `Text maxLines` and `wrap="clip"` need 2.1.326: give such a hook a
`.catch` that draws without them for older versions.

Samples (paste into a pane's `return`):

```javascript
Text({ color: 'red', children: ["color: 'red'"] })
Markdown({ text: '## Release notes\n\nThis build has **two** fixes:\n\n- Faster start\n- Fewer prompts' })
Link({ href: 'https://code.claude.com/docs', label: 'Claude Code docs' })
Code({ language: 'javascript', startLine: 1, source: "const name = 'mods'\nconsole.log('hello ' + name)" })
Code({ format: 'diff', source: '@@ -1,3 +1,3 @@\n # Mods\n-A mod is a plugin.\n+A mod is a plugin that runs code.\n Read on.' })
Box({ borderStyle: 'round', paddingX: 1, children: [Text({ children: ["borderStyle: 'round'"] })] })
Button({ key: 'next', label: 'Next', hotkey: 'n', plain: true, onPress: noop })        // draws "n: Next"
Input({ key: 'title', label: 'Title', placeholder: 'Type a title and press Enter', value: '', submitLabel: 'save', onSubmit: noop })
Select({ key: 'format', label: 'Format', value: picked, options: [{ value: 'md', label: 'Markdown' }, { value: 'html', label: 'HTML' }], onSelect: v => { picked = v } })
Svg({ alt: 'Three bars', width: 120, height: 60, source: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">…</svg>' })
```

`Raster`: `cells` is base64 of a `Uint32Array` with three numbers per cell (code point,
24-bit RGB color, background); `0x01000000` = terminal default. Each character must be one cell
wide. Colors are rounded to a smaller palette. Fall back on other surfaces:

```javascript
const DEFAULT_COLOR = 0x01000000
function cellsOf(rows) {
  const numbers = rows.flat().flatMap(([char, color]) => [char.codePointAt(0), color, DEFAULT_COLOR])
  return new Uint8Array(Uint32Array.from(numbers).buffer).toBase64()
}
// in the pane hook:
if (e.surface !== 'terminal') return Text({ children: ['The heat map needs the terminal.'] })
return Raster({ key: 'grid', columns: 3, rows: 2, cells: cellsOf([[['█', 0x2e7d32], ['█', 0xc62828], ['█', 0xf9a825]], [['█', 0x2e7d32], ['█', 0x2e7d32], ['█', 0xf9a825]]]) })
```

Animate an on-screen Raster without re-running the hook:
`$.ui.blit({ requestId: 'heat', key: 'grid', columns: 3, rows: 2, cells: cellsOf(newRows) })`.

`Image`: write stand-alone `alt` text (shown dimmed in other terminals, GNU screen, background
sessions, iTerm2 outside fullscreen). Pass bytes as `source.png`/`source.rgba` base64, not
`source.file`, for iTerm2/tmux users. Inside tmux it needs v2.1.310+, tmux ≥3.3 (not a popup),
`allow-passthrough on` and `focus-events on`.

A tree with an unknown prop or a child where none goes fails validation and the hook is
skipped: `my-mod: ui.render hook skipped: returned the wrong shape (a tree Pane refuses: Text
prop "bogusProp" is not allowed)`.

## Presses, typing, keys and focus

Callbacks run in your module: `Button.onPress(e)` (`e.surface`), `Input.onSubmit(value)` and
`onInput(value)` (multi-line values joined with `\n`), `Select.onSelect(value)`. Submitting an
`Input` doesn't start a turn unless the callback calls `$.prompt.submit`.

Keys: every `Input` and `Select` needs a non-empty string `key`; a `Button` may omit it when it
has a `label` or a single string child (that becomes the key). Keys must be unique per kind
(`is drawn twice; each takes its own key`). Tests and other mods (`ui.press`, `ui.input`,
`ui.select` events) address controls by key. A `Button` may hold strings and `Text` children
(v2.1.295+; give it a `key` or `label`).

Focus: a pane gets keyboard focus when opened with `focus: true` from a command or press, via
Ctrl+X then Tab, or by click (fullscreen). The mod never reads the keyboard itself.

| Key (pane/band focused) | Effect |
|---|---|
| Tab | Next control |
| Up/Down | Move between controls; scroll when content overflows; inside a multi-row Input move rows |
| Enter | Press Button / submit Input / pick in Select |
| Button `hotkey` (one digit or lowercase letter) | Press it (not while an Input has focus) |
| PgUp/PgDn/Home/End | Scroll |
| Ctrl+X then arrow | Resize pane |
| Ctrl+X then X | Close pane |
| Ctrl+X then Ctrl+A | Collapse/expand the band (shows `▸ plugin panel hidden · …`) |
| Esc | Focus back to prompt (closes with `closeOnEscape`) |

Tab and arrows can't be rebound — games steer with `w a s d`. `autoFocus: true` picks the first
focused control. In the terminal a bracketed button doesn't show its hotkey: name the key in
the label or use `plain: true`. Digit hotkeys in the band also fire when the digit is typed
alone into an empty prompt. `action` binds a button to a Claude Code keybinding action. Two
buttons on one hotkey: the later wins. `variant: 'primary'|'secondary'`, `role: 'dismiss'`
(other values throw).

Notes-pane pattern (Input + one row per item, each row's button with its own key):

```javascript
let notes = []
on('ui.render', { component: 'Pane' }, async ($, e, next) => {
  if (e.requestId !== 'notes') return next(e)
  const { Box, Text, Button, Input } = $.ui.resolve(e)
  const redraw = () => $.ui.invalidate('ui.render')
  return Box({ flexDirection: 'column', children: [
    Input({ key: 'new-note', label: 'Note', placeholder: 'Type a note and press Enter', value: '', submitLabel: 'add', autoFocus: true,
      onSubmit: async (value) => { if (!value.trim()) return; notes = [...notes, value.trim()]; redraw(); await $.store.set('notes', notes) } }),
    ...notes.map((note, i) => Box({ flexDirection: 'row', columnGap: 1, children: [
      Button({ key: 'delete-' + i, label: 'x', plain: true,
        onPress: async () => { notes = notes.filter((_, j) => j !== i); redraw(); await $.store.set('notes', notes) } }),
      Text({ children: [note] }),
    ] })),
  ] })
})
```

Passing the same `value` on each redraw keeps what the user is typing; a different `value`
replaces it.

## Redrawing

Claude Code re-runs `ui.render` on its own only when the site's props change, the terminal
width changes, or after your `ui.fault` hooks (so the hook can drop a failed `Client`). It can't
see your variables. Ask explicitly:

- After data changes: `$.ui.invalidate('ui.render')`.
- On a schedule: `$.clock.every(1000, () => $.ui.invalidate('ui.render'))` in `session.start`.
- `$.state` values redraw their readers automatically.

Redraws are throttled to 10/s (30/s in the terminal for the visible pane, expanded band and hint
line); faster calls coalesce and the hook reads the latest data.

## Keeping state

State a drawing reads: `api.md` → Keeping state (variables, `$.state`, `$.store`, reloading
after `/clear`). `$.state` values redraw the sites that read them without `$.ui.invalidate`.

## Desktop differences

- `e.props.placement` is `dock`, `inline` or `widget`; treat any other value as `dock`. `widget`
  is the small form of a minimized pane (clicks may not reach it): draw a glance there and the
  full view otherwise, from the same state. A widget also gets `e.props.anchoredEdges`
  (`['bottom','right']` in that corner, `[]` in the session rail); no call moves it.
- `e.props.isPromptCovered` is `true` while a dialog or field above the prompt takes the keys.
- Mod panes share the one "Plugin" host tab: see Pane titles above.

## VS Code differences

- Panes dock beside the conversation at ≥800 px (`placement: 'dock'`, `isFullscreen: true`),
  otherwise draw above the prompt box (`'inline'`, 12 rows before scrolling). `rows`/`columns`
  of `$.ui.open` are ignored.
- Toasts, status lines and narrow panes share one stack above the prompt box, hidden during
  permission requests or dialogs.
- Everything a mod draws is framed and labeled with the plugin name.
- Buttons have no hotkeys: click or Enter on focus. `autoFocus` does nothing. `focus: true` is
  granted only when the panel has focus, Claude is idle and the prompt box is empty.
- `AskUserQuestion`: the panel keeps its own card and draws your elements above it.
- `$.prompt.suggest` resolves `isShown: false`.
- Ignored props: Box `position`/offsets/`alignSelf`/`borderDimColor`/`hover`; Text
  `size`/`mono`/`tabular`/`hover`; Button `hotkey`/`plain`/`autoFocus`/`action`/`hover`/`variant`/`role`;
  Code `language`/`path`/`startLine`/`format`/`wrap`; Input `rows`; Svg `isInteractive`.

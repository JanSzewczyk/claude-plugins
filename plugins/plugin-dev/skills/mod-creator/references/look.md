# Looks: themes, backdrops, sound and message style (Desktop and mobile)

Source: the Claude Code 2.1.330 type declarations and the built-in `plugin-authoring` skill's
`look.md`, which also ships `make-colors.js` and an `examples/look.ts` (their path is printed
when that skill loads). Not in the docs pages the other references were written from. Read the
generated types (`ThemeSetArgs`, `ThemeStyle`, `ThemeSound`, `ShaderProps`) before relying on a
detail here.

## Contents

- What a look is
- `$.theme.set` and what it draws on
- Colors, backdrop, sound, style
- What fails with no error
- Checking a look

## What a look is

A look changes how a session draws in the **Desktop and mobile apps**. It is data, sent once from
`session.start`; the app draws it from then on. The terminal and editors draw none:
`isDrawn: false` with a `reason` says nothing draws, and `isDrawn: true` only says a client that
draws themes is attached. Permission prompts keep the app's own look.

`$.theme.set({ colors, backdrop, overrideColorScheme, sound, style })` (v2.1.319+; Desktop Code
tab colors need v2.1.324) names the **whole** theme: a later call replaces it, so send everything
in one call. `$.theme.clear()` clears any mod's theme, so call it only when the user asks.
`$.ui.backdrop` was removed in 2.1.319.

## Colors

A theme is about 100 colors per mode under design-system names that can't be guessed; a wrong
name paints nothing and says nothing. Never write them by hand: copy `make-colors.js` and
`make-colors.d.ts` from the built-in `plugin-authoring` skill into the mod's `hooks/` folder and
call `makeColors({ label, roles, light, dark })`, then `$.theme.set({ colors: theme })`.

- Anchors per mode: `surface-0` and `text-primary` required; `surface-1..3`, `text-secondary`,
  `text-muted` optional. `surface-0` is the darkest surface in both modes; later ones are as light
  or lighter.
- Roles: `accent`, `danger`, `success`, `warning`, `pro`, one color each. Every color is six-digit
  hex.
- Work until no line of `problems` starts `Desktop won't paint this theme`: Desktop then ignores
  the whole theme. Other lines are below the design system's bar but still paint.
- Make both modes unless the idea can't (dark is a second version, not an inversion).

## Backdrop

`backdrop` is a still ground (`{ color }`, `{ gradient }`, `{ vector }`, no hook) or a scene
(`{ scene, glass? }`) drawn by a `ui.render` hook on `{ component: 'Backdrop' }` (`e.props.scene`,
`scene` replaced `id` in 2.1.323):

```javascript
on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
  if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
  const { Svg } = $.ui.resolve(e)
  return Svg({ source: SCENE, alt: 'A slow tide coming in' })
})
```

SVG under 131,072 characters, pure vector (no `<image>`, fonts, CDATA), `viewBox` and
`preserveAspectRatio="xMidYMid slice"`, CSS animation inside its own `<style>`, slow motion (a
scene that flashes is held still). A scene the engine refuses still answers `isDrawn: true`; only
the debug log says why. `Shader` (GPU, answers the pointer) has rules in the types.

## Sound and style

- `sound: { ambience?, cues? }`: numbers, never a file; plays after the user presses the speaker
  in the title bar. Cues (`send`, `tool`, `compact`, `done`, `ask`, `error`, `click`) are the
  app's, a mod can't trigger one. Keep it quiet. A build that doesn't take `sound` throws:
  catch it and set the look again without it.
- `style`: restyles the conversation rows (`Text`, `Heading`, `UserMessage`, `AssistantMessage`,
  `ToolUse`) with no `ui.render` hook; lengths are plain numbers of points. Don't draw a message
  as an `Svg`. A rule whose words are under 3:1 on what lies behind draws in the app's own
  colors; accessibility settings win. Catch the throw on older builds as above.

For a mod that plays a clip at an event (not a theme), `$.audio.play({ asset })` plays the
plugin's own file with `afplay` on macOS only; Linux and Windows terminals play nothing.

## What fails with no error

- A `colors` key that isn't a design-system name (`checkColors(colors)` from `make-colors.js`
  names each one).
- A `backdrop` scene with no `ui.render` hook on `Backdrop`.
- A scene the engine refuses (for example an Svg with `<image>`).

## Checking a look

`claude plugin validate` doesn't look inside a look. Run `tsc -p <mod folder>` and annotate a look
kept in a constant as `ThemeSetArgs`, or it widens to `string`. Tests paint nothing: ask the user
to look in both modes, with a long code block and at a larger text size, and to listen for sound.

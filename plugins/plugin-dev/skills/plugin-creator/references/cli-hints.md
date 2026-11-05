# Recommend your plugin from your CLI

If you maintain a CLI or SDK, your tool can prompt Claude Code users to install your plugin. When the tool detects it is running inside Claude Code, it writes a one-line `<claude-code-hint />` tag to stderr; Claude Code removes that line from Bash and PowerShell tool output before the model sees it and shows the user a one-time install prompt. This only works for plugins listed in `claude-plugins-official` or another marketplace with one of Anthropic's official marketplace names; the community marketplace `claude-community` is not one of them. To get a plugin into a marketplace in the first place, see `publish.md`.

## How to emit the hint

1. Gate on the environment, so the tag never appears when a person runs your CLI directly:

   | Variable | Set by | Use it when |
   | :- | :- | :- |
   | `CLAUDECODE` | Every Claude Code version, in Bash and PowerShell tool commands and hook commands. IDE extensions also set it in their integrated terminals | You want the widest reach and accept that a person running your CLI in an IDE terminal also emits the tag |
   | `CLAUDE_CODE_CHILD_SESSION` | Claude Code v2.1.172 and later, only in subprocesses Claude Code itself starts | You can require v2.1.172 or later |

2. Write the tag on its own line to stderr. Node.js:

   ```javascript
   if (process.env.CLAUDECODE) {
     process.stderr.write(
       '<claude-code-hint v="1" type="plugin" value="example-cli@claude-plugins-official" />\n',
     )
   }
   ```

   Shell (the source page also has Python and Go versions):

   ```shell
   if [ -n "$CLAUDECODE" ]; then
     printf '%s\n' '<claude-code-hint v="1" type="plugin" value="example-cli@claude-plugins-official" />' >&2
   fi
   ```

   Replace `example-cli` with your plugin's name in the official marketplace.

3. Emit it on every invocation if convenient: Claude Code prompts for each plugin only once.

## How to test the emitter

1. Run `CLAUDECODE=1 example-cli` and confirm the tag line appears on stderr.
2. Run `example-cli` without the variable and confirm nothing extra prints.

## Hint format

The tag must occupy its own line; a tag embedded mid-line is ignored. All three attributes are required:

| Attribute | Value |
| :- | :- |
| `v` | Protocol version. `1` is the only supported value |
| `type` | Hint kind. `plugin` is the only supported value |
| `value` | Plugin identifier as `name@marketplace` |

Values may be double-quoted or unquoted; an unquoted value cannot contain whitespace. Claude Code removes the line from output even when `v` or `type` is unrecognized.

## How to know when the prompt will appear

The prompt appears only in interactive terminal sessions. In `claude -p` runs, subagent runs and hook command output the tag is stripped and nothing is shown. Every one of these must also hold:

- [ ] **Official and installable**: `value` names a plugin found in Claude Code's local copy of an official marketplace, not already installed, and not blocked by policy.
- [ ] **Analytics on**: no `DISABLE_TELEMETRY`, `DO_NOT_TRACK` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, and not a third-party provider such as Amazon Bedrock where the automatic telemetry opt-out applies.
- [ ] **Within frequency limits**: one prompt per session, one prompt ever per plugin regardless of the answer, none once 100 plugins have been prompted for on that machine.
- [ ] **Not turned off**: the user has not chosen **No, and don't show plugin installation hints again**.
- [ ] **Local, attended session**: the workspace is local, not cloud or remote, and the session is not unattended. A session started with `--cloud`, one serving Remote Control, or an agent-team teammate never prompts.

## What the user sees

A **Plugin recommendation** dialog that names the first word of the shell command Claude ran (so users can spot a mismatch), the plugin, its marketplace and description, and three choices:

| Answer | Effect |
| :- | :- |
| **Yes, install** | Installs the plugin at user scope |
| **No** | Nothing installed; this plugin is not prompted for again |
| **No, and don't show plugin installation hints again** | Turns off all future hint prompts for that user |
| No answer for 30 seconds | Counts as **No** |

## Best practices

- Gate on `CLAUDE_CODE_CHILD_SESSION` when you can require v2.1.172 or later, because `CLAUDECODE` alone also fires in IDE integrated terminals where a person runs your CLI.
- Write the hint to stderr on a line of its own, because a tag embedded mid-line is ignored.
- Use the exact `name@marketplace` your plugin has in the official marketplace, because the prompt appears only for a plugin Claude Code finds there.
- Do not add your own once-only logic, because Claude Code already limits the prompt to once per plugin.
- Test both with and without the variable set, so people running the CLI outside Claude Code never see the tag.
- Make sure the first word of the command Claude runs is recognisably your tool, because the dialog shows it so users can spot a mismatch.

## Pitfalls

- **No prompt while testing.** Walk the checklist above: most often the session is `claude -p`, a subagent or a hook (tag stripped silently), analytics are off, the plugin is not in an official marketplace (`claude-community` is not one), or this plugin was already prompted for once.
- **Tag ignored.** It shares a line with other output, or an unquoted value contains whitespace.
- **Users see the tag in their own terminal.** The emitter is not gated, or it is gated on `CLAUDECODE` and the user runs your CLI in an IDE integrated terminal.

## Sources

- https://code.claude.com/docs/en/plugins/cli-hints (fetched 2026-11-05): [#emit-the-hint](https://code.claude.com/docs/en/plugins/cli-hints#emit-the-hint), [#hint-format](https://code.claude.com/docs/en/plugins/cli-hints#hint-format), [#check-when-the-prompt-appears](https://code.claude.com/docs/en/plugins/cli-hints#check-when-the-prompt-appears), [#preview-what-the-user-sees](https://code.claude.com/docs/en/plugins/cli-hints#preview-what-the-user-sees)
- https://code.claude.com/docs/en/plugins/security#official-marketplace-names
- https://code.claude.com/docs/en/env-vars (`CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION`)
- Related: `publish.md`

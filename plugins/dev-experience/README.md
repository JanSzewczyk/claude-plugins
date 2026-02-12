# dev-experience

Developer experience toolkit for Claude Code — rich statusline with context/cost/token tracking, safety hooks for dangerous command blocking, auto-formatting, and session verification.

## Contents

### Statusline

A 3-line statusline that displays real-time session information:

```
📁 ~/Projects/my-app  🌿 feat/auth  🤖 Claude Opus 4.6  🏷️ 1.0  📟 v1.30.2  🎨 concise
🧠 Context Remaining: 72% [=======---]
💰 $1.23 ($4.50/h)  📊 45832 tok (1204 tpm)
```

**Line 1** — Directory, git branch, model, version, Claude Code version, output style
**Line 2** — Context window remaining with progress bar (color-coded: green > 40%, peach 20-40%, red < 20%)
**Line 3** — Session cost, burn rate ($/hour), total tokens, tokens per minute

Based on [cc-statusline](https://www.npmjs.com/package/@chongdashu/cc-statusline) v1.4.0. Works with bash (jq optional but recommended for full feature support).

### Safety Hooks

| Hook                          | Trigger                 | What it does                                                                                           |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| **SessionStart**              | Session begins          | Prints working directory to stderr                                                                     |
| **PreToolUse (Bash)**         | Before any bash command | Blocks `rm -rf /`, `git push --force`, `drop database`. Allows `git push --force-with-lease`.          |
| **PostToolUse (Edit\|Write)** | After file changes      | Auto-formats with Prettier, auto-fixes with ESLint. Skips `node_modules`, `.next`, `dist`, `.claude/`. |
| **Stop**                      | Before session ends     | Verification prompt (60s): checks all changes complete, no TS errors, follows project patterns.        |

## Installation

### Via Marketplace (recommended)

After installing the plugin from the Szum-Tech marketplace, run the installer pointing at your project:

```bash
# Find the plugin path (typically ~/.claude/installed-plugins/szum-tech/dev-experience)
PLUGIN_DIR="$(find ~/.claude -type d -name 'dev-experience' 2>/dev/null | head -1)"

# Install everything into your project
bash "$PLUGIN_DIR/install.sh" --target ~/Projects/my-app

# Or install selectively
bash "$PLUGIN_DIR/install.sh" --target ~/Projects/my-app --statusline
bash "$PLUGIN_DIR/install.sh" --target ~/Projects/my-app --hooks
```

### From Source

If you cloned the [claude-plugins](https://github.com/AJSzczesniak/claude-plugins) repository:

```bash
# Install everything (uses current directory)
bash plugins/dev-experience/install.sh --all

# Or install selectively
bash plugins/dev-experience/install.sh --statusline
bash plugins/dev-experience/install.sh --hooks

# Or install into a specific project
bash plugins/dev-experience/install.sh --target ~/Projects/my-app --all
```

### What the Script Does

- Copies `statusline.sh` to your project's `.claude/` directory and makes it executable
- Creates or updates `.claude/settings.json` with the statusline config
- Auto-merges safety hooks into `settings.json` (requires `jq`)

### Install Options

| Flag              | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--all`           | Install everything (default when no flags given)      |
| `--statusline`    | Install statusline only                               |
| `--hooks`         | Install safety hooks only                             |
| `--target <path>` | Target project directory (default: current directory) |

### Manual

#### Statusline only

1. Copy the script from the plugin source to your project:

   ```bash
   cp <plugin-dir>/statusline/statusline.sh your-project/.claude/statusline.sh
   chmod +x your-project/.claude/statusline.sh
   ```

2. Add to your `.claude/settings.json`:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": ".claude/statusline.sh",
       "padding": 0
     }
   }
   ```

3. Restart Claude Code.

#### Hooks only

1. Open the hooks reference:

   ```bash
   cat <plugin-dir>/hooks/safety-hooks.json
   ```

2. Merge the `hooks` object into your `.claude/settings.json`:

   ```json
   {
     "hooks": {
       "SessionStart": [ ... ],
       "PreToolUse": [ ... ],
       "PostToolUse": [ ... ],
       "Stop": [ ... ]
     }
   }
   ```

   See `hooks/safety-hooks.json` for the complete configuration.

### Verify

```bash
# Statusline installed?
ls -la your-project/.claude/statusline.sh
# Should be executable (-rwxr-xr-x)

# Settings configured?
grep "statusLine" your-project/.claude/settings.json
# Should show the statusLine config block
```

Start a new Claude Code session — the statusline should appear at the bottom of the terminal.

## Customization

### Statusline

The script supports these environment variables:

| Variable     | Effect                  |
| ------------ | ----------------------- |
| `NO_COLOR=1` | Disable all ANSI colors |

To modify colors, edit the color helper functions at the top of `statusline.sh`:

```bash
dir_color()   → sky blue (38;5;117)
git_color()   → soft green (38;5;150)
model_color() → light purple (38;5;147)
context_color → mint green / peach / coral red (based on remaining %)
cost_color()  → light gold (38;5;222)
usage_color() → lavender (38;5;189)
```

### Hooks

Each hook can be modified independently in your `settings.json`:

- **PostToolUse** — change `prettier` or `eslint` commands to match your project
- **PreToolUse** — add or remove blocked command patterns
- **Stop** — customize the verification prompt

## Requirements

| Dependency | Required             | Notes                                             |
| ---------- | -------------------- | ------------------------------------------------- |
| bash       | Yes                  | Shell for statusline script                       |
| jq         | Recommended          | JSON parsing; bash fallback available but limited |
| prettier   | For PostToolUse hook | Auto-formatting on save                           |
| eslint     | For PostToolUse hook | Auto-fix on save                                  |

## Troubleshooting

| Problem                            | Solution                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Statusline not appearing           | Verify `statusline.sh` is executable (`chmod +x .claude/statusline.sh`) and `settings.json` has `statusLine` |
| Statusline shows "TBD" for context | Context data requires a few API calls before it populates. Wait for the second prompt                        |
| Cost/tokens show as empty          | Ensure your Claude Code version provides cost data in the statusline input JSON                              |
| jq not found warning               | Install jq (`brew install jq` on macOS) or the script will use bash fallback with limited features           |
| PostToolUse hook fails             | Verify `prettier` and `eslint` are available (`npx --yes prettier --version`)                                |
| PreToolUse blocks a safe command   | Edit the regex pattern in the `PreToolUse` hook in your `settings.json`                                      |
| Hooks not installed after script   | jq is required for auto-merge. Without jq, follow the manual instructions printed by the script              |
| Colors look wrong                  | Set `NO_COLOR=1` to disable colors, or edit ANSI color codes in `statusline.sh`                              |

## Related Plugins

- [**code-quality**](../code-quality/) — Code review and auto-formatting complement the safety hooks
- [**nextjs-react**](../nextjs-react/) — PostToolUse hook auto-formats files created by these agents

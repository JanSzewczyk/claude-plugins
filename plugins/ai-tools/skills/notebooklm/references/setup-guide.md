# NotebookLM Setup & Integration Guide

Complete guide for installing, authenticating, and integrating `notebooklm-py` into your workflow.

## Table of Contents

- [Installation](#installation)
- [Authentication](#authentication)
- [Multiple Accounts (Profiles)](#multiple-accounts-profiles)
- [Environment Variables](#environment-variables)
- [CI/CD Integration](#cicd-integration)
- [Headless Servers & Containers](#headless-servers--containers)
- [Platform-Specific Notes](#platform-specific-notes)
- [Agent Integration](#agent-integration)

---

## Installation

### Standard Installation (recommended)

```bash
pip install "notebooklm-py[browser]"
playwright install chromium
```

The `[browser]` extra installs Playwright, needed only for the `notebooklm login` command.
If you plan to use pre-existing auth tokens (CI/CD, headless), you can skip it:

```bash
pip install notebooklm-py
```

### From GitHub (specific version)

```bash
LATEST_TAG=$(curl -s https://api.github.com/repos/teng-lin/notebooklm-py/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
pip install "git+https://github.com/teng-lin/notebooklm-py@${LATEST_TAG}"
```

### Python Compatibility

Python 3.10, 3.11, 3.12, 3.13, 3.14

---

## Authentication

### Browser Login (interactive)

```bash
# Standard login — opens Chromium
notebooklm login

# Using Microsoft Edge (for SSO-required organizations)
notebooklm login --browser msedge

# Verify authentication
notebooklm auth check --test

# Quick test — list notebooks
notebooklm list
```

The login command opens a browser window where you sign in with your Google account.
Session cookies are saved to `~/.notebooklm/profiles/default/storage_state.json`.

Sessions typically last days to weeks. When they expire, run `notebooklm login` again.
CSRF tokens are auto-refreshed — you only need to re-login when underlying cookies expire.

### Diagnostics

```bash
notebooklm auth check          # Quick local validation
notebooklm auth check --test   # Full validation with network test
notebooklm auth check --json   # Machine-readable output
```

---

## Multiple Accounts (Profiles)

Manage multiple Google accounts with named profiles:

```bash
# Create profiles
notebooklm profile create work
notebooklm profile create personal

# Authenticate each
notebooklm -p work login
notebooklm -p personal login

# Use a specific profile
notebooklm -p work list
notebooklm -p personal list

# Switch active profile
notebooklm profile switch work
notebooklm list   # now uses "work"

# List all profiles
notebooklm profile list
```

Each profile has its own `storage_state.json`, `context.json`, and `browser_profile/`
under `~/.notebooklm/profiles/<name>/`.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NOTEBOOKLM_HOME` | Base directory for all config files | `~/.notebooklm` |
| `NOTEBOOKLM_PROFILE` | Active profile name | `default` |
| `NOTEBOOKLM_AUTH_JSON` | Inline authentication JSON (CI/CD) | — |
| `NOTEBOOKLM_LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` | `WARNING` |

### Authentication Precedence

1. `--storage` CLI flag (highest)
2. `NOTEBOOKLM_AUTH_JSON` environment variable
3. Profile path: `$NOTEBOOKLM_HOME/profiles/<profile>/storage_state.json`
4. Default: `~/.notebooklm/profiles/default/storage_state.json`
5. Legacy fallback: `~/.notebooklm/storage_state.json`

---

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  notebook-task:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install notebooklm-py
        run: pip install notebooklm-py

      - name: Run NotebookLM commands
        env:
          NOTEBOOKLM_AUTH_JSON: ${{ secrets.NOTEBOOKLM_AUTH_JSON }}
        run: |
          notebooklm list
          notebooklm ask -n <notebook_id> "Summarize latest changes"
```

### Obtaining the Auth Secret

1. Run `notebooklm login` locally
2. Copy contents of `~/.notebooklm/profiles/default/storage_state.json`
3. Add as GitHub repository secret named `NOTEBOOKLM_AUTH_JSON`
4. Update the secret every 1-2 weeks as cookies expire

### Parallel Agent Safety

When running multiple agents concurrently:

- Always specify notebook IDs explicitly with `-n <id>` (context files can be overwritten)
- Use unique `NOTEBOOKLM_PROFILE` per agent
- Or set distinct `NOTEBOOKLM_HOME` directories

---

## Headless Servers & Containers

Playwright is only required for `notebooklm login`. All other commands use standard HTTP
via `httpx`. This means you can run on headless servers and containers without a browser:

```bash
# On headless machine — no Playwright needed
pip install notebooklm-py

# Option A: Copy auth from local machine
scp ~/.notebooklm/profiles/default/storage_state.json user@server:~/.notebooklm/profiles/default/

# Option B: Use env var
export NOTEBOOKLM_AUTH_JSON='{"cookies": [...]}'

# All commands work except 'login'
notebooklm list
notebooklm ask -n <id> "Summarize the sources"
```

---

## Platform-Specific Notes

### macOS

Works out of the box. If Chromium security warning appears, allow in
System Preferences > Security & Privacy.

### Linux

```bash
# Install Playwright system dependencies first
playwright install-deps chromium
playwright install chromium
```

For headless servers without a display, authenticate on a GUI machine and copy
`storage_state.json`.

If `playwright install chromium` fails with `TypeError: onExit is not a function`:

```bash
python -m venv .venv && source .venv/bin/activate
pip install "playwright==1.57.0"
python -m playwright install chromium
pip install "notebooklm-py[browser]"
```

### Windows

- If CLI hangs at startup (especially in sandboxed environments), the library
  auto-sets `WindowsSelectorEventLoopPolicy` to fix it
- For Unicode errors on non-English locales, set `PYTHONUTF8=1`
- Use forward slashes or raw strings for paths

### WSL

Browser login opens in Windows host browser. Storage file is saved in WSL filesystem.

---

## Agent Integration

### Install as Claude/Agent Skill

```bash
# Installs to ~/.claude/skills/notebooklm and ~/.agents/skills/notebooklm
notebooklm skill install
```

### NPX Installation

```bash
npx skills add teng-lin/notebooklm-py
```

### Check Skill Status

```bash
notebooklm skill status
```

### View Agent-Optimized Instructions

```bash
notebooklm agent show claude   # Claude-optimized instructions
notebooklm agent show codex    # Codex-optimized instructions
```

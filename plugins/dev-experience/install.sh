#!/bin/bash
# dev-experience plugin installer
# Installs statusline and safety hooks into your .claude/ project config.
#
# Usage:
#   bash install.sh [OPTIONS]
#
# Options:
#   --statusline         Install the statusline script only
#   --hooks              Install safety hooks only
#   --all                Install everything (default)
#   --target <path>      Target project directory (default: current working directory)
#
# Examples:
#   # From cloned repository
#   bash plugins/dev-experience/install.sh --all
#
#   # Marketplace — install into a specific project
#   bash ~/.claude/installed-plugins/szum-tech/dev-experience/install.sh --target ~/Projects/my-app

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$1"; }

install_statusline=false
install_hooks=false
target_dir=""

# Parse args
while [ $# -gt 0 ]; do
  case "$1" in
    --statusline) install_statusline=true ;;
    --hooks)      install_hooks=true ;;
    --all)        install_statusline=true; install_hooks=true ;;
    --target)
      shift
      if [ $# -eq 0 ]; then
        echo "Error: --target requires a path argument" >&2
        exit 1
      fi
      target_dir="$1"
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

# Default: install everything if nothing specified
if [ "$install_statusline" = false ] && [ "$install_hooks" = false ]; then
  install_statusline=true
  install_hooks=true
fi

# Resolve target .claude directory
if [ -n "$target_dir" ]; then
  # Expand ~ if present
  target_dir="${target_dir/#\~/$HOME}"
  if [ ! -d "$target_dir" ]; then
    echo "Error: target directory does not exist: $target_dir" >&2
    exit 1
  fi
  TARGET_DIR="$target_dir/.claude"
else
  TARGET_DIR="${CLAUDE_PROJECT_DIR:+${CLAUDE_PROJECT_DIR}/.claude}"
  TARGET_DIR="${TARGET_DIR:-.claude}"
fi

info "Target: $TARGET_DIR"

# Ensure .claude directory exists
mkdir -p "$TARGET_DIR"

# ---- Statusline ----
if [ "$install_statusline" = true ]; then
  info "Installing statusline..."

  cp "$SCRIPT_DIR/statusline/statusline.sh" "$TARGET_DIR/statusline.sh"
  chmod +x "$TARGET_DIR/statusline.sh"
  ok "Copied statusline.sh to $TARGET_DIR/"

  # Check if settings.json exists and already has statusLine
  SETTINGS_FILE="$TARGET_DIR/settings.json"
  if [ -f "$SETTINGS_FILE" ]; then
    if grep -q '"statusLine"' "$SETTINGS_FILE"; then
      warn "settings.json already has a statusLine config — skipping. Verify it points to: .claude/statusline.sh"
    else
      info "Add this to your $SETTINGS_FILE:"
      echo ""
      echo '  "statusLine": {'
      echo '    "type": "command",'
      echo '    "command": ".claude/statusline.sh",'
      echo '    "padding": 0'
      echo '  }'
      echo ""
    fi
  else
    info "No settings.json found. Creating one with statusline config..."
    cat > "$SETTINGS_FILE" << 'SETTINGS_EOF'
{
  "statusLine": {
    "type": "command",
    "command": ".claude/statusline.sh",
    "padding": 0
  }
}
SETTINGS_EOF
    ok "Created $SETTINGS_FILE with statusline config"
  fi

  ok "Statusline installed"
fi

# ---- Hooks ----
if [ "$install_hooks" = true ]; then
  info "Installing safety hooks..."

  SETTINGS_FILE="$TARGET_DIR/settings.json"
  HOOKS_SOURCE="$SCRIPT_DIR/hooks/safety-hooks.json"

  if [ ! -f "$HOOKS_SOURCE" ]; then
    warn "safety-hooks.json not found at $HOOKS_SOURCE"
    exit 1
  fi

  if [ -f "$SETTINGS_FILE" ]; then
    if grep -q '"hooks"' "$SETTINGS_FILE"; then
      warn "settings.json already has hooks — skipping auto-merge."
      info "To update manually, reference: $HOOKS_SOURCE"
    else
      # Auto-merge hooks into existing settings.json
      if command -v jq >/dev/null 2>&1; then
        info "Auto-merging hooks into settings.json..."
        HOOKS_OBJECT=$(jq '.hooks' "$HOOKS_SOURCE" 2>/dev/null)
        if [ -n "$HOOKS_OBJECT" ] && [ "$HOOKS_OBJECT" != "null" ]; then
          MERGED=$(jq --argjson hooks "$HOOKS_OBJECT" '. + {hooks: $hooks}' "$SETTINGS_FILE" 2>/dev/null)
          if [ -n "$MERGED" ]; then
            echo "$MERGED" > "$SETTINGS_FILE"
            ok "Hooks merged into $SETTINGS_FILE"
          else
            warn "jq merge failed. Merge hooks manually from: $HOOKS_SOURCE"
          fi
        else
          warn "Could not parse hooks from $HOOKS_SOURCE"
        fi
      else
        warn "jq not found — cannot auto-merge hooks."
        info "Install jq or manually merge hooks from: $HOOKS_SOURCE"
        echo ""
        echo "Hooks included:"
        echo "  - SessionStart: Session start notification"
        echo "  - PreToolUse:   Block dangerous bash commands (rm -rf /, git push --force, drop database)"
        echo "  - PostToolUse:  Auto-format with prettier + eslint on file save"
        echo "  - Stop:         Verification prompt before session end"
        echo ""
      fi
    fi
  else
    # No settings.json — create one with hooks
    info "No settings.json found. Creating one with hooks..."
    if command -v jq >/dev/null 2>&1; then
      HOOKS_OBJECT=$(jq '.hooks' "$HOOKS_SOURCE" 2>/dev/null)
      jq -n --argjson hooks "$HOOKS_OBJECT" '{hooks: $hooks}' > "$SETTINGS_FILE"
    else
      cp "$HOOKS_SOURCE" "$SETTINGS_FILE"
      # Remove the $schema and version keys since this becomes settings.json
      sed -i.bak '/"$schema"/d; /"version"/d' "$SETTINGS_FILE" 2>/dev/null && rm -f "${SETTINGS_FILE}.bak"
    fi
    ok "Created $SETTINGS_FILE with hooks"
  fi

  ok "Safety hooks installed"
fi

echo ""
ok "dev-experience plugin installation complete"
info "Restart Claude Code to apply changes."

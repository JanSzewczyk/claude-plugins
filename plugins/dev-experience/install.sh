#!/bin/bash
# dev-experience plugin installer
# Installs statusline and safety hooks into your .claude/ project config.
#
# Usage:
#   bash <path-to>/plugins/dev-experience/install.sh [--statusline] [--hooks] [--all]
#
# Options:
#   --statusline   Install the statusline script only
#   --hooks        Install safety hooks only
#   --all          Install everything (default)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${CLAUDE_PROJECT_DIR:-.claude}"

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

# Parse args
if [ $# -eq 0 ]; then
  install_statusline=true
  install_hooks=true
fi

for arg in "$@"; do
  case "$arg" in
    --statusline) install_statusline=true ;;
    --hooks)      install_hooks=true ;;
    --all)        install_statusline=true; install_hooks=true ;;
    *)            echo "Unknown option: $arg"; exit 1 ;;
  esac
done

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
  if [ -f "$SETTINGS_FILE" ]; then
    if grep -q '"hooks"' "$SETTINGS_FILE"; then
      warn "settings.json already has hooks — skipping auto-merge."
      info "Manually merge hooks from: $SCRIPT_DIR/hooks/safety-hooks.json"
    else
      info "Hooks need to be merged into your settings.json manually."
      info "Reference file: $SCRIPT_DIR/hooks/safety-hooks.json"
      echo ""
      echo "Hooks included:"
      echo "  - SessionStart: Session start notification"
      echo "  - PreToolUse:   Block dangerous bash commands (rm -rf /, git push --force, drop database)"
      echo "  - PostToolUse:  Auto-format with prettier + eslint on file save"
      echo "  - Stop:         Verification prompt before session end"
      echo ""
    fi
  fi

  ok "Safety hooks reference installed"
fi

echo ""
ok "dev-experience plugin installation complete"
info "Restart Claude Code to apply changes."

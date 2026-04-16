# NotebookLM CLI Reference

Complete command reference for the `notebooklm` CLI tool (v0.3.4).

## Table of Contents

- [Global Options](#global-options)
- [Session Management](#session-management)
- [Profile Management](#profile-management)
- [Notebook Operations](#notebook-operations)
- [Source Management](#source-management)
- [Chat & Questions](#chat--questions)
- [Research](#research)
- [Content Generation](#content-generation)
- [Downloads](#downloads)
- [Language Configuration](#language-configuration)
- [Sharing & Permissions](#sharing--permissions)
- [Artifacts & Notes](#artifacts--notes)
- [Diagnostics](#diagnostics)

---

## Global Options

| Option | Description |
|--------|-------------|
| `--storage PATH` | Path to `storage_state.json` |
| `-p, --profile NAME` | Use a named profile |
| `-v, --verbose` | Enable verbose output (`-v` INFO, `-vv` DEBUG) |
| `--version` | Show version |
| `--help` | Show help |

Most commands also accept these per-command options:

| Option | Description |
|--------|-------------|
| `-n, --notebook ID` | Specify notebook ID explicitly (overrides current context) |
| `--json` | Machine-parseable JSON output |

---

## Session Management

```bash
notebooklm login                     # Browser-based OAuth login
notebooklm login --browser msedge    # Use Edge (for SSO organizations)
notebooklm auth check                # Quick local auth validation
notebooklm auth check --test         # Full validation with network test
notebooklm auth check --json         # Machine-readable auth status
notebooklm status                    # Show current context
notebooklm status --paths            # Show configuration file paths
notebooklm use <notebook_id>         # Set active notebook context (supports partial IDs)
notebooklm clear                     # Clear current context
```

---

## Profile Management

Manage multiple Google accounts with named profiles:

```bash
notebooklm profile create <name>     # Create a new profile
notebooklm profile list              # List all profiles
notebooklm profile list --json       # List as JSON
notebooklm profile switch <name>     # Switch active profile
notebooklm profile delete <name>     # Delete a profile
notebooklm profile rename <old> <new>  # Rename a profile
notebooklm -p <name> <command>       # Use specific profile for one command
```

Each profile has its own `storage_state.json`, `context.json`, and `browser_profile/`
under `~/.notebooklm/profiles/<name>/`.

---

## Notebook Operations

```bash
notebooklm list                      # List all notebooks
notebooklm list --json               # List as JSON
notebooklm create "Notebook Name"    # Create new notebook
notebooklm delete <notebook_id>      # Delete notebook (requires confirmation)
notebooklm rename "New Name"         # Rename current notebook
notebooklm summary                   # Get AI-generated notebook summary
notebooklm metadata                  # Show active notebook metadata
notebooklm metadata --json           # Metadata as JSON
```

---

## Source Management

### Adding Sources

```bash
# URLs (auto-detected)
notebooklm source add "https://example.com/article"
notebooklm source add "https://youtube.com/watch?v=..."

# Local files (PDF, DOCX, MD, TXT, audio, video, images)
notebooklm source add "./paper.pdf"
notebooklm source add "./notes.md"

# Inline text
notebooklm source add "Your text content here"
notebooklm source add "My notes here" --title "Research Notes"

# Explicit type override
notebooklm source add "content" --type url|text|file|youtube

# Google Drive source
notebooklm source add-drive <file_id> "Title" --mime-type google-doc|google-slides|google-sheets|pdf

# AI-powered web research
notebooklm source add-research "search query" --mode fast
notebooklm source add-research "search query" --mode deep
notebooklm source add-research "topic" --from drive           # Search Google Drive
notebooklm source add-research "topic" --import-all           # Auto-import all results
notebooklm source add-research "topic" --mode deep --no-wait  # Non-blocking
```

### Managing Sources

```bash
notebooklm source list                    # List all sources in active notebook
notebooklm source list --json             # List as JSON
notebooklm source get <source_id>         # Get source details
notebooklm source delete <source_id>      # Delete a source
notebooklm source delete-by-title "Title" # Delete by exact title
notebooklm source fulltext <id>           # Get indexed content (CLI-exclusive)
notebooklm source fulltext <id> -o file   # Save fulltext to file
notebooklm source guide <id>              # Get AI-generated source guide (summary + keywords)
notebooklm source guide <id> --json       # Guide as JSON
notebooklm source refresh <id>            # Re-index a source
notebooklm source rename <id> "New Title" # Rename source
notebooklm source stale                   # Check for stale sources
notebooklm source wait <id>               # Wait for source processing to complete
notebooklm source wait <id> --timeout 120 --interval 5  # Custom timeout and poll interval
```

---

## Chat & Questions

```bash
# Ask questions about notebook sources
notebooklm ask "What are the main findings?"
notebooklm ask "Compare methodology in sources 1 and 3"
notebooklm ask "Summarize in bullet points" --save-as-note
notebooklm ask "Summarize" --save-as-note --note-title "Key Summary"

# Limit to specific sources
notebooklm ask -s <source_id_1> -s <source_id_2> "Question about these sources"

# Continue a specific conversation
notebooklm ask -c <conversation_id> "Follow-up question"

# JSON output with source references
notebooklm ask "Explain X" --json

# Configure chat persona
notebooklm configure --mode learning-guide

# Conversation history
notebooklm history                        # View conversation history (preview)
notebooklm history --show-all             # Full Q&A content
notebooklm history -l 5                   # Limit to last 5 turns
notebooklm history --clear                # Clear local conversation cache
notebooklm history --save                 # Save history as a note
notebooklm history --save --note-title "Summary"  # Save with custom title
notebooklm history --json                 # Machine-readable JSON output
```

---

## Research

Research is started via `source add-research` and monitored with `research` commands:

```bash
# Start non-blocking research
notebooklm source add-research "AI safety" --mode deep --no-wait

# Monitor research status
notebooklm research status                # Non-blocking check
notebooklm research status --json         # JSON output

# Wait for completion
notebooklm research wait                  # Block until done
notebooklm research wait --import-all     # Auto-import all found sources
notebooklm research wait --timeout 300    # Custom timeout
```

---

## Content Generation

All generation commands support:
- `--wait` to block until completion
- `--retry N` for automatic exponential backoff on rate limiting
- `-s, --source <id>` to limit to specific sources (repeatable)
- `--language <code>` to override output language
- `--json` for machine-readable output

### Audio Podcasts

```bash
notebooklm generate audio                           # Default deep-dive
notebooklm generate audio "Focus on controversies"  # Custom instructions
notebooklm generate audio --format debate            # Debate format
notebooklm generate audio --format brief --length short  # Brief and short
notebooklm generate audio --wait                     # Wait for completion
notebooklm generate audio --retry 3                  # Retry on rate limit
notebooklm generate audio -s src_001 -s src_002 "from specific sources"
```

| Option | Values |
|--------|--------|
| `--format` | `deep-dive` (default), `brief`, `critique`, `debate` |
| `--length` | `short`, `default`, `long` |
| `--language` | 80+ language codes (e.g. `en`, `pl`, `ja`, `zh_Hans`) |

### Video

```bash
notebooklm generate video --wait
notebooklm generate video "a funny explainer for kids" --style kawaii --wait
notebooklm generate video --format brief --style classic --wait
notebooklm generate cinematic-video "documentary overview" --wait
```

| Option | Values |
|--------|--------|
| `--format` | `explainer` (default), `brief`, `cinematic` |
| `--style` | `auto`, `classic`, `whiteboard`, `kawaii`, `anime`, `watercolor`, `retro-print`, `heritage`, `paper-craft` |

Cinematic videos use Veo 3 AI, take 30-40 min, and ignore `--style`.

### Study Materials

```bash
notebooklm generate quiz                             # Default difficulty
notebooklm generate quiz --difficulty hard            # Hard quiz
notebooklm generate quiz --quantity more              # More questions
notebooklm generate flashcards                        # Default
notebooklm generate flashcards --difficulty easy --quantity fewer
```

| Option | Values |
|--------|--------|
| `--difficulty` | `easy`, `medium`, `hard` |
| `--quantity` | `fewer`, `standard`, `more` |

### Documents & Visuals

```bash
# Slide deck
notebooklm generate slide-deck                        # Default
notebooklm generate slide-deck --format presenter     # With speaker notes
notebooklm generate slide-deck --length short         # Shorter deck
notebooklm generate slide-deck "executive summary" --format presenter --length short

# Infographic
notebooklm generate infographic                       # Default (landscape)
notebooklm generate infographic --orientation portrait
notebooklm generate infographic --detail detailed --style professional
notebooklm generate infographic --style bento-grid --orientation square

# Mind map (synchronous — returns immediately)
notebooklm generate mind-map

# Data table
notebooklm generate data-table "Extract all stats"
```

**Slide deck options:**

| Option | Values |
|--------|--------|
| `--format` | `detailed` (default), `presenter` |
| `--length` | `default`, `short` |

**Infographic options:**

| Option | Values |
|--------|--------|
| `--orientation` | `landscape` (default), `portrait`, `square` |
| `--detail` | `concise`, `standard` (default), `detailed` |
| `--style` | `auto`, `sketch-note`, `professional`, `bento-grid`, `editorial`, `instructional`, `bricks`, `clay`, `anime`, `kawaii`, `scientific` |

### Reports

```bash
notebooklm generate report --format briefing-doc      # Executive briefing
notebooklm generate report --format study-guide        # Study guide
notebooklm generate report --format blog-post          # Blog post
notebooklm generate report --format custom --append "Custom template prompt"
notebooklm generate report --format study-guide --append "For beginners"
```

| Option | Values |
|--------|--------|
| `--format` | `briefing-doc`, `study-guide`, `blog-post`, `custom` |
| `--append` | Extra instructions appended to built-in template (no effect with `--format custom`) |

### Slide Revision (CLI-exclusive)

```bash
# Revise individual slides with natural language (zero-based slide index)
notebooklm generate revise-slide "Add more examples" --artifact <artifact_id> --slide 2
notebooklm generate revise-slide "Make bullet points more concise" --artifact <id> --slide 0 --wait
```

---

## Downloads

All download commands support:
- `--latest` (default) — download most recent artifact
- `--earliest` — download oldest artifact
- `--all` — download all artifacts of this type
- `--name TEXT` — filter by title (fuzzy match)
- `-a, --artifact ID` — select specific artifact by ID
- `--force` — overwrite existing files
- `--no-clobber` — skip if file exists
- `--dry-run` — preview without downloading

```bash
# Audio & Video
notebooklm download audio ./podcast.mp3
notebooklm download video ./explainer.mp4
notebooklm download cinematic-video ./cinematic.mp4

# Documents
notebooklm download slide-deck ./slides.pdf            # PDF format (default)
notebooklm download slide-deck --format pptx ./slides.pptx  # Editable PPTX
notebooklm download report ./report.md

# Study Materials
notebooklm download quiz --format markdown ./quiz.md
notebooklm download quiz --format json ./quiz.json
notebooklm download quiz --format html ./quiz.html
notebooklm download flashcards --format json ./cards.json
notebooklm download flashcards --format markdown ./cards.md
notebooklm download flashcards --format html ./cards.html

# Visuals & Data
notebooklm download infographic ./visual.png
notebooklm download mind-map ./map.json
notebooklm download data-table ./data.csv

# Batch download
notebooklm download audio --all ./audio/
notebooklm download audio --name "chapter 3" ./specific.mp3
```

---

## Language Configuration

```bash
notebooklm language list             # Show 80+ available languages
notebooklm language get              # Show current language setting
notebooklm language set pl           # Set to Polish
notebooklm language set zh_Hans      # Simplified Chinese
notebooklm language set ja           # Japanese
```

Language setting affects all generated artifact output globally.
Override per command using `--language` flag on generation commands.

---

## Sharing & Permissions

```bash
# View sharing status
notebooklm share status              # Show current sharing status
notebooklm share status --json       # JSON output

# Public link sharing
notebooklm share public --enable     # Enable public link
notebooklm share public --disable    # Disable public link

# View level for viewers
notebooklm share view-level full     # Viewers see full notebook
notebooklm share view-level chat     # Viewers see chat only

# User management
notebooklm share add user@example.com --permission viewer     # Add as viewer
notebooklm share add user@example.com --permission editor     # Add as editor
notebooklm share add user@example.com --permission viewer -m "Welcome!"  # With message
notebooklm share add user@example.com --permission viewer --no-notify    # No email notification
notebooklm share update user@example.com --permission editor  # Change permission
notebooklm share remove user@example.com                      # Remove access
```

---

## Artifacts & Notes

### Artifacts

```bash
# List generated artifacts
notebooklm artifact list
notebooklm artifact list --json
notebooklm artifact list --type audio     # Filter by type

# Get artifact details
notebooklm artifact get <artifact_id>

# Poll for generation status
notebooklm artifact poll <task_id>

# Wait for artifact completion
notebooklm artifact wait <task_id>
notebooklm artifact wait <task_id> --timeout 600 --interval 10

# Rename artifact
notebooklm artifact rename <id> "New Title"

# Delete artifact
notebooklm artifact delete <id>

# Export to Google Docs or Sheets
notebooklm artifact export <id> --type docs
notebooklm artifact export <id> --type sheets --title "My Export"

# Get generation suggestions
notebooklm artifact suggestions
notebooklm artifact suggestions -s <source_id> --json
```

### Notes

```bash
notebooklm note list                          # List notes
notebooklm note create "Note content"         # Create a note
notebooklm note get <id>                      # Get note details
notebooklm note save <id> --title "Title" --content "Content"  # Update note
notebooklm note rename <id> "New Title"       # Rename note
notebooklm note delete <id>                   # Delete note
```

---

## Diagnostics

```bash
# Debug mode
NOTEBOOKLM_LOG_LEVEL=DEBUG notebooklm list
NOTEBOOKLM_LOG_LEVEL=INFO notebooklm source add "https://example.com"

# Agent-optimized instructions
notebooklm agent show claude         # Claude-optimized instructions
notebooklm agent show codex          # Codex-optimized instructions

# Skill management
notebooklm skill install             # Install as agent skill
notebooklm skill status              # Check skill installation
notebooklm skill uninstall           # Remove skill
```

---

## Useful Patterns

### Batch Workflow

```bash
# Create notebook, add multiple sources, generate content
notebooklm create "Weekly Digest" && \
notebooklm source add "https://article1.com" && \
notebooklm source add "https://article2.com" && \
notebooklm generate audio "Create a weekly news digest" --wait && \
notebooklm download audio ./weekly-digest.mp3
```

### JSON Output for Scripts

```bash
# Get notebook ID programmatically
NB_ID=$(notebooklm list --json | jq -r '.[0].id')
notebooklm ask -n "$NB_ID" "Summarize" --json | jq '.answer'
```

### Non-blocking Research Pipeline

```bash
notebooklm source add-research "AI papers 2026" --mode deep --no-wait
notebooklm research status
notebooklm research wait --import-all
notebooklm generate audio "Summarize the research findings" --wait
```

# NotebookLM CLI Reference

Complete command reference for the `notebooklm` CLI tool.

## Table of Contents

- [Global Options](#global-options)
- [Session Management](#session-management)
- [Notebook Operations](#notebook-operations)
- [Source Management](#source-management)
- [Chat & Research](#chat--research)
- [Content Generation](#content-generation)
- [Downloads](#downloads)
- [Language Configuration](#language-configuration)
- [Sharing & Permissions](#sharing--permissions)
- [Artifacts & Notes](#artifacts--notes)

---

## Global Options

| Option | Description |
|--------|-------------|
| `--storage PATH` | Path to `storage_state.json` |
| `-p, --profile NAME` | Use a named profile |
| `-n, --notebook ID` | Specify notebook ID explicitly |
| `-v, --verbose` | Enable verbose output |
| `--json` | Machine-parseable JSON output |
| `--version` | Show version |
| `--help` | Show help |

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
notebooklm use <notebook_id>         # Set active notebook context
notebooklm clear                     # Clear current context
```

### Profile Management

```bash
notebooklm profile create <name>     # Create a new profile
notebooklm profile list              # List all profiles
notebooklm profile switch <name>     # Switch active profile
notebooklm -p <name> <command>       # Use specific profile for one command
```

---

## Notebook Operations

```bash
notebooklm list                      # List all notebooks
notebooklm list --json               # List as JSON
notebooklm create "Notebook Name"    # Create new notebook
notebooklm delete <notebook_id>      # Delete notebook (requires confirmation)
notebooklm rename <id> "New Name"    # Rename notebook
notebooklm metadata                  # Show active notebook metadata
notebooklm metadata --json           # Metadata as JSON
```

---

## Source Management

### Adding Sources

```bash
# URLs
notebooklm source add "https://example.com/article"
notebooklm source add "https://youtube.com/watch?v=..."

# Local files (PDF, DOCX, MD, TXT, audio, video, images)
notebooklm source add "./paper.pdf"
notebooklm source add "./notes.md"

# Pasted text (when file path is not a URL or existing file)
notebooklm source add "Your text content here"

# AI-powered web research
notebooklm source add-research "search query" --mode fast
notebooklm source add-research "search query" --mode deep

# Google Drive research
notebooklm source add-drive "search query"

# Wait for indexing to complete
notebooklm source add "https://example.com" --wait
```

### Managing Sources

```bash
notebooklm source list               # List all sources in active notebook
notebooklm source list --json        # List as JSON
notebooklm source delete <source_id> # Delete a source
notebooklm source delete-by-title "Title"  # Delete by exact title
notebooklm source fulltext <id>      # Get indexed content (CLI-exclusive)
notebooklm source guide <id>         # Get AI-generated source guide
notebooklm source refresh <id>       # Re-index a source
notebooklm source rename <id> "New Title"  # Rename source
```

---

## Chat & Research

```bash
# Ask questions about notebook sources
notebooklm ask "What are the main findings?"
notebooklm ask "Compare methodology in sources 1 and 3"
notebooklm ask "Summarize in bullet points" --save-as-note

# Conversation management
notebooklm chat history              # View conversation history
notebooklm chat clear                # Clear conversation

# Web research
notebooklm research web "topic" --mode fast    # Quick research
notebooklm research web "topic" --mode deep    # Thorough research
notebooklm research drive "topic"              # Search Google Drive
```

---

## Content Generation

All generation commands support `--wait` to block until completion and `--retry N`
for automatic exponential backoff on rate limiting.

### Audio Podcasts

```bash
notebooklm generate audio                           # Default deep-dive
notebooklm generate audio "Focus on controversies"  # Custom instructions
notebooklm generate audio --wait                     # Wait for completion
notebooklm generate audio --retry 3                  # Retry on rate limit
```

Formats: `deep-dive` (default), `brief`, `critique`, `debate`
Lengths: short, medium, long
Languages: 50+ (set via `notebooklm language set <code>`)

### Video

```bash
notebooklm generate video --wait
notebooklm generate video --style whiteboard --wait
notebooklm generate cinematic-video "noir style with dramatic music" --wait
```

Styles: whiteboard, colorful, corporate, and more. 3 formats, 9 visual styles.

### Study Materials

```bash
notebooklm generate quiz                             # Default difficulty
notebooklm generate quiz --difficulty hard            # Hard quiz
notebooklm generate quiz --quantity more              # More questions
notebooklm generate flashcards                        # Default
notebooklm generate flashcards --difficulty hard --quantity more
```

### Documents & Visuals

```bash
notebooklm generate slide-deck                       # Presentation slides
notebooklm generate infographic                      # Default orientation
notebooklm generate infographic --orientation portrait
notebooklm generate infographic --detail-level detailed
notebooklm generate mind-map                         # Hierarchical mind map
notebooklm generate data-table "Extract all stats"   # Structured data
```

### Reports

```bash
notebooklm generate report --type briefing           # Executive briefing
notebooklm generate report --type study-guide        # Study guide
notebooklm generate report --type blog-post          # Blog post
notebooklm generate report --custom "Custom template prompt"
```

### Slide Revision (CLI-exclusive)

```bash
# Revise individual slides with natural language
notebooklm slide revise <slide_number> "Add more examples to this slide"
notebooklm slide revise 3 "Make the bullet points more concise"
```

---

## Downloads

```bash
# Audio & Video
notebooklm download audio ./podcast.mp3
notebooklm download video ./explainer.mp4
notebooklm download cinematic-video ./cinematic.mp4

# Documents
notebooklm download slide-deck ./slides.pdf         # PDF format
notebooklm download slide-deck ./slides.pptx         # Editable PPTX
notebooklm download report ./report.md

# Study Materials
notebooklm download quiz --format markdown ./quiz.md
notebooklm download quiz --format json ./quiz.json
notebooklm download quiz --format html ./quiz.html
notebooklm download flashcards --format json ./cards.json
notebooklm download flashcards --format markdown ./cards.md

# Visuals & Data
notebooklm download infographic ./visual.png
notebooklm download mind-map ./map.json
notebooklm download data-table ./data.csv
```

---

## Language Configuration

```bash
notebooklm language list             # Show available languages
notebooklm language set pl           # Set to Polish
notebooklm language set zh_Hans      # Simplified Chinese
notebooklm language set ja           # Japanese
```

Language setting affects all generated artifact output globally.
Override per command using `--language` flag on generation commands.

---

## Sharing & Permissions

```bash
notebooklm share status              # View current sharing status
notebooklm share create-link         # Generate public shareable link
notebooklm share set <email> viewer  # Set user as viewer
notebooklm share set <email> editor  # Set user as editor
```

---

## Artifacts & Notes

```bash
# List generated artifacts
notebooklm artifact list
notebooklm artifact list --json

# Poll for generation status
notebooklm artifact poll <task_id>

# Wait for artifact completion
notebooklm artifact wait <task_id>

# Notes
notebooklm note create "Note title" "Note content"
notebooklm note list
```

---

## Useful Patterns

### Batch Workflow

```bash
# Create notebook, add multiple sources, generate content
notebooklm create "Weekly Digest" && \
notebooklm source add "https://article1.com" --wait && \
notebooklm source add "https://article2.com" --wait && \
notebooklm generate audio "Create a weekly news digest" --wait && \
notebooklm download audio ./weekly-digest.mp3
```

### JSON Output for Scripts

```bash
# Get notebook ID programmatically
NB_ID=$(notebooklm list --json | jq -r '.[0].id')
notebooklm ask -n "$NB_ID" "Summarize" --json | jq '.answer'
```

### Debug Mode

```bash
NOTEBOOKLM_LOG_LEVEL=DEBUG notebooklm list
NOTEBOOKLM_LOG_LEVEL=INFO notebooklm source add "https://example.com"
```

---
name: notebooklm
description: >
  Automate Google NotebookLM via the notebooklm-py CLI and Python API — create notebooks,
  add sources (URLs, PDFs, YouTube, Drive), ask questions, generate podcasts/videos/quizzes/reports,
  and download artifacts. Use this skill whenever the user mentions NotebookLM, wants to create
  audio overviews or podcasts from documents, generate study materials (quizzes, flashcards),
  produce video explainers, build mind maps or infographics from research, or needs to
  programmatically interact with Google NotebookLM in any way. Also use when the user asks
  about setting up notebooklm-py, authenticating with NotebookLM, or integrating NotebookLM
  into scripts and CI/CD pipelines.
---

# NotebookLM CLI & Python API

Skill for automating Google NotebookLM through the `notebooklm-py` package — an unofficial
Python client that provides CLI and async Python API access to NotebookLM features, many of
which go beyond what the web interface offers.

> **Important**: This uses undocumented Google APIs. It is a community project, not affiliated
> with Google. Rate limiting may apply with heavy usage.

## Quick Setup

Before using any commands, the user needs to install and authenticate:

```bash
# Install
pip install "notebooklm-py[browser]"
playwright install chromium

# Authenticate (opens browser for Google login)
notebooklm login

# Verify
notebooklm list

# Check environment health
notebooklm auth check --test
```

For detailed setup instructions including platform-specific issues, multiple accounts,
CI/CD configuration, and troubleshooting, read `references/setup-guide.md`.

## Core Workflow

A typical NotebookLM workflow follows this pattern:

### 1. Create a Notebook

```bash
notebooklm create "My Research Project"
```

### 2. Add Sources

```bash
# URLs, PDFs, YouTube, local files
notebooklm source add "https://example.com/article"
notebooklm source add "./research-paper.pdf"
notebooklm source add "https://youtube.com/watch?v=..."

# Google Drive source
notebooklm source add-drive <file_id> "Document Title" --mime-type google-doc

# Web research (AI-powered source discovery)
notebooklm source add-research "quantum computing breakthroughs 2026"
notebooklm source add-research "topic" --from drive --mode deep
```

Supported formats: PDFs, Word docs, Markdown, plain text, audio/video files, images,
Google Drive documents, YouTube videos, pasted text.

Source limits per plan: Standard (50), Plus (100), Pro (300), Ultra (600).

### 3. Ask Questions

```bash
notebooklm ask "What are the key findings across all sources?"
notebooklm ask "Compare the methodologies used in sources 1 and 3"
notebooklm ask "Summarize key points" --save-as-note
```

### 4. Generate Content

This is where NotebookLM shines. Generate rich artifacts from your sources:

```bash
# Audio podcast (deep-dive, brief, critique, or debate format)
notebooklm generate audio "Focus on practical implications" --wait
notebooklm generate audio --format debate --length long --wait

# Video explainer (9 visual styles available)
notebooklm generate video --format explainer --style whiteboard --wait
notebooklm generate cinematic-video "documentary overview" --wait

# Study materials
notebooklm generate quiz --difficulty hard --quantity more
notebooklm generate flashcards --difficulty medium --quantity standard

# Documents and visuals
notebooklm generate slide-deck --format presenter --length short
notebooklm generate infographic --orientation portrait --detail detailed --style professional
notebooklm generate mind-map
notebooklm generate report --format briefing-doc
notebooklm generate report --format custom --append "Focus on actionable insights"

# Data extraction
notebooklm generate data-table "Extract all statistics mentioned"

# Source filtering — limit to specific sources
notebooklm generate audio -s <source_id_1> -s <source_id_2> "from these sources only" --wait

# Rate limit handling — automatic exponential backoff
notebooklm generate audio --retry 3 --wait
```

### 5. Download Artifacts

```bash
notebooklm download audio ./podcast.mp3
notebooklm download video ./explainer.mp4
notebooklm download cinematic-video ./cinematic.mp4
notebooklm download slide-deck ./slides.pdf
notebooklm download slide-deck --format pptx ./slides.pptx
notebooklm download quiz --format markdown ./quiz.md
notebooklm download quiz --format json ./quiz.json
notebooklm download quiz --format html ./quiz.html
notebooklm download flashcards --format json ./cards.json
notebooklm download infographic ./visual.png
notebooklm download mind-map ./map.json
notebooklm download data-table ./data.csv
notebooklm download report ./report.md

# Download options
notebooklm download audio --all ./audio/         # Download all audio artifacts
notebooklm download audio --name "chapter 3"     # Filter by title (fuzzy match)
notebooklm download audio -a <artifact_id>       # Select specific artifact
notebooklm download audio --dry-run              # Preview without downloading
```

## Generation Timeframes

Different artifacts take varying amounts of time:

| Artifact | Typical Duration |
|----------|-----------------|
| Mind maps | Instant (synchronous) |
| Quizzes, flashcards | 1-5 minutes |
| Audio podcasts | 5-15 minutes |
| Reports, slide decks | 5-15 minutes |
| Video explainers | 10-30 minutes |
| Cinematic videos (Veo 3) | 30-40 minutes |
| Source indexing | 30 seconds - 10 minutes |

For long-running operations, use `--wait` flag or poll with `notebooklm artifact list`.

## Audio Generation Options

Audio is one of the most powerful features. Available options:

- **Formats** (`--format`): `deep-dive` (default), `brief`, `critique`, `debate`
- **Lengths** (`--length`): `short`, `default`, `long`
- **Languages**: 80+ languages supported

```bash
# Custom podcast with specific instructions
notebooklm generate audio "Make it conversational, focus on the controversies" --wait

# Debate format, long length
notebooklm generate audio --format debate --length long --wait

# Set language
notebooklm language set pl  # Polish
notebooklm generate audio --wait
```

## Video Generation Options

- **Formats** (`--format`): `explainer` (default), `brief`, `cinematic` (Veo 3 AI)
- **Styles** (`--style`): `auto`, `classic`, `whiteboard`, `kawaii`, `anime`, `watercolor`, `retro-print`, `heritage`, `paper-craft`

```bash
notebooklm generate video --style anime --wait
notebooklm generate cinematic-video "noir style with dramatic music" --wait
```

## Python API

For programmatic workflows, use the async Python API:

```python
import asyncio
from notebooklm import NotebookLMClient

async def main():
    async with await NotebookLMClient.from_storage() as client:
        # Create notebook and add sources
        nb = await client.notebooks.create("Research")
        source = await client.sources.add_url(nb.id, "https://example.com")

        # Chat
        result = await client.chat.ask(nb.id, "Summarize key points")
        print(result.answer)

        # Generate and download podcast
        status = await client.artifacts.generate_audio(nb.id, instructions="make it fun")
        await client.artifacts.wait_for_completion(nb.id, status.task_id)
        await client.artifacts.download_audio(nb.id, "podcast.mp3")

asyncio.run(main())
```

For full Python API reference with all methods, see `references/python-api.md`.

## CLI Command Reference

For the complete CLI command reference including all flags, options, and advanced features
(profiles, sharing, research modes, slide revision), see `references/cli-reference.md`.

## Troubleshooting

Common issues:

- **Environment check**: Run `notebooklm auth check --test` to diagnose authentication issues
- **Auth errors**: Run `notebooklm auth check --test` to diagnose, then `notebooklm login` to re-authenticate
- **Rate limiting**: Wait 5-10 minutes, use `--retry` flag for automatic backoff
- **Generation stuck**: Use `--wait` or poll with `artifact list` / `artifact poll <task_id>`
- **CSRF token issues**: Usually auto-refreshed; if persistent, run `notebooklm login`

For platform-specific issues and detailed troubleshooting, see `references/troubleshooting.md`.

## Key Tips

- Always use `--wait` for generation commands when you need to download immediately after
- Use `--json` flag on most commands for machine-parseable output
- For parallel agent workflows, pass explicit notebook IDs with `-n` flag instead of relying on context
- Use profiles (`-p work`) to manage multiple Google accounts
- Source indexing takes time — use `notebooklm source wait <id>` before asking questions or generating content
- The `source fulltext` command retrieves indexed content (not available in web UI)
- Use `-s <source_id>` on generate/ask commands to limit to specific sources
- Slide decks can be revised per-slide: `notebooklm generate revise-slide "prompt" --artifact <id> --slide N`
- Export artifacts to Google Docs/Sheets: `notebooklm artifact export <id> --type docs`

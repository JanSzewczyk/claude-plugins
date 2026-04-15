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

# Web research (AI-powered source discovery)
notebooklm source add-research "quantum computing breakthroughs 2026"
```

Supported formats: PDFs, Word docs, Markdown, plain text, audio/video files, images,
Google Drive documents, YouTube videos, pasted text.

### 3. Ask Questions

```bash
notebooklm ask "What are the key findings across all sources?"
notebooklm ask "Compare the methodologies used in sources 1 and 3"
```

### 4. Generate Content

This is where NotebookLM shines. Generate rich artifacts from your sources:

```bash
# Audio podcast (deep-dive, brief, critique, or debate format)
notebooklm generate audio "Focus on practical implications" --wait

# Video explainer (whiteboard, colorful, corporate, etc.)
notebooklm generate video --style whiteboard --wait

# Study materials
notebooklm generate quiz --difficulty hard
notebooklm generate flashcards --quantity more

# Documents and visuals
notebooklm generate slide-deck
notebooklm generate infographic --orientation portrait
notebooklm generate mind-map
notebooklm generate report --type briefing

# Data extraction
notebooklm generate data-table "Extract all statistics mentioned"
```

### 5. Download Artifacts

```bash
notebooklm download audio ./podcast.mp3
notebooklm download video ./explainer.mp4
notebooklm download slide-deck ./slides.pdf
notebooklm download quiz --format markdown ./quiz.md
notebooklm download flashcards --format json ./cards.json
notebooklm download infographic ./visual.png
notebooklm download mind-map ./map.json
notebooklm download data-table ./data.csv
```

## Generation Timeframes

Different artifacts take varying amounts of time:

| Artifact | Typical Duration |
|----------|-----------------|
| Mind maps | Instant (synchronous) |
| Reports, quizzes | 5-15 minutes |
| Audio podcasts | 10-20 minutes |
| Video explainers | 15-45 minutes |
| Source indexing | 30 seconds - 10 minutes |

For long-running operations, use `--wait` flag or poll with `notebooklm artifact list`.

## Audio Generation Options

Audio is one of the most powerful features. Available options:

- **Formats**: `deep-dive` (default), `brief`, `critique`, `debate`
- **Lengths**: short, medium, long
- **Languages**: 50+ languages supported

```bash
# Custom podcast with specific instructions
notebooklm generate audio "Make it conversational, focus on the controversies" --wait

# Set language
notebooklm language set pl  # Polish
notebooklm generate audio --wait
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
        await client.sources.add_url(nb.id, "https://example.com", wait=True)

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

- **Auth errors**: Run `notebooklm auth check --test` to diagnose, then `notebooklm login` to re-authenticate
- **Rate limiting**: Wait 5-10 minutes, use `--retry` flag for automatic backoff
- **Generation returns None**: Use `--wait` or poll with `artifact list`
- **CSRF token issues**: Usually auto-refreshed; if persistent, run `notebooklm login`

For platform-specific issues and detailed troubleshooting, see `references/troubleshooting.md`.

## Key Tips

- Always use `--wait` for generation commands when you need to download immediately after
- Use `--json` flag on most commands for machine-parseable output
- For parallel agent workflows, pass explicit notebook IDs with `-n` flag instead of relying on context
- Use profiles (`-p work`) to manage multiple Google accounts
- Source indexing takes time — wait for it before asking questions or generating content
- The `source fulltext` command retrieves indexed content (not available in web UI)
- Slide decks can be revised per-slide with natural language prompts

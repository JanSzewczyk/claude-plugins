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
allowed-tools: Read, Write, Bash
---

# NotebookLM CLI & Python API

Automate Google NotebookLM through the `notebooklm-py` package (unofficial community client; CLI + async
Python API). This file is the workflow and orientation; full command syntax and recipes are in the references.

> - [references/cli-reference.md](./references/cli-reference.md) — complete CLI commands, flags, advanced features.
> - [references/python-api.md](./references/python-api.md) — full async Python API reference.
> - [references/setup-guide.md](./references/setup-guide.md) — install, auth, multiple accounts, CI/CD.
> - [references/troubleshooting.md](./references/troubleshooting.md) — detailed troubleshooting.
>
> **Note:** uses undocumented Google APIs — community project, not affiliated with Google; rate limits apply.

## Quick Setup

```bash
pip install "notebooklm-py[browser]" && playwright install chromium
notebooklm login          # opens browser for Google login
notebooklm auth check --test   # verify environment
```

Platform-specific setup, multiple accounts, and CI/CD config: [references/setup-guide.md](./references/setup-guide.md).

## Core Workflow

Five steps — one example each; full flags in [references/cli-reference.md](./references/cli-reference.md).

1. **Create** — `notebooklm create "My Research Project"`.
2. **Add sources** — `notebooklm source add "<url | ./file.pdf | youtube-url>"`; `source add-drive`,
   `source add-research "<query>"` for AI source discovery. Accepts PDF/Word/Markdown/text/audio/video/
   images/Drive/YouTube/pasted text. Per-plan source limits: Standard 50, Plus 100, Pro 300, Ultra 600.
   **Indexing takes time** — `notebooklm source wait <id>` before asking/generating.
3. **Ask** — `notebooklm ask "What are the key findings?"` (add `--save-as-note` to keep the answer).
4. **Generate** an artifact (add `--wait` to block until ready, `-s <source_id>` to limit to sources):
   - `audio` (podcast), `video` / `cinematic-video`, `quiz`, `flashcards`, `slide-deck`, `infographic`,
     `mind-map`, `report`, `data-table`.
   - e.g. `notebooklm generate audio "focus on practical implications" --wait`.
5. **Download** — `notebooklm download <artifact> <path>` (e.g. `download audio ./podcast.mp3`); options
   `--all`, `--name "<fuzzy>"`, `-a <artifact_id>`, `--format <fmt>`, `--dry-run`.

## Generation Timeframes

| Artifact                  | Typical Duration       |
| ------------------------- | ---------------------- |
| Mind maps                 | Instant (synchronous)  |
| Quizzes, flashcards       | 1–5 minutes            |
| Audio podcasts            | 5–15 minutes           |
| Reports, slide decks      | 5–15 minutes           |
| Video explainers          | 10–30 minutes          |
| Cinematic videos (Veo 3)  | 30–40 minutes          |
| Source indexing           | 30 s – 10 minutes      |

For long operations use `--wait`, or poll with `notebooklm artifact list` / `artifact poll <task_id>`.

## Artifact Options

- **Audio** — `--format deep-dive|brief|critique|debate`, `--length short|default|long`, 80+ languages
  (`notebooklm language set pl`).
- **Video** — `--format explainer|brief|cinematic` (Veo 3), `--style auto|classic|whiteboard|kawaii|anime|
  watercolor|retro-print|heritage|paper-craft`.

## Python API

For programmatic/CI workflows use the async client (`NotebookLMClient.from_storage()` →
`notebooks.create`, `sources.add_url`, `chat.ask`, `artifacts.generate_audio` / `wait_for_completion` /
`download_audio`). Full reference: [references/python-api.md](./references/python-api.md).

## Troubleshooting

- **Auth errors / CSRF** — `notebooklm auth check --test` to diagnose, then `notebooklm login` to re-auth.
- **Rate limiting** — wait 5–10 min or use `--retry <n>` for automatic backoff.
- **Generation stuck** — use `--wait` or poll `artifact list` / `artifact poll <task_id>`.

More: [references/troubleshooting.md](./references/troubleshooting.md).

## Key Tips

- Use `--wait` when you need to download immediately after generating; `--json` for machine-parseable output.
- For parallel/agent workflows pass explicit notebook IDs with `-n` instead of relying on context.
- Use profiles (`-p work`) for multiple Google accounts; `-s <source_id>` to scope generate/ask.
- `source fulltext` retrieves indexed content (not in the web UI).
- Slide decks revise per-slide: `notebooklm generate revise-slide "prompt" --artifact <id> --slide N`.
- Export artifacts to Google Docs/Sheets: `notebooklm artifact export <id> --type docs`.

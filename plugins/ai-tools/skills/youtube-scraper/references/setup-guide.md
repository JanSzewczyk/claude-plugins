# YouTube Scraper — Setup Guide

## Installation

### pip (recommended)

```bash
pip install yt-dlp
```

### pipx (isolated environment)

```bash
pipx install yt-dlp
```

### Homebrew (macOS)

```bash
brew install yt-dlp
```

## Verify Installation

```bash
yt-dlp --version
```

Should print a version string like `2026.01.15`.

## Dependencies

### Required

- **Python 3.9+** — yt-dlp requires Python 3.9 or later
- **jq** — for filtering JSON output (keeps token usage low)

```bash
# macOS
brew install jq

# Linux (Debian/Ubuntu)
apt install jq
```

### Optional

- **ffmpeg** — only needed if downloading and converting audio/video formats. Not required for search and metadata operations.

```bash
# macOS
brew install ffmpeg

# Linux
apt install ffmpeg
```

## No API Key Needed

yt-dlp works without any authentication or API keys. It accesses public YouTube data directly.
No Google account, no YouTube Data API setup, no quotas.

## Updating

yt-dlp updates frequently to keep pace with YouTube changes. If commands start failing:

```bash
pip install -U yt-dlp
```

## Platform Notes

| Platform | Notes |
|----------|-------|
| macOS | No special considerations |
| Linux | Ensure Python 3.9+ and pip |
| Windows/WSL | Works in WSL; native Windows may need path adjustments |

# ai-tools

AI tool integrations and research automation — drive Google NotebookLM from the command line, search YouTube without an API key, and look up Polish land and mortgage registers (księgi wieczyste).

These skills wrap external CLIs and public APIs rather than generating code, so each one has a setup step. Check the Requirements table below before first use.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **notebooklm** | `/notebooklm` | Automate Google NotebookLM via `notebooklm-py` — create notebooks, add sources (URLs, PDFs, YouTube, Drive), ask questions, generate podcasts, videos, quizzes and reports, download artifacts |
| **youtube-scraper** | `/youtube-scraper` | Search YouTube by query, channel, or playlist with `yt-dlp` — no API key, no quota — and filter the results down to what is actually worth watching |
| **kw-lookup** | `/kw-lookup` | Read a Polish land register (KW) by number — address, plots, owners, rights, claims and mortgages from all sections, optionally enriched with plot geometry from ULDK GUGiK |

## Installation

```bash
cp -r plugins/ai-tools/skills/*  your-project/.claude/skills/
```

Or install the plugin from the marketplace:

```
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install ai-tools@szum-tech
```

## Usage

### NotebookLM

```bash
pip install "notebooklm-py[browser]" && playwright install chromium
notebooklm login              # opens a browser for the Google login
notebooklm auth check --test  # verify the environment
```

> "Create a NotebookLM notebook from these three PDFs and generate an audio overview"

The skill creates the notebook, uploads the sources, waits for indexing, triggers the artifact, and downloads it. Multi-account setup and CI/CD configuration live in `skills/notebooklm/references/setup-guide.md`.

### YouTube search

```bash
pip install yt-dlp
```

> "Find good conference talks about React Server Components from the last two years"

The skill runs a two-phase search — a filtered YouTube query first, then a quality pass over the metadata — and returns links with short descriptions. It always uses `--flat-playlist` with format strings so raw JSON never lands in the context window.

### KW lookup

> "Sprawdź księgę wieczystą WA1M/00123456/7 --geo"

The skill validates the number format, drives the EKW portal through Playwright, reads sections I-O, I-Sp, II, III and IV, and with `--geo` enriches the result with plot coordinates and a Geoportal link. Pass `--dzialy=IO` to fetch only the address and plots.

## Requirements

| Skill | Needs |
| ----- | ----- |
| notebooklm | Python 3.10+, `notebooklm-py[browser]`, Chromium via Playwright, a Google account with NotebookLM access |
| youtube-scraper | `yt-dlp` on PATH, `jq` for filtering |
| kw-lookup | `playwright-cli`, and a human present to solve the EKW reCAPTCHA once per session |

## Limitations

- **notebooklm** uses undocumented Google APIs through a community client. It is not affiliated with Google, and rate limits apply.
- **kw-lookup** depends on the EKW portal's markup and its reCAPTCHA. There is no public REST API mapping a KW number to an address, so browser automation is the only route. The skill self-limits to one query per 10 seconds — do not use it for bulk scraping.

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `notebooklm login` opens a browser that never completes | Run `playwright install chromium` — the bundled browser is a separate download from the Python package |
| NotebookLM commands fail with an auth error after working yesterday | The session cookie expired; re-run `notebooklm login`, then `notebooklm auth check --test` |
| Artifact generation times out | Podcasts and videos take minutes to render — poll the artifact status rather than raising the request timeout |
| `yt-dlp` returns nothing for a search that works in a browser | YouTube changed its result markup; update with `pip install -U yt-dlp` before debugging the query |
| YouTube results flood the context | Always pair `--flat-playlist` with `--print` format strings and pipe through `jq` — never dump raw JSON |
| EKW asks for a CAPTCHA on every request | Expected on a fresh session; solve it once and reuse the browser session for the rest of the lookups |
| KW number rejected as invalid | The format is `XX1X/XXXXXXXX/X` (e.g. `WA1M/00123456/7`) — 4-character court code, 8 digits, one check digit |

## Related Plugins

- [**performance**](../performance/) — another CLI-wrapping plugin, for Lighthouse audits
- [**plugin-dev**](../plugin-dev/) — tooling for authoring plugins like this one

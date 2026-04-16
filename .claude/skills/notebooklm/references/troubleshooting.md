# NotebookLM Troubleshooting

Common issues, their causes, and solutions.

## Table of Contents

- [Authentication Errors](#authentication-errors)
- [RPC Errors](#rpc-errors)
- [Generation Failures](#generation-failures)
- [File Upload Issues](#file-upload-issues)
- [Rate Limiting](#rate-limiting)
- [Protected Website Content](#protected-website-content)
- [Download Issues](#download-issues)
- [Debugging](#debugging)

---

## Authentication Errors

### Diagnostics First

Always start with:

```bash
notebooklm auth check --test
```

### "Unauthorized" or redirect to login page

**Cause**: Session cookies expired (happens every few weeks).
**Fix**: `notebooklm login`

### "CSRF token missing" or "SNlM0e not found"

**Cause**: CSRF token expired. Usually auto-refreshed. If persistent, cookies have also expired.
**Fix**: `notebooklm login`, or in Python: `await client.refresh_auth()`

### Browser opens but login fails

**Cause**: Google detecting automation.
**Fix**:
1. `rm -rf ~/.notebooklm/browser_profile/`
2. `notebooklm login`
3. Complete any CAPTCHA or security challenges
4. Use real mouse/keyboard (don't paste credentials via script)

---

## RPC Errors

### "RPCError: No result found for RPC ID: XyZ123"

**Cause**: Google changed the RPC method ID, or rate limiting.
**Diagnose**:

```bash
NOTEBOOKLM_LOG_LEVEL=DEBUG notebooklm <command>
```

If IDs don't match, report the new ID as a GitHub issue.
**Workaround**: Wait 5-10 minutes and retry.

### "RPCError: [3]" or "UserDisplayableError"

**Cause**: Invalid parameters, resource not found, or rate limiting.
**Fix**: Verify notebook/source IDs are valid. Add delays between operations.

---

## Generation Failures

### Audio/Video returns None

**Cause**: Heavy load or rate limiting.
**Fix**: Use `--wait` flag or poll:

```bash
notebooklm generate audio --wait
notebooklm artifact poll <task_id>
```

### Mind map or data table doesn't appear

**Cause**: Silent generation failure.
**Fix**: Wait 60 seconds, check `notebooklm artifact list`, try regenerating.

---

## File Upload Issues

### Text/Markdown files upload but return None

**Workaround**: Use `add_text` instead of file upload:

```bash
notebooklm source add "$(cat ./notes.txt)"
```

Python:
```python
content = Path("notes.txt").read_text()
await client.sources.add_text(nb_id, "My Notes", content)
```

### Large files time out

Files over ~20MB may exceed upload timeout. Split large documents or extract text locally.

---

## Rate Limiting

Google enforces strict rate limits on the batchexecute endpoint.

**Symptoms**: RPC calls return `None`, `RPCError` with ID `R7cb6c`, `UserDisplayableError [3]`

**CLI solution**: Use `--retry` for automatic exponential backoff:

```bash
notebooklm generate audio --retry 3
notebooklm generate video --retry 5
```

**Python solution**:

```python
import asyncio

for url in urls:
    await client.sources.add_url(nb_id, url)
    await asyncio.sleep(2)
```

### Quota Restrictions

- Audio overviews: limited generations per day per account
- Video overviews: more restricted than audio
- Cinematic videos (Veo 3): most restricted, requires AI Ultra plan
- Deep research: consumes significant backend resources
- Source limits per plan: Standard (50), Plus (100), Pro (300), Ultra (600)
- Source limits per plan: Standard (50), Plus (100), Pro (300), Ultra (600)

---

## Protected Website Content

### X.com / Twitter content parsed incorrectly

X.com has aggressive anti-scraping. NotebookLM may fetch an error page instead of content.

**Solution**: Pre-fetch with `bird` CLI:

```bash
brew install steipete/tap/bird
bird read "https://x.com/user/status/123" > article.md
notebooklm source add ./article.md
```

**Other affected sites**: Paywalled news, JS-heavy sites, aggressive bot detection.

**Verify sources**:

```bash
notebooklm source list
# Check title matches actual article, not error message
```

---

## Download Issues

### Download fails with auth errors

Artifact downloads use `httpx` with cookies. Playwright is NOT needed for downloads.

**Fix**: Ensure authentication is valid:

```bash
notebooklm login
```

### URL expiry

Download URLs are temporary (expire within hours). Always fetch fresh artifact list before downloading:

```python
artifacts = await client.artifacts.list(nb_id)
# Use URLs immediately
```

---

## Debugging

### Log Levels

```bash
# Default (warnings and errors only)
notebooklm list

# Info level (major operations)
NOTEBOOKLM_LOG_LEVEL=INFO notebooklm source add "https://example.com"

# Debug level (all RPC calls with timing)
NOTEBOOKLM_LOG_LEVEL=DEBUG notebooklm list
```

### Test Basic Operations

Isolate issues step by step:

```bash
notebooklm list                              # 1. Auth works?
notebooklm create "Test"                     # 2. Can create?
notebooklm source add "https://example.com"  # 3. Can add sources?
```

### Network Debugging

```python
import httpx

async with httpx.AsyncClient() as client:
    r = await client.get("https://notebooklm.google.com")
    print(r.status_code)  # Should be 200 or 302
```

---

## Getting Help

1. Check this guide
2. Search [existing issues](https://github.com/teng-lin/notebooklm-py/issues)
3. Open a new issue with: command that failed, full error, Python version, library version, OS

# YouTube Scraper — Troubleshooting

## "Unable to extract" or HTTP 403 Errors

**Cause**: yt-dlp is outdated — YouTube frequently changes its internal APIs.

**Fix**:
```bash
pip install -U yt-dlp
```

Always try updating first. This resolves ~90% of issues.

## "Sign in to confirm you're not a bot" / IP Rate Limiting

**Cause**: Too many requests from the same IP in a short period.

**Fix**:
- Wait 15–30 minutes before retrying
- Reduce the number of search results (use `ytsearch5:` instead of `ytsearch20:`)
- For authenticated access: `--cookies-from-browser chrome`

**Prevention**:
- Keep search counts reasonable (5–10 per query)
- Avoid rapid consecutive searches

## No Results Returned

**Possible causes**:
1. Query too specific — try broader terms
2. `--match-filter` too restrictive — remove filters and add back one at a time
3. `--dateafter` too recent — expand the date range
4. yt-dlp outdated — update with `pip install -U yt-dlp`

## JSON Output Is Huge

**Cause**: Raw `-j` output includes format lists, thumbnails, HTTP headers, etc.

**Fix**: Always pipe through `jq` to select only needed fields:
```bash
# Instead of this (dumps everything):
yt-dlp "ytsearch5:query" --flat-playlist -j

# Do this:
yt-dlp "ytsearch5:query" --flat-playlist -j --no-warnings | \
  jq -c '{title, channel, url: "https://youtube.com/watch?v=\(.id)"}'
```

Or better yet, use `--print` instead of `-j` for most use cases.

## Age-Restricted Content

**Cause**: Video requires age verification / Google login.

**Fix**:
```bash
yt-dlp --cookies-from-browser chrome "VIDEO_URL" ...
```

Requires a logged-in Chrome browser with an account that passed age verification.

## Geographic Restrictions

**Cause**: Video is not available in your region.

**Fix**:
```bash
yt-dlp --geo-bypass "VIDEO_URL" ...
# or specific country:
yt-dlp --geo-bypass-country US "VIDEO_URL" ...
```

## --dateafter Not Filtering Correctly

**Cause**: `--dateafter` with `--flat-playlist` may not filter reliably for search results
because metadata might not be fully resolved in flat mode.

**Workaround**: Use `-j` with jq filtering instead:
```bash
yt-dlp "ytsearch20:query" --flat-playlist -j --no-warnings | \
  jq -c 'select(.upload_date >= "20260101") | {title, date: .upload_date, url: "https://youtube.com/watch?v=\(.id)"}'
```

## Phase 2 Quality Scoring Is Too Slow

**Cause**: Full extraction fetches ~2-3 HTTP requests per video (~1-2s each).

**Fix**:
- Reduce candidate count: `ytsearch15:` instead of `ytsearch30:`
- Add `--sleep-interval 1` to prevent rate limiting on large batches
- Use Phase 1 only (fast `--flat-playlist` search) when quality scoring isn't critical

## `sp` Filter Not Working

**Cause**: YouTube periodically changes filter parameter encoding.

**Fix**:
1. Go to youtube.com in browser
2. Search for your query
3. Apply desired filters (duration, upload date, sort)
4. Copy the `sp` value from the URL bar
5. Use that value in your yt-dlp command

## like_count / channel_follower_count Is Null

**Cause**: These fields require full extraction. They are NOT available with `--flat-playlist`.

**Fix**: Omit `--flat-playlist` when you need engagement data:
```bash
# This will NOT have like_count:
yt-dlp "ytsearch5:query" --flat-playlist -j

# This WILL have like_count (but slower):
yt-dlp "ytsearch5:query" -j
```

Use the `>?` operator in match-filter to treat missing values as match: `like_count>?100`.

## jq: command not found

**Fix**:
```bash
# macOS
brew install jq

# Linux (Debian/Ubuntu)
sudo apt install jq
```

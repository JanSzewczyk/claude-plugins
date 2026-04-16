---
name: youtube-scraper
description: >
  Search YouTube videos by query, topic, channel, or other criteria and return links
  with short descriptions. Uses yt-dlp CLI (free, no API key needed). Use this skill
  when the user wants to find, search, or discover YouTube videos on any topic, list
  videos from a channel or playlist, or get video metadata like title, duration, and
  view count. Includes quality filtering to surface valuable content and filter out noise.
allowed-tools: Bash(yt-dlp:*), Bash(jq:*)
---

# YouTube Scraper

Search YouTube and return high-quality video links using `yt-dlp` CLI.
Free, no API key, no quotas.

> **Token cost rule**: Always use `--flat-playlist` and `--print` with format strings.
> Never dump raw JSON into context without `jq` filtering.

## Quick Setup

```bash
pip install yt-dlp
yt-dlp --version
```

For detailed installation options, see `references/setup-guide.md`.

## Search Strategy — Finding Quality Over Noise

Use a **two-phase approach** for best results:

### Phase 1: Smart Search (fast, always do this)

Build a precise query and use YouTube's native filters via `sp` parameter:

```bash
# Quality search: 4-20 min videos, sorted by relevance
yt-dlp "https://www.youtube.com/results?search_query=QUERY&sp=EgIYAw%3D%3D" \
  --flat-playlist --playlist-end 15 \
  --print "%(title)s | %(channel)s | %(duration_string)s | %(view_count)s views | https://youtube.com/watch?v=%(id)s" \
  --no-warnings
```

**YouTube `sp` filter codes** (append to search URL):

| Filter | sp value | Use when |
|--------|----------|----------|
| **4-20 min duration** | `EgIYAw%3D%3D` | Tutorials, explainers (skip shorts/clickbait) |
| **Over 20 min** | `EgIYAg%3D%3D` | Deep dives, lectures, long-form |
| **Sort by view count** | `CAM%3D` | Finding popular/proven content |
| **Sort by rating** | `CAE%3D` | Finding well-received content |
| **This week** | `EgIIAw%3D%3D` | Fresh content only |
| **This month** | `EgIIBA%3D%3D` | Recent content |
| **This year** | `EgIIBQ%3D%3D` | Content from current year |

Combine filters by applying them on youtube.com in browser and copying the `sp` value from the URL.

### Phase 2: Quality Scoring (optional, for important searches)

When the user needs the **best** content, fetch full metadata and rank by engagement:

```bash
# Step 1: Get candidate IDs (fast)
yt-dlp "ytsearch30:QUERY" --flat-playlist --print "https://youtube.com/watch?v=%(id)s" \
  --no-warnings > /tmp/yt_candidates.txt

# Step 2: Fetch full metadata + score quality (slower, ~1-2s per video)
yt-dlp -j --match-filter "view_count>=5000 & duration>=300 & duration<=3600" \
  -a /tmp/yt_candidates.txt --no-warnings 2>/dev/null | jq -s '
  [.[] | {
    title, channel, url: .webpage_url,
    views: .view_count, likes: .like_count,
    subs: .channel_follower_count,
    duration_min: (.duration / 60 | floor),
    like_pct: (if .view_count > 0 and .like_count != null then
      (.like_count / .view_count * 100 * 100 | round / 100) else 0 end),
    score: (
      ((.view_count // 1) | log2) * 5 +
      (if .like_count != null and .view_count > 0 then (.like_count / .view_count * 500) else 0 end) +
      (if (.channel_follower_count // 0) > 100000 then 15 elif (.channel_follower_count // 0) > 10000 then 10 else 0 end) +
      (if .channel_is_verified == true then 10 else 0 end)
    )
  }] | sort_by(-.score) | .[0:10]'
```

> **Quality signals**: like/view ratio >3% = excellent, >1% = good, <1% = suspect.
> Verified channels with >10k subs are more likely to produce substantive content.

## Query Building Tips

Craft queries that attract quality results:

| Technique | Example | Why it helps |
|-----------|---------|-------------|
| **Use quotes for exact phrases** | `"react server components"` | Avoids loose matches |
| **Exclude noise words** | `python tutorial -beginner -shorts` | Filters clickbait |
| **Add quality keywords** | `TOPIC explained in depth` | Attracts long-form |
| **Specify format** | `TOPIC conference talk` | Gets talks, not vlogs |
| **Name known channels** | `TOPIC fireship` | Channel-specific results |
| **Channel search** | `https://www.youtube.com/@ChannelName/search?query=TOPIC` | Search within trusted channel |

## Basic Search (Simple Queries)

When quality filtering isn't needed (simple lookups):

```bash
yt-dlp "ytsearch10:QUERY" --flat-playlist \
  --print "%(title)s | %(channel)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings
```

## Search with Filters

```bash
# Videos from the last 30 days
yt-dlp "ytsearch15:QUERY" --flat-playlist --dateafter today-30days \
  --print "%(upload_date>%Y-%m-%d)s | %(title)s | %(channel)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings

# Longer than 10 min (skip shorts and clickbait)
yt-dlp "ytsearch20:QUERY" --flat-playlist --match-filter "duration > 600" \
  --print "%(title)s | %(duration_string)s | %(channel)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings

# 10k+ views (proven content)
yt-dlp "ytsearch20:QUERY" --flat-playlist --match-filter "view_count > 10000" \
  --print "%(title)s | %(view_count)s views | %(channel)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings

# Combined: 10+ min, 10k+ views, last year
yt-dlp "ytsearch30:QUERY" --flat-playlist \
  --match-filter "duration > 600 & view_count > 10000" \
  --dateafter today-365days \
  --print "%(upload_date>%Y-%m-%d)s | %(title)s | %(channel)s | %(duration_string)s | %(view_count)s views | https://youtube.com/watch?v=%(id)s" \
  --no-warnings
```

> **Note**: When using `--match-filter`, increase `ytsearchN` count (~2-3x desired) because
> filtered-out results reduce final count.

## Channel Videos

```bash
# List recent videos from a channel (last 15)
yt-dlp "CHANNEL_URL/videos" --flat-playlist --playlist-end 15 \
  --print "%(upload_date>%Y-%m-%d)s | %(title)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings

# Search within a specific channel
yt-dlp "https://www.youtube.com/@ChannelName/search?query=TOPIC" --flat-playlist \
  --print "%(title)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings
```

## Playlist Contents

```bash
yt-dlp "PLAYLIST_URL" --flat-playlist --playlist-end 15 \
  --print "%(playlist_index)s. %(title)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s" \
  --no-warnings
```

## Single Video Metadata

```bash
yt-dlp -j --no-warnings "VIDEO_URL" | \
  jq '{title, channel, upload_date, duration_string, views: .view_count, likes: .like_count, subs: .channel_follower_count, description: (.description[:300]), url: .webpage_url}'
```

## Clickbait Detection

When results look noisy, filter out likely clickbait with jq:

```bash
yt-dlp "ytsearch20:QUERY" -j --flat-playlist --no-warnings | jq -s '
  [.[] | select(
    (.title | test("[!?]{3,}") | not) and
    (.title | test("(?i)(you wont believe|gone wrong|shocking|insane|secret.*they|dont watch)") | not) and
    (.title | test("^[A-Z\\s!?0-9]{15,}$") | not) and
    ((.duration // 0) > 120)
  )] | .[] | {title, channel, duration_string, url: "https://youtube.com/watch?v=\(.id)"}'
```

## Token Cost Best Practices

- **Always** use `--flat-playlist` for searches and listings
- **Always** use `--print` with format strings instead of raw JSON
- Limit results: `ytsearch15:` not `ytsearch50:`
- Phase 2 quality scoring only when user explicitly needs best results
- When using `-j`, **always** pipe through `jq` and select only needed fields
- Use `--playlist-end N` to cap channel/playlist listings
- Add `--no-warnings` to suppress noisy output

## References

- [CLI Reference](references/cli-reference.md) — complete yt-dlp flags, format strings, match-filter fields, sp codes
- [Setup Guide](references/setup-guide.md) — installation, dependencies, updating
- [Troubleshooting](references/troubleshooting.md) — common errors and fixes

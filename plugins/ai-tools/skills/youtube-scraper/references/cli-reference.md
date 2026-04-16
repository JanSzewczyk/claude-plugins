# YouTube Scraper — CLI Reference

## Search Syntax

| Pattern | Description |
|---------|-------------|
| `ytsearch:QUERY` | Search YouTube, return 1 result |
| `ytsearchN:QUERY` | Search YouTube, return N results |
| `ytsearch10:react hooks tutorial` | Example: 10 results for "react hooks tutorial" |
| YouTube search URL with `sp` | Full control over filters and sort order |

## YouTube `sp` Filter Parameter

Pass filtered search URLs directly to yt-dlp for YouTube-native filtering:

```bash
yt-dlp "https://www.youtube.com/results?search_query=QUERY&sp=SP_VALUE" --flat-playlist ...
```

### Sort Order

| Sort | sp value |
|------|----------|
| Relevance (default) | `CAA%3D` |
| Upload date | `CAI%3D` |
| View count | `CAM%3D` |
| Rating | `CAE%3D` |

### Duration Filters

| Duration | sp value |
|----------|----------|
| Under 4 min | `EgIYAQ%3D%3D` |
| 4-20 min | `EgIYAw%3D%3D` |
| Over 20 min | `EgIYAg%3D%3D` |

### Time Period Filters

| Period | sp value |
|--------|----------|
| Last hour | `EgIIAQ%3D%3D` |
| Today | `EgIIAg%3D%3D` |
| This week | `EgIIAw%3D%3D` |
| This month | `EgIIBA%3D%3D` |
| This year | `EgIIBQ%3D%3D` |

### Content Type

| Type | sp value |
|------|----------|
| Video only | `EgIQAQ%3D%3D` |
| Channel | `EgIQAg%3D%3D` |
| Playlist | `EgIQAw%3D%3D` |

### Combining Filters

Apply desired filters on youtube.com in a browser, then copy the `sp` value from the URL bar.
YouTube encodes combined filters into a single `sp` value via protobuf.

> **Warning**: YouTube occasionally changes sp filter behavior. Test before relying on specific values.

## Essential Flags

| Flag | Description |
|------|-------------|
| `--flat-playlist` | List entries without downloading — **always use for searches** |
| `--print TEMPLATE` | Print specific fields using format strings |
| `-j` / `--dump-json` | Output full metadata as JSON per entry (pipe through jq) |
| `--dump-single-json` | Output all entries as single JSON object with `.entries[]` |
| `--no-warnings` | Suppress warning messages for cleaner output |
| `--no-playlist` | If URL is both video and playlist, process only the video |
| `-a FILE` / `--batch-file FILE` | Read URLs from file (one per line) |
| `--sleep-interval N` | Wait N seconds between requests (prevents rate limiting) |

## Print Format Strings

Use with `--print "TEMPLATE"`. Available fields:

| Field | Example Output | Description |
|-------|---------------|-------------|
| `%(id)s` | `dQw4w9WgXcQ` | Video ID |
| `%(title)s` | `Never Gonna Give You Up` | Video title |
| `%(channel)s` | `Rick Astley` | Channel name |
| `%(channel_id)s` | `UCuAXFkgsw1L7xaCfnd5JJOw` | Channel ID |
| `%(channel_follower_count)s` | `850000` | Channel subscribers* |
| `%(channel_is_verified)s` | `True` | Verified badge* |
| `%(duration_string)s` | `3:33` | Duration (human-readable) |
| `%(duration)s` | `213` | Duration in seconds |
| `%(view_count)s` | `1500000000` | View count |
| `%(like_count)s` | `15000000` | Like count* |
| `%(comment_count)s` | `250000` | Comment count* |
| `%(upload_date>%Y-%m-%d)s` | `2009-10-25` | Upload date (formatted) |
| `%(upload_date)s` | `20091025` | Upload date (raw YYYYMMDD) |
| `%(description)s` | Full text | Video description |
| `%(playlist_index)s` | `3` | Position in playlist |
| `%(webpage_url)s` | Full URL | Video page URL |

*Fields marked with `*` require **full extraction** (not available with `--flat-playlist`).

### Recommended Print Templates

```bash
# Search results (compact)
--print "%(title)s | %(channel)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s"

# With date and views
--print "%(upload_date>%Y-%m-%d)s | %(title)s | %(channel)s | %(view_count)s views | https://youtube.com/watch?v=%(id)s"

# Full extraction (with engagement data)
--print "%(title)s | %(channel)s | %(view_count)s views | %(like_count)s likes | %(channel_follower_count)s subs | https://youtube.com/watch?v=%(id)s"

# Playlist items
--print "%(playlist_index)s. %(title)s | %(duration_string)s | https://youtube.com/watch?v=%(id)s"

# Default for missing fields
--print "%(like_count|N/A)s likes"
```

## Match Filter Expressions

`--match-filter` applies post-fetch filtering. With `--flat-playlist`, only basic fields are available.
For engagement fields (`like_count`, `channel_follower_count`, etc.), omit `--flat-playlist`.

### Operators

| Operator | Type | Example |
|----------|------|---------|
| `>`, `>=`, `<`, `<=`, `=`, `!=` | Numeric | `view_count >= 10000` |
| `>?`, `<?`, `>=?`, `<=?` | Numeric (treat missing as match) | `like_count>?100` |
| `*=` | String contains | `title *= "tutorial"` |
| `~=` | Regex match | `title ~= "(?i)tutorial"` |
| `^=` | Starts with | `channel ^= "3Blue"` |
| `&` | AND | `view_count > 1000 & duration > 600` |
| `!field` | Field absent/falsy | `!is_live` |

Multiple `--match-filter` flags = **OR** between them.

### Quality Filter Recipes

```bash
# Substantive content (skip shorts and clickbait)
--match-filter "duration > 300 & duration < 3600"

# Popular + substantial
--match-filter "view_count >= 10000 & duration > 600"

# High engagement (requires full extraction)
--match-filter "view_count >= 5000 & like_count>?100 & channel_follower_count>?10000"

# Verified channels only (requires full extraction)
--match-filter "channel_is_verified = True & duration > 300"

# Exclude live streams
--match-filter "!is_live"

# Specific channel
--match-filter "channel *= 'Fireship'"

# Combined quality gate
--match-filter "view_count >= 5000 & duration >= 300 & duration <= 3600 & like_count>?50"
```

### Flat-Playlist vs Full Extraction

| Mode | Speed | Available Filter Fields |
|------|-------|------------------------|
| `--flat-playlist` | Fast (~1 request) | `id`, `title`, `duration`, `view_count`, `channel`, `upload_date` |
| Without `--flat-playlist` | Slow (~2s/video) | All fields including `like_count`, `comment_count`, `channel_follower_count`, `channel_is_verified` |

## Date Filters

| Flag | Format | Example |
|------|--------|---------|
| `--dateafter DATE` | See below | `--dateafter today-30days` |
| `--datebefore DATE` | See below | `--datebefore 20260401` |

| Date Format | Example | Description |
|-------------|---------|-------------|
| `YYYYMMDD` | `20260101` | Absolute date |
| `today` | — | Current date |
| `today-Ndays` | `today-30days` | N days ago |
| `today-Nweeks` | `today-4weeks` | N weeks ago |
| `today-Nmonths` | `today-6months` | N months ago |
| `today-Nyears` | `today-1years` | N years ago |

## Channel and Playlist URLs

### Channel Formats

```
https://www.youtube.com/@ChannelName/videos          # Latest uploads
https://www.youtube.com/@ChannelName/search?query=TOPIC  # Search within channel
https://www.youtube.com/c/ChannelName/videos
https://www.youtube.com/channel/CHANNEL_ID/videos
```

### Playlist Formats

```
https://www.youtube.com/playlist?list=PLAYLIST_ID
```

## jq Patterns for YouTube Data

### Basic Filtering

```bash
# Compact search result
jq -c '{title, channel, duration_string, url: "https://youtube.com/watch?v=\(.id)"}'

# With truncated description
jq -c '{title, channel, duration_string, url: "https://youtube.com/watch?v=\(.id)", description: (.description[:200])}'

# Single-video full metadata
jq '{title, channel, upload_date, duration_string, views: .view_count, likes: .like_count, subs: .channel_follower_count, description: (.description[:300]), url: .webpage_url}'

# Extract only URLs
jq -r '"https://youtube.com/watch?v=\(.id)"'
```

### Quality Scoring

```bash
# Score and rank by engagement quality (use with -j, without --flat-playlist)
jq -s '
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

### Clickbait Filter

```bash
# Remove likely clickbait titles
jq -s '[.[] | select(
  (.title | test("[!?]{3,}") | not) and
  (.title | test("(?i)(you wont believe|gone wrong|shocking|insane|secret.*they|dont watch)") | not) and
  (.title | test("^[A-Z\\s!?0-9]{15,}$") | not) and
  ((.duration // 0) > 120)
)]'
```

### Sorting

```bash
# Sort by view count (descending)
jq -s 'sort_by(-.view_count) | .[]'

# Sort by upload date (newest first)
jq -s 'sort_by(-.upload_date) | .[]'

# Sort by like/view ratio (best engagement first)
jq -s '[.[] | . + {ratio: (if .view_count > 0 then (.like_count // 0) / .view_count else 0 end)}] | sort_by(-.ratio) | .[]'
```

## Query Operators (in search string)

| Operator | Example | Reliability |
|----------|---------|-------------|
| `"exact phrase"` | `"react server components"` | Good |
| `-exclude` | `python tutorial -beginner` | Good |
| `intitle:word` | `intitle:tutorial python` | Moderate |
| `#hashtag` | `#pythontutorial` | Good |

## Two-Phase Pipeline (Complete)

```bash
# Phase 1: Fast candidate discovery
yt-dlp "ytsearch30:QUERY" --flat-playlist \
  --print "https://youtube.com/watch?v=%(id)s" \
  --no-warnings > /tmp/yt_candidates.txt

# Phase 2: Full extraction + quality ranking
yt-dlp -j -a /tmp/yt_candidates.txt \
  --match-filter "view_count>=5000 & duration>=300 & duration<=3600" \
  --sleep-interval 1 --no-warnings 2>/dev/null | jq -s '
  [.[] | {
    title, channel, url: .webpage_url,
    views: .view_count, likes: .like_count,
    subs: .channel_follower_count,
    verified: .channel_is_verified,
    duration_min: (.duration / 60 | floor),
    like_pct: (if .view_count > 0 and .like_count != null then
      (.like_count / .view_count * 100 * 100 | round / 100) else 0 end)
  }] | sort_by(-((.like_count // 0) / ((.view_count // 1) + 1))) | .[0:10]'

# Cleanup
rm -f /tmp/yt_candidates.txt
```

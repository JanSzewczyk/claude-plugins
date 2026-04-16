# NotebookLM Python API Reference

Complete async Python API for `notebooklm-py` (v0.3.4).

## Table of Contents

- [Client Setup](#client-setup)
- [Notebooks API](#notebooks-api)
- [Sources API](#sources-api)
- [Chat API](#chat-api)
- [Artifacts API](#artifacts-api)
- [Research API](#research-api)
- [Notes API](#notes-api)
- [Settings API](#settings-api)
- [Sharing API](#sharing-api)
- [Error Handling](#error-handling)

---

## Client Setup

```python
from notebooklm import NotebookLMClient

# From stored credentials (default profile)
async with await NotebookLMClient.from_storage() as client:
    ...

# From specific profile
async with await NotebookLMClient.from_storage(profile="work") as client:
    ...

# From specific file
async with await NotebookLMClient.from_storage(path="/path/to/storage_state.json") as client:
    ...

# From environment variable (CI/CD)
# Set NOTEBOOKLM_AUTH_JSON, then:
async with await NotebookLMClient.from_storage() as client:
    ...

# Custom timeout
async with await NotebookLMClient.from_storage(timeout=30.0) as client:
    ...
```

All API methods are async. Use `asyncio.run()` to call from synchronous code.

---

## Notebooks API

Access via `client.notebooks`.

```python
# List all notebooks
notebooks = await client.notebooks.list()
for nb in notebooks:
    print(nb.id, nb.title)

# Create a new notebook
nb = await client.notebooks.create("My Research")

# Get notebook by ID
nb = await client.notebooks.get(notebook_id)

# Rename
await client.notebooks.rename(nb.id, "Updated Name")

# Delete
await client.notebooks.delete(nb.id)

# Get AI-generated summary
summary = await client.notebooks.get_summary(nb.id)  # returns str

# Get description with suggested topics
desc = await client.notebooks.get_description(nb.id)  # returns NotebookDescription

# Get metadata (includes sources list)
meta = await client.notebooks.get_metadata(nb.id)  # returns NotebookMetadata

# Share notebook (generate public link)
result = await client.notebooks.share(nb.id, public=True)
url = await client.notebooks.get_share_url(nb.id)

# Remove from recent notebooks list
await client.notebooks.remove_from_recent(nb.id)
```

---

## Sources API

Access via `client.sources`. All methods require `notebook_id` as the first parameter.

```python
# Add URL source
source = await client.sources.add_url(nb.id, "https://example.com")

# Add YouTube video
source = await client.sources.add_youtube(nb.id, "https://youtube.com/watch?v=...")

# Add local file
source = await client.sources.add_file(nb.id, "./paper.pdf")
source = await client.sources.add_file(nb.id, "./doc.pdf", mime_type="application/pdf")

# Add raw text
source = await client.sources.add_text(nb.id, "Title", "Content text here")

# Add Google Drive source
source = await client.sources.add_drive(nb.id, "file_id", "Document Title", "google-doc")

# List sources
sources = await client.sources.list(nb.id)

# Get source details
source = await client.sources.get(nb.id, source_id)

# Get indexed content (CLI-exclusive feature)
fulltext = await client.sources.get_fulltext(nb.id, source_id)

# Get AI-generated guide (summary + keywords)
guide = await client.sources.get_guide(nb.id, source_id)

# Refresh source (re-index)
await client.sources.refresh(nb.id, source_id)

# Check freshness
is_fresh = await client.sources.check_freshness(nb.id, source_id)

# Rename source
await client.sources.rename(nb.id, source_id, "New Title")

# Delete source
await client.sources.delete(nb.id, source_id)
```

---

## Chat API

Access via `client.chat`.

```python
# Ask a question
result = await client.chat.ask(nb.id, "What are the key findings?")
print(result.answer)
# result also contains citations with source_id, citation_number, cited_text

# Ask about specific sources only
result = await client.chat.ask(nb.id, "Compare these", source_ids=["src_001", "src_002"])

# Continue a specific conversation
result = await client.chat.ask(nb.id, "Follow-up", conversation_id="conv_123")

# Get conversation history
history = await client.chat.get_history(nb.id)  # list of (question, answer) tuples
history = await client.chat.get_history(nb.id, limit=10)

# Get current conversation ID
conv_id = await client.chat.get_conversation_id(nb.id)

# Configure chat persona and response style
await client.chat.configure(
    nb.id,
    goal=ChatGoal.DEFAULT,          # or ChatGoal.LEARNING_GUIDE, etc.
    response_length=ChatResponseLength.DEFAULT,
    custom_prompt="Answer like a professor"
)
```

---

## Artifacts API

Access via `client.artifacts`. This is the content generation and download interface.

### Generation

All generation methods return a `GenerationStatus` object with `task_id` for polling.

```python
# Audio podcast
status = await client.artifacts.generate_audio(
    nb.id,
    instructions="Make it conversational and fun",
    audio_format=AudioFormat.DEEP_DIVE,   # DEEP_DIVE, BRIEF, CRITIQUE, DEBATE
    audio_length=AudioLength.DEFAULT,      # SHORT, DEFAULT, LONG
    source_ids=["src_001"],               # optional: limit to specific sources
    language="en"                          # 80+ language codes
)

# Video
status = await client.artifacts.generate_video(
    nb.id,
    instructions="professional overview",
    video_format=VideoFormat.EXPLAINER,    # EXPLAINER, BRIEF, CINEMATIC
    video_style=VideoStyle.WHITEBOARD,     # AUTO_SELECT, CLASSIC, WHITEBOARD, KAWAII,
                                           # ANIME, WATERCOLOR, RETRO_PRINT, HERITAGE, PAPER_CRAFT
    source_ids=None,
    language="en"
)

# Cinematic video (Veo 3 AI)
status = await client.artifacts.generate_cinematic_video(
    nb.id,
    instructions="documentary style",
    language="en"
)

# Quiz
status = await client.artifacts.generate_quiz(
    nb.id,
    difficulty=QuizDifficulty.HARD,        # EASY, MEDIUM, HARD
    quantity=QuizQuantity.MORE,            # FEWER, STANDARD, MORE
    source_ids=None,
    instructions=None
)

# Flashcards
status = await client.artifacts.generate_flashcards(
    nb.id,
    difficulty=QuizDifficulty.MEDIUM,
    quantity=QuizQuantity.STANDARD,
    source_ids=None,
    instructions=None
)

# Slide deck
status = await client.artifacts.generate_slide_deck(
    nb.id,
    instructions="include speaker notes",
    slide_format=SlideDeckFormat.DETAILED_DECK,  # DETAILED_DECK, PRESENTER
    slide_length=SlideDeckLength.DEFAULT,         # DEFAULT, SHORT
    source_ids=None,
    language="en"
)

# Infographic
status = await client.artifacts.generate_infographic(
    nb.id,
    instructions=None,
    orientation=InfographicOrientation.LANDSCAPE,  # LANDSCAPE, PORTRAIT, SQUARE
    detail=InfographicDetail.STANDARD,             # CONCISE, STANDARD, DETAILED
    style=InfographicStyle.AUTO_SELECT,            # AUTO_SELECT, SKETCH_NOTE, PROFESSIONAL,
                                                    # BENTO_GRID, EDITORIAL, INSTRUCTIONAL,
                                                    # BRICKS, CLAY, ANIME, KAWAII, SCIENTIFIC
    source_ids=None,
    language="en"
)

# Report
status = await client.artifacts.generate_report(
    nb.id,
    report_format=ReportFormat.BRIEFING_DOC,  # BRIEFING_DOC, STUDY_GUIDE, BLOG_POST, CUSTOM
    source_ids=None,
    language="en",
    custom_prompt="Custom template prompt",
    extra_instructions="Additional instructions"
)

# Mind map (synchronous — returns dict immediately)
mind_map = await client.artifacts.generate_mind_map(nb.id, source_ids=None)

# Data table
status = await client.artifacts.generate_data_table(
    nb.id,
    instructions="Extract all statistics",
    source_ids=None,
    language="en"
)
```

### Waiting for Completion

```python
# Wait for a specific task
await client.artifacts.wait_for_completion(nb.id, status.task_id)
await client.artifacts.wait_for_completion(nb.id, status.task_id, timeout=600, poll_interval=5)

# Poll status manually
gen_status = await client.artifacts.poll_status(nb.id, task_id)
print(gen_status.status)  # "in_progress", "pending", "completed", "failed"
```

### Listing Artifacts

```python
# List all artifacts
artifacts = await client.artifacts.list(nb.id)
artifacts = await client.artifacts.list(nb.id, type="audio")  # Filter by type

# List by type (convenience methods)
audio_list = await client.artifacts.list_audio(nb.id)
video_list = await client.artifacts.list_video(nb.id)
reports = await client.artifacts.list_reports(nb.id)
quizzes = await client.artifacts.list_quizzes(nb.id)
flashcards = await client.artifacts.list_flashcards(nb.id)
infographics = await client.artifacts.list_infographics(nb.id)
slide_decks = await client.artifacts.list_slide_decks(nb.id)
data_tables = await client.artifacts.list_data_tables(nb.id)

# Get specific artifact
artifact = await client.artifacts.get(nb.id, artifact_id)
```

### Downloads

```python
# Audio / Video
await client.artifacts.download_audio(nb.id, "podcast.mp3")
await client.artifacts.download_audio(nb.id, "podcast.mp3", artifact_id="specific_id")
await client.artifacts.download_video(nb.id, "video.mp4")

# Documents
await client.artifacts.download_slide_deck(nb.id, "slides.pdf")
await client.artifacts.download_slide_deck(nb.id, "slides.pptx")  # editable PPTX
await client.artifacts.download_report(nb.id, "report.md")

# Study materials (json, markdown, html)
await client.artifacts.download_quiz(nb.id, "quiz.md", output_format="markdown")
await client.artifacts.download_quiz(nb.id, "quiz.json", output_format="json")
await client.artifacts.download_flashcards(nb.id, "cards.json", output_format="json")

# Visuals and data
await client.artifacts.download_infographic(nb.id, "visual.png")
await client.artifacts.download_mind_map(nb.id, "map.json")
await client.artifacts.download_data_table(nb.id, "data.csv")
```

### Artifact Management

```python
# Rename artifact
await client.artifacts.rename(nb.id, artifact_id, "New Title")

# Delete artifact
await client.artifacts.delete(nb.id, artifact_id)

# Export to Google Docs or Sheets
await client.artifacts.export_report(nb.id, artifact_id, "Title", ExportType.DOCS)
await client.artifacts.export_data_table(nb.id, artifact_id, "Title")
await client.artifacts.export(nb.id, artifact_id, content, "Title", ExportType.SHEETS)
```

---

## Research API

Access via `client.research`.

```python
# Start web or drive research
result = await client.research.start(nb.id, "quantum computing", source="web", mode="fast")
result = await client.research.start(nb.id, "quarterly report", source="drive", mode="deep")
# result contains: task_id, report_id, notebook_id, query, mode

# Poll research status
status = await client.research.poll(nb.id)
# status contains: task_id, status, query, sources, summary

# Import discovered sources
imported = await client.research.import_sources(nb.id, task_id, sources)
```

---

## Notes API

Access via `client.notes`.

```python
# Create a note
note = await client.notes.create(nb.id, "Title", "Content")

# List notes
notes = await client.notes.list(nb.id)

# Get note details
note = await client.notes.get(nb.id, note_id)

# Update note
await client.notes.update(nb.id, note_id, content="New content", title="New Title")

# Rename note
# (use update with title parameter)

# Delete note
await client.notes.delete(nb.id, note_id)

# Mind map notes
mind_maps = await client.notes.list_mind_maps(nb.id)
await client.notes.delete_mind_map(nb.id, mind_map_id)
```

---

## Settings API

Access via `client.settings`.

```python
# Get current output language
lang = await client.settings.get_output_language()

# Set output language
await client.settings.set_output_language("pl")  # Polish
await client.settings.set_output_language("ja")  # Japanese
```

---

## Sharing API

Access via `client.sharing`.

```python
# Get sharing status
status = await client.sharing.get_status(nb.id)  # returns ShareStatus

# Enable/disable public link
await client.sharing.set_public(nb.id, True)
await client.sharing.set_public(nb.id, False)

# Set view level for viewers
await client.sharing.set_view_level(nb.id, ShareViewLevel.FULL)
await client.sharing.set_view_level(nb.id, ShareViewLevel.CHAT)

# Add user
await client.sharing.add_user(
    nb.id,
    "user@example.com",
    permission=SharePermission.VIEWER,  # VIEWER or EDITOR
    notify=True,
    welcome_message="Welcome to the notebook!"
)

# Update user permission
await client.sharing.update_user(nb.id, "user@example.com", SharePermission.EDITOR)

# Remove user
await client.sharing.remove_user(nb.id, "user@example.com")
```

---

## Error Handling

```python
from notebooklm import NotebookLMClient, RPCError

async with await NotebookLMClient.from_storage() as client:
    try:
        result = await client.chat.ask(nb_id, "Question")
    except RPCError as e:
        # Google API returned an error (rate limit, invalid params, etc.)
        print(f"RPC Error: {e}")

    # Manual auth refresh if needed
    await client.refresh_auth()
```

### Rate Limiting Pattern

```python
import asyncio

async def retry_with_backoff(coro_fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await coro_fn()
        except RPCError:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt
            await asyncio.sleep(wait)

# Usage
result = await retry_with_backoff(
    lambda: client.chat.ask(nb_id, "Question")
)
```

### Batch Operations with Delays

```python
# Add multiple sources with delay to avoid rate limiting
urls = ["https://example1.com", "https://example2.com", "https://example3.com"]
for url in urls:
    await client.sources.add_url(nb.id, url)
    await asyncio.sleep(2)  # 2 second delay between operations
```

---

## Complete Example: Research Pipeline

```python
import asyncio
from notebooklm import NotebookLMClient

async def research_pipeline(topic: str, urls: list[str]):
    async with await NotebookLMClient.from_storage() as client:
        # 1. Create notebook
        nb = await client.notebooks.create(f"Research: {topic}")

        # 2. Add sources with rate limiting
        for url in urls:
            await client.sources.add_url(nb.id, url)
            await asyncio.sleep(2)

        # 3. Ask questions
        summary = await client.chat.ask(nb.id, f"Provide a comprehensive summary of {topic}")
        print(summary.answer)

        # 4. Generate study materials in parallel
        quiz_status = await client.artifacts.generate_quiz(nb.id, difficulty=QuizDifficulty.MEDIUM)
        audio_status = await client.artifacts.generate_audio(
            nb.id, instructions=f"Deep dive into {topic}"
        )

        # 5. Wait and download
        await client.artifacts.wait_for_completion(nb.id, quiz_status.task_id)
        await client.artifacts.download_quiz(nb.id, f"{topic}-quiz.md", output_format="markdown")

        await client.artifacts.wait_for_completion(nb.id, audio_status.task_id)
        await client.artifacts.download_audio(nb.id, f"{topic}-podcast.mp3")

        return nb.id

asyncio.run(research_pipeline("AI Safety", [
    "https://example.com/ai-safety-paper",
    "https://example.com/alignment-research",
]))
```

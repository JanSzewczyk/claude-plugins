# NotebookLM Python API Reference

Complete async Python API for `notebooklm-py`.

## Table of Contents

- [Client Setup](#client-setup)
- [Notebooks API](#notebooks-api)
- [Sources API](#sources-api)
- [Chat API](#chat-api)
- [Artifacts API](#artifacts-api)
- [Research API](#research-api)
- [Notes API](#notes-api)
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

# Rename
await client.notebooks.rename(nb.id, "Updated Name")

# Delete
await client.notebooks.delete(nb.id)
```

---

## Sources API

Access via `client.sources`.

```python
# Add URL source (wait for indexing)
source = await client.sources.add_url(nb.id, "https://example.com", wait=True)

# Add local file
source = await client.sources.add_file(nb.id, "./paper.pdf")

# Add raw text
source = await client.sources.add_text(nb.id, "Title", "Content text here")

# List sources
sources = await client.sources.list(nb.id)

# Get indexed content (CLI-exclusive feature)
fulltext = await client.sources.get_fulltext(source.id)

# Get AI-generated guide
guide = await client.sources.get_guide(source.id)

# Refresh source (re-index)
await client.sources.refresh(source.id)

# Delete source
await client.sources.delete(source.id)
```

---

## Chat API

Access via `client.chat`.

```python
# Ask a question
result = await client.chat.ask(nb.id, "What are the key findings?")
print(result.answer)
# result also contains citations with source_id, citation_number, cited_text

# Get conversation history
history = await client.chat.get_history(nb.id)

# Save response to notebook notes
await client.chat.save_to_notes(nb.id, result.answer)
```

---

## Artifacts API

Access via `client.artifacts`. This is the content generation and download interface.

### Generation

All generation methods return a status object with `task_id` for polling.

```python
# Audio podcast
status = await client.artifacts.generate_audio(
    nb.id,
    instructions="Make it conversational and fun"
)

# Video
status = await client.artifacts.generate_video(nb.id, style="whiteboard")

# Quiz
status = await client.artifacts.generate_quiz(
    nb.id,
    difficulty="hard",
    quantity="more"
)

# Flashcards
status = await client.artifacts.generate_flashcards(
    nb.id,
    difficulty="medium",
    quantity="standard"
)

# Slide deck
status = await client.artifacts.generate_slide_deck(nb.id)

# Infographic
status = await client.artifacts.generate_infographic(
    nb.id,
    orientation="portrait",
    detail_level="detailed"
)

# Mind map
status = await client.artifacts.generate_mind_map(nb.id)

# Data table
status = await client.artifacts.generate_data_table(
    nb.id,
    instructions="Extract all statistics"
)

# Report
status = await client.artifacts.generate_report(
    nb.id,
    template_type="briefing",
    custom_prompt="Focus on actionable insights"
)
```

### Waiting for Completion

```python
# Wait for a specific task
await client.artifacts.wait_for_completion(nb.id, status.task_id)

# List all artifacts (check status)
artifacts = await client.artifacts.list(nb.id)
```

### Downloads

```python
# Audio / Video
await client.artifacts.download_audio(nb.id, "podcast.mp3")
await client.artifacts.download_video(nb.id, "video.mp4")

# Documents
await client.artifacts.download_slide_deck(nb.id, "slides.pdf")
await client.artifacts.download_slide_deck(nb.id, "slides.pptx")  # editable

# Study materials
await client.artifacts.download_quiz(nb.id, "quiz.md", output_format="markdown")
await client.artifacts.download_quiz(nb.id, "quiz.json", output_format="json")
await client.artifacts.download_flashcards(nb.id, "cards.json", output_format="json")

# Visuals and data
await client.artifacts.download_infographic(nb.id, "visual.png")
await client.artifacts.download_mind_map(nb.id, "map.json")
await client.artifacts.download_data_table(nb.id, "data.csv")
```

---

## Research API

Access via `client.research`.

```python
# Web research
results = await client.research.web_research(nb.id, "quantum computing", mode="fast")
results = await client.research.web_research(nb.id, "quantum computing", mode="deep")

# Google Drive research
results = await client.research.drive_research(nb.id, "quarterly report")
```

---

## Notes API

Access via `client.notes`.

```python
# Create a note
await client.notes.create(nb.id, "Title", "Content")

# List notes
notes = await client.notes.list(nb.id)
```

---

## Sharing API

Access via `client.sharing`.

```python
# Create public link
link = await client.sharing.create_public_link(nb.id)

# Manage permissions
await client.sharing.manage_permissions(nb.id, "user@example.com", role="editor")
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
    await client.sources.add_url(nb.id, url, wait=True)
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

        # 2. Add sources
        for url in urls:
            await client.sources.add_url(nb.id, url, wait=True)
            await asyncio.sleep(1)

        # 3. Ask questions
        summary = await client.chat.ask(nb.id, f"Provide a comprehensive summary of {topic}")
        print(summary.answer)

        # 4. Generate study materials
        quiz_status = await client.artifacts.generate_quiz(nb.id, difficulty="medium")
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

# writing

Prose quality for text meant for people: messages, emails, Slack replies, posts, announcements and
notes. The skill writes, edits or reviews text so it says the point once, stays consistent and
does not read as machine-written, while keeping the writer's own voice.

It fires on its own whenever you ask for such text. You do not need to name it.

For commit messages and pull requests see [git-workflow](../git-workflow/); for READMEs see
[code-quality](../code-quality/).

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **humanize** | `/humanize [draft or file path]`, or just ask for a message | Three modes picked from the request. **Write** drafts new text and returns only the text. **Edit** tightens a draft and lists what changed. **Review** names each problem with the quoted line and a short fix, without rewriting. Rules cover voice, facts and opinions, brevity, consistency (one term per concept, matching numbers and dates, no self-contradiction) and a catalogue of AI-sounding patterns |

The skill keeps its pattern catalogue in [`references/patterns.md`](./skills/humanize/references/patterns.md)
and the self-check it runs before answering in [`references/checklist.md`](./skills/humanize/references/checklist.md).

## Installation

```bash
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install writing@szum-tech
```

## Usage

```text
Write a short Slack message to the team: the release moves to Thursday, the payment sandbox is down.
Make this email shorter and less stiff: <paste>
Does this LinkedIn post read as AI? <paste>
Napisz krótką wiadomość do klienta, że faktura będzie jutro.
Skróć to i zmień ton na luźniejszy: <wklej>
```

### What it deliberately does not do

- **Invent facts.** It uses what is in the conversation, the draft or sources it read. A missing
  fact becomes a question or a visible placeholder such as `[release date?]`.
- **Pick a side in a contradiction.** Two conflicting dates or claims are flagged to you.
- **Overwrite files without asking.** Given a file path, it returns the edited text first.
- **Guess whether AI wrote a text.** Review mode names patterns you can check, not a verdict.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| A Polish or German text barely changes | The word and pattern lists target English | Expected in this version; brevity and consistency rules still apply |
| The skill did not fire for a commit or PR description | Excluded on purpose | Use `/create-commit` or `/create-pull-request` |
| The edit feels too flat | The draft's own voice was not clear from a short sample | Say who it is for and the tone you want, or paste a longer sample of your writing |

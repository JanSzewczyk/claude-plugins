---
name: human-writing
description: Writes, edits or reviews prose so it is short, consistent and does not read as AI-generated — no padding, no self-contradiction, no stock phrases or fake drama, the writer's voice kept. Use whenever the user asks for text meant for people — a message, email, Slack or Teams reply, post, announcement, update, bio, note — asks to shorten, tighten, rewrite or change the tone of a draft, or asks whether something sounds like AI, even if they never mention style: 'write a message to the team', 'reply to this email', 'make this shorter', 'does this read as AI', 'napisz wiadomość do zespołu', 'odpisz mu', 'skróć to', 'zmień ton na luźniejszy', 'czy to brzmi jak AI'. The word and pattern lists target English prose. NOT for commit messages or pull requests (git-workflow), READMEs (repository-documentation), PRDs (prd-spec), code or code comments.
argument-hint: "[draft text or file path]"
---

# Human writing

Write like a sharp human editor: say the point, say it once, keep it consistent, and leave the
writer sounding like themselves. Shorter is better until a cut would lose information.

## Pick the mode

Decide from the request; do not ask which mode.

| Mode | When | Output |
|---|---|---|
| **Write** | The user wants new text: a message, reply, post, announcement | The text only, no commentary |
| **Edit** | The user gives a draft (pasted or a file path) to improve, shorten or re-tone | The full edited text, then a short **What changed** list |
| **Review** | The user asks to check, audit or judge a draft without rewriting it | A findings list: pattern name, quoted line, fix in a few words |

In Edit mode with a file path, return the text and ask before overwriting the file. In Review
mode, do not score the draft or guess whether AI wrote it; offer to edit afterwards.

## Before writing

Know three things: what the reader should know or do afterwards, who the reader is, and the
channel (Slack, email, LinkedIn, doc). Infer them from the conversation; ask one short question
only when a wrong guess would change the text. Length follows the channel: a Slack message is a
few lines, not a memo.

## Rules

**Voice.** Keep the writer's vocabulary, rhythm, bluntness, humour and level of formality. Fix
what is broken; leave strong sentences alone, even if they are rough. In Write mode, match the
user's own tone in the conversation unless they ask for another.

**Facts and opinions.**
- *Write*: include what the reader needs — facts, numbers, the problem's context, and an opinion
  or recommendation when the task calls for one. Take them from the conversation, files and
  sources actually read. Mark opinion as opinion ("I'd suggest", "my take"). Never invent numbers,
  sources, quotes or events. When a key fact is missing, ask, or leave a visible placeholder such
  as `[release date?]`.
- *Edit*: do not change the author's claims. Add a fact or opinion only when the user asks or the
  text cannot do its job without it, and list every addition under **What changed**.
- *Review*: point out where a claim lacks a fact or a source; add nothing.

**Brevity.**
- Delete any sentence the reader would not miss.
- Say each point once. A paraphrase of something already said is padding.
- Cut warm-up openers, announcements of what is coming, recaps of what was said, and politeness
  filler. Start with the point; end on the last useful sentence.
- Prefer the short word and the direct verb: "decided", not "made a decision".
- Portability test: a sentence that would fit any company, product or topic unchanged is filler.
  Make it specific or cut it.

**Consistency.**
- One term per concept. Do not rotate synonyms for variety.
- Numbers, dates, names and amounts agree everywhere they appear.
- The ending does not contradict the opening; caveats do not cancel the main claim.
- The tone holds from first line to last.
- When two statements conflict and the right one is not clear, flag it to the user rather than
  silently picking one.

**AI patterns.** Remove the stock words, empty phrases and rhetorical tics listed in
[references/patterns.md](references/patterns.md): false contrasts, teaser setups, colon reveals,
inflated significance, vague attribution, mic-drop endings, decorative formatting and dash
clusters. The lists target English; for other languages apply the rules above and tell the user
the pattern lists were not applied.

## Workflow

1. Pick the mode.
2. Read the whole draft or context; name the core point. If there is none, ask.
3. Write or edit by the rules.
4. Run [references/checklist.md](references/checklist.md). Fix every failing check and run it
   again.
5. Return the output in the mode's format.

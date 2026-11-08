# Phase 1 — Brief

**Exit:** `01-brief.md` holds an approved owner, name, visibility, description and topics. Each
field is its own decision, because a repository name or visibility chosen silently is the most
expensive thing to change later.

**Input:** `00-preflight.md`.

Ask in this order, one `AskUserQuestion` each (the description and topics may share one call).
Put the recommended option first and mark it `(Recommended)`. The user can always answer "Other"
with their own value.

## 1. Owner

Offer the user's own account first, then each organization from `00-preflight.md` with its tier in
the option description. If the description names an org or a product that clearly belongs to one,
recommend that org instead.

## 2. Name

Propose **three** names derived from the description: lowercase kebab-case, short, describing what
the project is rather than how it is built (`invoice-tracker`, not `nextjs-app-2`). If the owner's
existing repositories share a naming pattern (for example a `-szumplate` suffix for templates, or
a product prefix), follow it and say so.

Check that each proposal is free before offering it:

```bash
gh repo view <owner>/<name> --json name 2>/dev/null && echo TAKEN || echo FREE
```

Drop a taken name and propose another. Re-check a name the user types themselves.

## 3. Visibility

Always ask. Recommend **public** unless the description says private, mentions a client, a
company-internal system or secrets. Spell out the trade-off in the option descriptions using the
owner's tier: on Free, a private repository loses the ruleset, secret scanning, code
scanning and private vulnerability reporting (see `${CLAUDE_SKILL_DIR}/../../references/settings-catalog.md`).
`internal` is offered only for an Enterprise org.

## 4. Description and topics

- **Description:** one plain-text English sentence, at most 350 characters, starting with what
  the project is (`FastAPI service that …`), no Markdown, no emoji. Show the character count.
- **Topics:** 3–8 topics, lowercase kebab-case, each at most 50 characters, no duplicates: one
  type tag, the language, the main frameworks, one or two domain tags.

## The artifact — `01-brief.md`

```markdown
Owner: <owner>
Owner kind: user | org
Tier: <Free | Pro | Team | Enterprise>
Name: <name>
Visibility: public | private | internal
Description: <sentence>  (<n> chars)
Topics: <a>, <b>, <c>

## Stack hints
<languages, frameworks and tools named or implied in the description — phase 2 ranks templates
against these>
```

---
title: Generate the API reference from docstrings instead of retyping signatures
summary: autodoc or mkdocstrings renders the signature from the code, so the reference cannot disagree with it.
impact: medium
applies: [python]
sources: [https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html, https://mkdocstrings.github.io]
---

## Rule

Render the reference page with Sphinx `autodoc` or `mkdocstrings`, and never copy a signature into Markdown by hand.

## Why

A hand-typed signature is right only on the day it is written; the next parameter change leaves the docs describing code that no longer exists.

## Incorrect

```markdown
## get_user

`get_user(user_id, *, include_deleted=False)` returns a user.
```

## Correct

```markdown
## users

::: mypkg.users
```

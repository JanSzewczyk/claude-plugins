---
title: Keep tutorials, how-to guides, reference and explanation on separate pages
summary: The Diátaxis split: each page serves one reader need, so none mixes lessons, recipes, facts and background.
impact: low
applies: [python]
sources: [https://diataxis.fr]
---

## Rule

Give each page one purpose: a tutorial teaches, a how-to solves one task, reference lists facts, explanation gives background. Give each its own folder.

## Why

A page that mixes a lesson with parameter tables serves neither reader: the newcomer drowns in options and the expert scrolls through steps.

## Incorrect

```text
docs/
  usage.md        # intro, every option, design history in one page
```

## Correct

```text
docs/
  tutorials/
  how-to/
  reference/      # generated from docstrings
  explanation/
```

---
title: Write reports in GitHub-flavoured Markdown without HTML
summary: Tables, emoji marks, blockquotes, links and fenced code only; no <details>, inline styles or terminal colour.
impact: low
---

## Rule

Build the report only from what every surface renders: headings, tables, emoji, blockquotes, bold,
links and fenced code. Leave out HTML such as `<details>` or styled spans, ANSI colour codes, and
diagrams that need a renderer.

## Why

The same report is read in the desktop app, in a terminal and in a pull-request comment, and HTML
that one of them does not render shows up there as raw tags.

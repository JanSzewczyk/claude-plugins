---
title: Log an error once, in the layer that finally handles it
summary: Intermediate layers add context and re-raise; only the handler at the boundary logs, so one failure is one entry.
impact: medium
applies: []
expects: [python]
sources: [https://12factor.net/logs]
---

## Rule

Log a failure in the layer that finally handles it (request handler, worker loop, program entry). Layers in between wrap the error with context and re-raise without logging.

## Why

Logging and re-raising at every layer prints the same failure several times and multiplies every error count and alert.

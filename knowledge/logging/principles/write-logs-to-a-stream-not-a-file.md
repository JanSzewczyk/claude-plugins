---
title: Write logs to stdout or stderr and let the platform collect them
summary: A containerised app emits an event stream; rotation and shipping belong to the platform, not the app.
impact: medium
applies: []
expects: [python]
sources: [https://12factor.net/logs]
---

## Rule

An app that runs in a container or cloud platform writes its logs to `stdout` or `stderr`. It does not manage log files, rotation or shipping.

## Why

A log file inside a container disappears with it, and the platform's collector never sees it.

## Exceptions

On a machine with no log collector (a VM, a desktop tool) a rotating file is acceptable.

---
title: Never log secrets or whole payloads, and redact sensitive keys in a structlog processor
summary: One processor that masks password, token and authorization beats remembering at every call.
impact: high
applies: [python, structlog]
sources: [https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html]
---

## Rule

Do not log passwords, tokens, API keys, session ids, `Authorization` headers or whole request bodies; log selected fields. Add one processor before the renderer that masks sensitive keys, so no call site has to remember.

## Why

A single `log.info("request", headers=headers)` writes bearer tokens into every log store and every backup of it.

## Incorrect

```python
log.info("request", headers=dict(request.headers))
```

## Correct

```python
SENSITIVE = {"password", "token", "authorization", "api_key", "secret"}

def redact(_, __, event_dict):
    for key in list(event_dict):
        if key.lower() in SENSITIVE:
            event_dict[key] = "***"
    return event_dict

structlog.configure(processors=[..., redact, renderer])
log.info("request", method=request.method, path=request.url.path)
```

## Exceptions

Key-name redaction is defence in depth: a secret inside a value, a message or a traceback still leaks.

---
title: Mock only system boundaries, and create every mock with autospec
summary: Mock HTTP and queues, not your own logic; autospec makes a mock reject calls the real object would.
impact: high
applies: [python, pytest]
sources: [https://docs.python.org/3/library/unittest.mock.html#autospeccing, https://lundberg.github.io/respx/, https://github.com/getsentry/responses]
---

## Rule

Mock the edges of the system (HTTP with `respx` for httpx or `responses` for requests, queues), not your own modules; the clock has its own rule. Create each mock with `autospec=True`.

## Why

A plain mock accepts any attribute and any arguments, so a renamed method keeps the test green while the real call fails.

## Incorrect

```python
with patch.object(Client, "fetch_user", return_value=user) as m:
    m.fetch_usr(1)   # typo, still passes
```

## Correct

```python
with patch.object(Client, "fetch_user", autospec=True, return_value=user):
    ...   # a wrong name or signature raises
```

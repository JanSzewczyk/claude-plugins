---
title: Keep secrets wrapped in SecretStr until the call that needs them
summary: SecretStr masks a value in repr, logs and JSON by default; get_secret_value() marks the one place it is read.
impact: high
applies: [python, pydantic-settings]
sources: [https://pydantic.dev/docs/validation/latest/api/pydantic/types/]
---

## Rule

Type every password, token and API key setting as `SecretStr` (or `SecretBytes`) and unwrap it with `get_secret_value()` only in the call that needs the real value.

## Why

A plain `str` secret is printed in full by `repr(settings)`, a logged settings object or a serialised dump, while a `SecretStr` shows `**********` and makes each real read easy to find in review.

## Incorrect

```python
class Settings(BaseSettings):
    api_key: str

log.info("started", settings=settings)   # writes the key
```

## Correct

```python
class Settings(BaseSettings):
    api_key: SecretStr

log.info("started", settings=settings)   # api_key=SecretStr('**********')
client = Client(api_key=settings.api_key.get_secret_value())
```

## Exceptions

`SecretStr` hides a value from output, it does not encrypt it, and a custom field serializer can reveal it. It complements the logger's redaction (`security/python/redact-secrets-in-the-logger-not-at-call-sites`), which still catches secrets that were never typed.

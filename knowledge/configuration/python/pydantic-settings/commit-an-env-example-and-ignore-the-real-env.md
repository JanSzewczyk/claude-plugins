---
title: Commit an .env.example that lists every variable and git-ignore the real .env
summary: The example file is the documented list of settings; the real .env holds secrets and stays out of git.
impact: medium
applies: [python, pydantic-settings]
sources: [https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/#dotenv-env-support, https://12factor.net/config]
---

## Rule

Keep `.env.example` in the repository with every variable the `Settings` class reads, a safe sample value and a one-line comment (for a list setting, show the JSON form). Add `.env` to `.gitignore` and never commit it. Add the variable to `.env.example` in the same change that adds the field.

## Why

Without the example file a new developer learns the variables by reading code and a deployer misses one, while a committed `.env` puts its secrets into the history for good.

## Incorrect

```text
# .env committed to git
API_KEY=sk-live-4f9c...
```

## Correct

```text
# .env.example (committed)
LOG_LEVEL=INFO               # DEBUG, INFO, WARNING, ERROR or CRITICAL
CORS_ORIGINS=[]              # JSON list, e.g. ["https://app.example.com"]
API_KEY=change-me            # never put a real key here
```

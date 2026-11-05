---
title: Never build a Template from a string that already contains user data
summary: Write t"..." with user values as interpolations; Template(f"...") turns them into static text.
impact: critical
applies: [python]
sources: [https://peps.python.org/pep-0750/]
---

## Rule

Build SQL and HTML with a `t"..."` literal that keeps user values as interpolations, and pass the `Template` to a function that parameterizes or escapes each one. Never pass a string made with an f-string, `str.format` or `+` to `Template(...)`, and never render a `Template` to plain text and execute it.

## Why

A string built before `Template(...)` is called makes the user's value part of the static template text, so the processing function can no longer tell data from code, which is plain SQL injection.

## Incorrect

```python
query = Template(f"SELECT * FROM users WHERE name = '{name}'")
cursor.execute(*to_sql(query))
```

## Correct

```python
query = t"SELECT * FROM users WHERE name = {name}"
cursor.execute(*to_sql(query))  # to_sql returns (sql, params)
```

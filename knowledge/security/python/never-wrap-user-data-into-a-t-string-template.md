---
title: Never turn user data into template text by combining f-strings with t-strings
summary: A processing function must receive the Template; an f-string inside a t-string makes user input part of the query.
impact: critical
applies: [python]
sources: [https://peps.python.org/pep-0750/]
---

## Rule

Build SQL and HTML from t-strings and pass the `Template` object to a function that parameterizes or escapes each interpolation. Never put an f-string, `str.format` or `+` inside a t-string, and never convert a `Template` to `str` before it is processed.

## Why

An f-string is evaluated before the template is built, so the user's value becomes static template text and the processing function can no longer tell data from code, which is plain SQL injection.

## Incorrect

```python
query = t"SELECT * FROM users WHERE name = {f'{name}'}"
cursor.execute(str(query))
```

## Correct

```python
query = t"SELECT * FROM users WHERE name = {name}"
cursor.execute(*to_sql(query))  # to_sql returns (sql, params)
```

---
title: Answer a request that the current state forbids with 409, not 422
summary: 422 is for input that is invalid on its own; a limit reached, an empty stock or a date before a stored one is 409.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9110#name-409-conflict, https://www.rfc-editor.org/rfc/rfc9110#name-422-unprocessable-content, https://schemathesis.readthedocs.io/en/stable/reference/checks/]
---

## Rule

Answer 409 Conflict when a request is valid by itself but the stored state forbids it: a per-member limit reached, no free copy, an already returned loan, a return dated before the stored borrow date. Keep 422 for input that is wrong without looking at any stored data.

## Why

A 422 for a rule that depends on stored data makes Schemathesis report a schema-valid request as rejected (ST202), and a documented example that happens to break the rule fails for every client that copies it.

## Incorrect

```python
ERRORS = {   # exception -> (status, slug, title)
    ReturnedBeforeBorrowed: (422, "returned-before-borrowed", "Returned before borrowed"),   # depends on the stored loan
}
```

## Correct

```python
ERRORS = {
    ReturnedBeforeBorrowed: (409, "returned-before-borrowed", "Returned before borrowed"),
}
```

## Exceptions

A rule between two fields of the same body (`end` before `start`) needs no stored data: raise it from a model validator and let it be a 422.

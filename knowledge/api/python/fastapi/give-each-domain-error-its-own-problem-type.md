---
title: Give each domain error its own Problem Details type
summary: A stable type URI per error lets a client branch on it; about:blank on every 409 forces it to parse detail.
impact: medium
applies: [python, fastapi]
sources: [https://www.rfc-editor.org/rfc/rfc9457#name-type]
---

## Rule

Give every domain exception a stable `type` of the form `urn:problem:<service>:<slug>` and a stable `title`, and send both in the Problem Details body. Keep `about:blank` with the status phrase only for errors that mean no more than their status: the framework's and generic ones (404, 405, 422, 500).

## Why

When "no free copy" and "already returned" are both `409` with `type: about:blank`, a client can tell them apart only by reading `detail`, which is text for people and may change.

## Incorrect

```python
return problem(409, str(exc))   # type: about:blank for every conflict
```

## Correct

```python
ERRORS = {   # exception -> (status, slug, title): the table of the one-handler note
    NoFreeCopy: (409, "no-free-copy", "No free copy"),
    LoanAlreadyReturned: (409, "loan-already-returned", "Loan already returned"),
}

status, slug, title = next(v for t, v in ERRORS.items() if isinstance(exc, t))
return problem(status, str(exc), type=f"urn:problem:library:{slug}", title=title)
```

## Exceptions

Use a resolvable `https://` URI instead of `urn:` when you publish a page that explains each problem.

---
title: Accept only ISO strings for date and aware datetime inputs
summary: Pydantic's lax mode reads 0 as 1970-01-01; a BeforeValidator makes the code match the spec's format.
impact: medium
applies: [python, fastapi]
sources: [https://pydantic.dev/docs/validation/latest/concepts/conversion_table/, https://schemathesis.readthedocs.io/en/stable/reference/checks/]
---

## Rule

Type every request `date` and timezone-aware `datetime` as an alias whose `BeforeValidator` accepts only a `YYYY-MM-DD…` string (or an already parsed `date`), so a number or a numeric string returns 422.

## Why

The spec declares `format: date`, but Pydantic's lax mode accepts int and numeric-string input for dates, so `0` becomes 1970-01-01 and the API accepts input its own contract excludes (Schemathesis reports it as ST201).

## Incorrect

```python
@router.get("/cups")
def cups(date: dt.date): ...          # GET /cups?date=0  ->  200, day 1970-01-01
```

## Correct

```python
ISO_PREFIX = re.compile(r"\d{4}-\d{2}-\d{2}")

def require_iso_text(value: Any) -> Any:
    if isinstance(value, dt.date) or (isinstance(value, str) and ISO_PREFIX.match(value)):
        return value
    raise ValueError("expected an ISO 8601 string")

type IsoDate = Annotated[dt.date, BeforeValidator(require_iso_text)]
type IsoAwareDatetime = Annotated[AwareDatetime, BeforeValidator(require_iso_text)]

@router.get("/cups")
def cups(date: IsoDate): ...          # GET /cups?date=0  ->  422
```

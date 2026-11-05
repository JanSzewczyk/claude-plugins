---
title: Replace dependencies with app.dependency_overrides in API tests
summary: Overrides swap the injected dependency for the test; patching import paths ties the test to module layout.
impact: medium
applies: [python, fastapi, pytest]
sources: [https://fastapi.tiangolo.com/advanced/testing-dependencies/]
---

## Rule

In tests of a FastAPI app, replace dependencies through `app.dependency_overrides` and clear it afterwards.

## Why

Patching `myapp.routes.get_db` breaks as soon as the function moves or is imported under another name, while an override targets the dependency the route actually declares.

## Incorrect

```python
def test_get_user(client, mocker):
    mocker.patch("myapp.routes.get_db", return_value=fake_db)
```

## Correct

```python
@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: fake_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

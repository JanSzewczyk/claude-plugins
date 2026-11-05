---
title: Write pytest tests as plain functions with independent state and built-in fixtures first
summary: No TestCase classes; use tmp_path, monkeypatch, capsys and caplog first; shared fixtures go in conftest.py.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/fixtures.html]
---

## Rule

Write tests as functions in `tests/`, arranged as Arrange, Act, Assert, with no state shared between them. Use the built-in fixtures (`tmp_path`, `monkeypatch`, `capsys`, `caplog`) before writing your own, and put shared fixtures in `conftest.py`. Configure `testpaths` in `pyproject.toml`.

## Why

Tests that share state pass or fail depending on order, and hand-rolled temp directories or patched globals leak into the next test.

## Incorrect

```python
class TestCache(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
```

## Correct

```python
def test_cache_writes_file(tmp_path):
    Cache(tmp_path).put("k", "v")
    assert (tmp_path / "k").read_text() == "v"
```

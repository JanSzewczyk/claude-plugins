---
title: Use pytest's built-in fixtures instead of hand-rolled setup
summary: tmp_path, monkeypatch, capsys and caplog create and undo their state per test; reach for them before writing your own.
impact: medium
applies: [python, pytest]
sources: [https://docs.pytest.org/en/stable/how-to/tmp_path.html, https://docs.pytest.org/en/stable/how-to/monkeypatch.html, https://docs.pytest.org/en/stable/how-to/capture-stdout-stderr.html]
---

## Rule

Use the built-in fixtures (`tmp_path`, `monkeypatch`, `capsys`, `caplog`) before writing a fixture or setup code of your own.

## Why

Hand-rolled temp directories and patched globals have to be cleaned up by the test, and the first failure before that cleanup leaks them into the next test; the built-in fixtures undo themselves.

## Incorrect

```python
def test_cache_writes_file():
    directory = tempfile.mkdtemp()
    Cache(directory).put("k", "v")
    assert open(f"{directory}/k").read() == "v"
```

## Correct

```python
def test_cache_writes_file(tmp_path):
    Cache(tmp_path).put("k", "v")
    assert (tmp_path / "k").read_text() == "v"
```

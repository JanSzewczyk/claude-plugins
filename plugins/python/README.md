# python

Python development — the language layer for Python projects. Today it carries the generated rules for `factory_boy` test data factories; Python-specific skills and agents (pytest, linting, packaging) belong here as they are added.

## Contents

### Skills

| Skill                | Invoke with   | Description                                                                                                                  |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **builder-rules-py** | — (preloaded) | Generated background knowledge: test data factory rules for Python and `factory_boy`, for Python testing agents to preload |

`builder-rules-py` is generated from `knowledge/` at the repo root. Edit the notes there and run
the `knowledge-dev` build; never edit the generated files.

## Installation

```bash
/plugin install python@szum-tech
```

For the stack-detecting `/builder-factory` skill, which writes `factory_boy` factories in a Python
project, install the **testing** core as well.

## Troubleshooting

| Problem                                 | Solution                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `builder-rules-py` never shows up as `/` | It is background knowledge (`user-invocable: false`) — agents preload it; use `/builder-factory` to write factories |

## Related Plugins

- [**testing**](../testing/) — technology-agnostic testing core (`builder-factory`, Playwright)
- [**typescript**](../typescript/) — the equivalent language layer for TypeScript and JavaScript

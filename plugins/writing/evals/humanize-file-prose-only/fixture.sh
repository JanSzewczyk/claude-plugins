#!/usr/bin/env bash
# Writes ./notes.md: AI-sounding prose around a code block that must survive unchanged.
set -euo pipefail
cat > notes.md <<'DRAFT'
# Release Notes

Great question! Here is a quick overview of what changed.

The new cache layer serves as a pivotal foundation for faster builds, highlighting our commitment
to performance.

- **Speed:** builds are faster.
- **Safety:** nothing else changed.

```bash
# leverage the cache — do not edit this line
npm run build -- --cache
```

I hope this helps! Let me know if you have any questions.
DRAFT

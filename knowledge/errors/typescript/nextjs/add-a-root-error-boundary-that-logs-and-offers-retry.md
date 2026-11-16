---
title: Add a root app/error.tsx that logs the error with its digest and offers retry
summary: The boundary reports the error once with its digest and shows a generic message and a retry button.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/error, https://nextjs.org/docs/app/getting-started/error-handling]
---

## Rule

Give the app a root `app/error.tsx` Client Component that logs the error with its `digest` in an effect, shows a generic message, and offers a button that calls `retry()`. Add a segment `error.tsx` only where that segment needs different recovery.

## Why

Without a boundary an uncaught render error replaces the whole page with the framework's error screen, the user has no way back, and nobody can match it to the server log because the digest was never recorded.

## Incorrect

```tsx
export default function Error({ error }: { error: Error }) {
  return <p>{error.message}</p>; // no log, no recovery, branches on text
}
```

## Correct

```tsx
"use client";
import * as React from "react";

const log = createLogger({ module: "root-error-boundary" });

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry(): void }) {
  React.useEffect(() => {
    log.withError(error).withMetadata({ digest: error.digest }).error("Unhandled render error");
  }, [error]);
  return <ErrorState title="Something went wrong" onRetry={retry} />;
}
```

## Exceptions

Before Next.js 16.3 the prop is `reset` (16.2: `unstable_retry`). An error in the root layout itself needs `app/global-error.tsx`, which renders its own `<html>` and `<body>`.

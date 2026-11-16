---
title: Import from another folder through the ~/ path alias, not a deep relative path
summary: ../../.. paths break when a file moves and hide where the import comes from; ~/ is rooted at the source root.
impact: medium
applies: [typescript]
sources: [https://www.typescriptlang.org/tsconfig/#paths]
---

## Rule

Import anything outside the current folder through the `~/` alias, which `tsconfig.json` maps to the project's source root (`"paths": { "~/*": ["./*"] }`, or `./src/*` when the code lives in `src/`). Keep `./` only for a sibling file in the same folder.

## Why

A relative path that climbs folders (`../../../lib/db`) breaks every time the importing file moves, and the reader has to count dots to find the target; an alias path is the same from every file and moves with nothing.

## Incorrect

```ts
import { getProject } from "../../../features/projects/server/db";
import { Button } from "../../components/ui/button";
```

## Correct

```ts
import { getProject } from "~/features/projects/server/db";
import { Button } from "~/components/ui/button";
import { columns } from "./columns";
```

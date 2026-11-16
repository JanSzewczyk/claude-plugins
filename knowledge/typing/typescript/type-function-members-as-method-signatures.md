---
title: Type function members of an object type as method signatures
summary: Write onDelete(id: string): void, not onDelete: (id: string) => void, so the members match function declarations.
impact: low
applies: [typescript]
sources: [https://www.typescriptlang.org/docs/handbook/2/objects.html, https://www.typescriptlang.org/tsconfig/#strictFunctionTypes]
---

## Rule

In a `type` or `interface`, declare a member that is a function with method signature syntax (`name(params): Result`), not as a property holding an arrow function type.

## Why

Arrow-typed members turn a props type into a wall of `: (...) =>` that formatters break across lines and that reads like data fields rather than the callbacks they are; the method form matches how the functions themselves are declared with `function`.

## Incorrect

```ts
type ProjectSidebarProps = {
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<ActionResponse>;
  onDelete: (projectId: string) => void;
};
```

## Correct

```ts
type ProjectSidebarProps = {
  onUpdateStatus(projectId: string, status: ProjectStatus): Promise<ActionResponse>;
  onDelete(projectId: string): void;
};
```

## Exceptions

Method signatures are compared bivariantly, so `strictFunctionTypes` does not check their parameters the way it checks a property of function type. Keep the property form where a callback is assigned from a function with a narrower parameter type and the soundness matters.

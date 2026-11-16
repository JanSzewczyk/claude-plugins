---
title: Load a page's or layout's data in one loadData function, never in the component body
summary: A module-level async loadData holds the guard, the reads and the failure responses; the component awaits it once.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/getting-started/fetching-data]
---

## Rule

Declare one module-level `async function loadData()` in every `page.tsx` or `layout.tsx` that reads data. It runs the auth guard, every read and the failure responses, and returns plain values; the component awaits it once and only renders.

## Why

Reads scattered through the component body or its children escape the guard and the failure handling, so one forgotten check renders data to the wrong user or crashes on an error nobody mapped, and a reviewer cannot see in one place what the route reads.

## Incorrect

```tsx
export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const [, project] = await getProject(id);
  return <ProjectHeader project={project} members={(await getMembers(id))[1]} />;
}
```

## Correct

```tsx
async function loadData(projectId: string) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) unauthorized();

  const [error, project] = await getProject(userId, projectId);
  if (error?.isNotFound || error?.isPermissionDenied) notFound();
  if (error) throw new Error("Failed to load the project", { cause: error });
  return { project };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const { project } = await loadData(id);
  return <ProjectHeader project={project} />;
}
```

## Exceptions

A page or layout that reads nothing (static content, chrome without data) has no `loadData`.

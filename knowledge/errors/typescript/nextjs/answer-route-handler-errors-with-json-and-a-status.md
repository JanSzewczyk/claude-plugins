---
title: Answer a route handler failure with a JSON error body and the matching status
summary: Map the ServiceError code to an HTTP status and return { error } as JSON; never let the handler throw.
impact: medium
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/api-reference/file-conventions/route, https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static]
---

## Rule

In a route handler, turn every failure into `Response.json({ error: message }, { status })`, with the status taken from the `ServiceError` code (400 validation, 404 not found, 409 already exists, 403 permission denied, 429 rate limited, 502 external API, 503 unavailable, 504 timeout, 500 otherwise). Log the unexpected ones once before answering.

## Why

A handler that throws answers with an empty 500, so an API client cannot tell bad input from an outage and retries requests that will never succeed.

## Incorrect

```ts
export async function POST(request: Request) {
  const input = budgetSchema.parse(await request.json()); // throws on bad input
  const [error, budget] = await createBudget(input);
  if (error) throw error; // empty 500 for a duplicate name
  return Response.json(budget, { status: 201 });
}
```

## Correct

```ts
export async function POST(request: Request) {
  const parsed = budgetSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Invalid budget" }, { status: 400 });
  const [error, budget] = await createBudget(parsed.data);
  if (error) return Response.json({ error: publicMessage(error) }, { status: statusFor(error) });
  return Response.json(budget, { status: 201 });
}
```

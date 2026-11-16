---
title: Guard a service mutation in a fixed order: role, profile, permission, then write
summary: Each guard returns its error tuple at once, so the write runs only after every check passed.
impact: high
applies: [typescript, nextjs]
sources: [https://nextjs.org/docs/app/guides/data-security]
---

## Rule

Write a service mutation as: check the user's role, load their profile, run the feature check from `permissions.ts`, then call the db mutation. Return `[error, null]` at the first failure and `[null, result]` at the end.

## Why

A permission check placed after the write, or one that runs before the profile it needs is loaded, lets a forbidden write through or fails on the wrong error, and the order differs between services so reviewers miss the gap.

## Incorrect

```ts
const [dbError, invoice] = await insertInvoice({ ownerId: userId, data });
const [permissionError] = await canCreateInvoice(userId); // too late
if (permissionError) return [permissionError, null];
```

## Correct

```ts
const [roleError] = await requireRole(userId, [Role.MEMBER]);
if (roleError) return [roleError, null];
const [profileError, profile] = await getCachedProfile(userId);
if (profileError) return [profileError, null];
const [permissionError] = await canCreateInvoice(profile.id);
if (permissionError) return [permissionError, null];
return insertInvoice({ ownerId: profile.id, data });
```

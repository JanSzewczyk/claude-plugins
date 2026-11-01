# Grouping packages into version-locked families

The goal of grouping is **safety**, not tidiness. Packages that share a release train must move together or the build
breaks on a version mismatch, even when each individual bump installs without error. Group those packages, label the group
by theme, and treat the group as a single unit for risk classification, confirmation, verification, and commit.

The families themselves are per ecosystem: see the **Families** section of the profile you loaded. A group never crosses
an ecosystem boundary.

## The one rule that matters

> **A group = the set of packages that must be on a compatible version with each other.** Its risk level is the
> **maximum** risk of any member (a family with one major bump is a major group). Never pull a major member out of its
> family to "do it later": the family moves together or not at all.

## Finding families

The profile's table lists the families you'll see most often. Match by name pattern rather than treating it as a fixed
list, since new packages join these families over time. Detect others by the same logic: shared scope or group ID, shared
release cadence, or one package requiring an exact range of another.

## Anything that isn't in a family

Leftover single packages don't need a family. Batch them by risk:

- One **patch/minor singletons** group: low risk, update together.
- Each **major singleton** as its own group, so a breaking bump gets its own confirmation and its own rollback point.

## Ordering the groups

Process **lowest risk first**, so the safe wins are committed before you touch anything breaking:

1. Type-only and tooling **patch/minor** groups (the profile's **Families** section names them)
2. Feature/runtime **patch/minor** groups
3. **All major groups last**, individually: each one fetches its Context7 migration guide and pauses for confirmation.

## Small projects

If there are only a handful of outdated packages (≈ 5 or fewer) and none of them form a family, don't over-engineer it:
a single group, or one package per group, is fine. Grouping exists to manage coupling and blast radius. When there's little
of either, keep it simple.

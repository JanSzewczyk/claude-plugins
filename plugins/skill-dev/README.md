# skill-dev

Write better skills — audit one skill for authoring quality and get back the edits it needs, then A/B test whether a wording change actually improved the outcome.

This plugin is about **craft**: whether a single skill is well built, and whether an edit to it helped. Neither skill needs a marketplace repo, a `plugin.json` or a git tag — they work just as well on a loose skill under `~/.claude/skills/`. If what you want is to keep a *marketplace* honest and cut releases, that is [**plugin-dev**](../plugin-dev/) — the two were split so neither audience carries the other's tooling.

## Contents

### Skills

| Skill | Invoke with | Description |
|-------|-------------|-------------|
| **skill-audit** | `/skill-audit` | Audit one skill for authoring quality — triggering, context budget, dead links and orphan references, prose economy — and get back a report with proposed edits |
| **skill-ab-optimizer** | `/skill-ab-optimizer` | A/B test and improve Claude Code skills — quantitative metrics on triggering and outcomes, changes accepted only when they measurably help |

## Installation

```bash
cp -r plugins/skill-dev/skills/*  your-project/.claude/skills/
```

Or install the plugin from the marketplace:

```
/plugin marketplace add JanSzewczyk/claude-plugins
/plugin install skill-dev@szum-tech
```

## Usage

### Audit one skill

```bash
/skill-audit plugins/testing/skills/unit-testing
/skill-audit ~/.claude/skills/my-skill
```

A deterministic sweep for the facts — the frontmatter contract, the context budget, the link graph — then four parallel probes for what needs a reader. The report ends with proposed diffs; nothing is written until you say so.

The sweep is runnable on its own when you only want the mechanical half:

```bash
node plugins/skill-dev/skills/skill-audit/scripts/check-skill.mjs plugins/testing/skills/unit-testing
```

Exit 0 clean, 1 on any error. `--strict` also fails on warnings, `--json` emits the full inventory plus the `metrics` block the probes are given.

### Improve a skill against evidence

```bash
/skill-ab-optimizer auto plugins/code-quality/skills/performance-optimization --iterations 5
```

## How the pieces fit

1. **skill-audit** answers *is this skill well built?* — it reads the skill and proposes the edits. A script proves the facts about bytes (dead links, budget, contract), and four parallel probes judge what needs a reader (prose economy, degrees of freedom, whether a reference file earns a read).
2. **skill-ab-optimizer** answers *did the edit actually help?* — it runs A/B experiments over a skill's wording and accepts a change only when the measured outcome improves.

The pairing to remember: **the audit finds what to change; the optimizer proves the change helped.** The audit reads and never writes; the optimizer measures and promotes.

## Requirements

- Node.js 18+ (the bundled scripts are plain ESM, no dependencies)
- A subagent-capable session for `skill-audit`'s parallel probes — it falls back to running them sequentially and says so in the report

## Troubleshooting

| Problem | Solution |
| ------- | -------- |
| `skill-audit` flags Polish in a skill that is legitimately about Polish | Expected — the hint says to check before rewriting. A domain proper noun or a deliberately quoted user phrasing is correct as it stands; say so in the report rather than proposing an edit |
| `skill-audit` exits 1 on a skill you consider fine | Only errors exit 1 without `--strict`, and every error is a fact on disk — a dead link, a name that disagrees with its folder, a description over 1024 characters. Read `references/checks.md` for the repair before assuming the check is wrong |
| `skill-audit` reports a check firing on almost every skill | That is a calibration failure, not your skill's fault. The thresholds are set so no check fires on more than 60% of a healthy repo; a check above that is one to demote to a metric — there is no ignore file by design |
| Two probes report the same defect differently | Ownership is exclusive; the merge keeps the owner's finding. If they genuinely disagree, the roster table in `SKILL.md` says which one owns the rule |
| `skill-ab-optimizer` runs are inconsistent | Increase `--iterations`; a single run tells you almost nothing about a description change |

## Related Plugins

- [**plugin-dev**](../plugin-dev/) — the other half of the split: marketplace drift auditing and semver release tagging
- [**code-quality**](../code-quality/) — code review, dead-code, and dependency tooling for application repos

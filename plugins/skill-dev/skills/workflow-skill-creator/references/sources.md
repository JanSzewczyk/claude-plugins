# Sources

For maintainers. A run never needs this file. Each rule in SKILL.md is listed
with the evidence behind it, so a rule can be weighed before it is changed or
cut. Research date: 2026-09. Sources marked *(snippet)* were seen only in search
results, not read in full.

## Wording does not hold the order

- Long procedures degrade. Accuracy falls from 63% at 5 steps to 20% at 95,
  through premature answers and under-executed traces.
  https://arxiv.org/abs/2605.00817
- Performance drops as input grows, even on simple tasks, and distractors
  compound the loss. https://www.trychroma.com/research/context-rot
- Models do best with relevant material at the start or end of the context.
  https://arxiv.org/abs/2307.03172
- Frontier models reach 68% accuracy with 500 simultaneous instructions.
  https://arxiv.org/abs/2507.11538 *(snippet)*
- A 5-step skill had steps 3–5 dropped even with all-caps words and numbered headers.
  https://github.com/anthropics/claude-code/issues/41510
- Gates written as "CANNOT… not optional" were rationalised away as "simple
  enough". https://github.com/anthropics/claude-code/issues/20024
- Separate prompts for draft, critique and refine beat one stepwise prompt.
  https://aclanthology.org/2024.findings-acl.449/ *(snippet)*

## Tiers and structure

- Workflows are predefined code paths, and prompt chaining uses programmatic
  gates. The advice is to start simple.
  https://www.anthropic.com/engineering/building-effective-agents
- The skill authoring guidance covers checklists copied into the reply,
  validate → fix → repeat, plan → validate → execute, degrees of freedom,
  references one level deep and a 500-line body.
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- The open-standard guidance adds scripts for deterministic steps, non-
  interactive idempotent scripts and a 1,024-character description.
  https://agentskills.io/specification ·
  https://agentskills.io/skill-creation/best-practices.md
- Skill lifecycle: after compaction only the first 5,000 tokens of each skill
  come back, within a 25k budget shared by all skills. The same page covers the
  frontmatter hooks, `context: fork`, and the 1,536-character listing cap.
  https://code.claude.com/docs/en/skills
- A hook's exit 2 blocks the action, and skill hooks last for the rest of the
  session. https://code.claude.com/docs/en/hooks
- In dynamic workflows the script decides what runs next. There is no mid-run
  user input, and runs resume only within a session.
  https://code.claude.com/docs/en/workflows
- Anthropic's long-running harness keeps state in `json` because models overwrite
  it less than Markdown. It adds a progress file and targets one-shotting and
  premature victory.
  https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Agents use about 4x the tokens of chat and multi-agent systems about 15x. That
  setup is a poor fit for tightly dependent work.
  https://www.anthropic.com/engineering/multi-agent-research-system

## Description and triggering

- A description that summarises the workflow gets executed instead of the body.
  In one case the result was one review instead of two.
  https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md
- A skill was not invoked in 56% of eval cases. Wording mattered, and "You `MUST`
  invoke" did worse than "explore first, then invoke".
  https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals
- A hook raised skill activation from 55% to 100% on standard prompts.
  https://scottspence.com/posts/measuring-claude-code-skill-activation-with-sandboxed-evals

## Evidence and testing

- Curated skills added +16.6pp. Self-generated skills did worse than none, and
  focused skills beat exhaustive ones. https://arxiv.org/abs/2602.12670
- Skills tested TDD-style: pressure scenarios without the skill, rationalisations
  recorded verbatim, then the minimal skill. https://github.com/obra/superpowers
- The current skill-creator calls all-caps `ALWAYS`/`NEVER` "a yellow flag" and
  says to explain the why.
  https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md

## Proportionality and human gates

- Spec-driven flows impose a heavy review load, and one size fits nothing (a
  small bug became 16 acceptance criteria).
  https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
- 8 files and 1,300 lines for one feature.
  https://marmelab.com/blog/2025/11/12/spec-driven-development-waterfall-strikes-back.html
- Research → plan → implement, with human review where leverage is highest.
  https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md

## House rules without an external source

These come from the owner's experience with earlier skills, not from the
literature:

- run state in the scratchpad;
- report-and-draft as the default for outward writes;
- overriding values at the call site instead of editing someone else's skill;
- retiring instead of deleting;
- parking later steps visibly;
- no code maps;
- measured conventions;
- no agent reviewing another agent's output.

# Proposals

Shared by `python-api-team` and `run-python-task`. Agents may find that a rule is wrong, missing or
contradicted by what they observe, or that their own instructions are unclear. They report it under
Proposals and keep following the rule until it changes: a wrong rule looks like a right one until a
probe checks it, which is why the table needs evidence and a human. Collect them in the report:

1. Merge duplicates and drop any proposal without evidence (a file and line, or a command and its
   output). Read the rule each one cites: a proposal against text the rule already has is dropped
   (one agent reported a missing `$ref` that the note's own example contained; the agent's helper
   had departed from the example).
2. Show one table: `#`, from which agent, observation with evidence, proposed change (a rule, a
   note or an agent definition), and whether it was reproduced.
3. Change nothing yourself. Edits are a separate task in the marketplace repository, after the user
   picks the numbers, and the target decides the route: a rule in `knowledge/` goes through
   `/knowledge-author`; the SKILL.md files and the agent definitions (the flow, the steps, the
   limits) are edited directly, and `/skill-audit` checks the result. In a project that only
   installs the plugin, offer the table as an issue for that repository.

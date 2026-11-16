# Step gates

Shared by `python-api-team` and `run-python-task`. A gate is what a hand-off must contain before
the next step runs. A failed gate is resent once with what is missing; a second failure stops the
flow (`python-api-team` asks the user, `run-python-task` reports it).

| Step | Agent | Prompt asks for | Gate |
| --- | --- | --- | --- |
| Build | developer | the exported OpenAPI path, the list of state-dependent rules with their guards, the test files with the cases each covers, which checks it ran; commit the work and return the commit hash | each check stated as run or not run, and the OpenAPI file named; either missing fails the gate |
| Test | tester | the OpenAPI path, the rule list and, where one exists, the architect's checklist, plus the developer's list of test files. It lists the cases from the contract first, then reads the developer's tests and adds only what is missing, in the project's own test directory: one suite at the end, not a second beside it | a Result line and a defects table |
| Fix | developer | the tester's defects table, in its order | every number comes back fixed or disputed with a reason; run the tester's command that turns the suite green yourself |
| Review | reviewer | the developer's latest hand-off and the tester's files | a verdict, a scorecard and a findings table whose rows each cite a rule or a reproduction |
| Fix again | developer, then reviewer | the finding numbers, in the reviewer's order | every number comes back fixed or disputed with a reason, and the project's checks pass (run the tester's green command yourself) before the reviewer sees the diff; the reviewer then sees only what changed |

A defect the tester marks as a stricter reading of an ambiguous contract is the developer's call:
it is fixed or disputed, and the report lists it as a decision taken.

Only 🔴 and 🟡 findings are fixed; 🔵 ones go to the report as follow-ups. After the second review
stop and report: open findings are listed, not looped on, because an endless fix loop spends tokens
on diminishing returns.

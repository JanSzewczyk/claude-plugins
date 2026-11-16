# Budgets

Shared by `python-api-team` and `run-python-task`. The first two runs of the full flow took 1 h 40 min
and 3 h 25 min and found nothing worse than 🟡; most of the time went to repeating checks,
not to finding defects. So:

- One full `make check` is the gate at a hand-off. The developer iterates on the tests it changed
  and runs the full gate before each commit; the tester and the reviewer run it once each, at the
  commit they were given, and quote a green result at the same commit instead of repeating it.
- The tester keeps the suite fast: a test that starts a nested pytest or a second process needs a
  reason, and the Result line reports the suite's run time before and after.
- A step that overruns its budget hands back what it has. An unfinished proof is listed under Not
  checked, not run to the end.

## Full flow (`python-api-team`)

- A guard gets one mutant; a second only where a constraint backs the guard. Mutants run side by
  side from separate copies, and an agent waits for them with the Monitor tool or `wait`, not with
  a sleep loop.
- Race tests are repeated five times to check flakiness, the suite under two seeds.

## Task flow (`run-python-task`)

A task is a sub-step of a larger piece of work, and a later audit covers the whole feature. So the
tester makes **one pass**: it runs the suite once and does not repeat race tests, run a second seed,
mutate guards or run a fuzzer, and it does not hunt for rare defects. Anything it did not prove goes
under Not checked.

# Agents running side by side

Used by `python-api-team`. Two agents that start the service fought over the same port in a test run
and one reported the other's server, so a pair running together gets:

- disjoint port ranges in its prompts: the tester 8700-8799, the reviewer 8800-8899;
- its own copy of the tree.

Only the tester and the reviewer of the lean variant, and developer parts on disjoint files (each in
a separate worktree), run together. Everything else runs one at a time.

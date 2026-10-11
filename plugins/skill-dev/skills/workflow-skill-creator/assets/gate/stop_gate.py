#!/usr/bin/env python3
"""Stop hook: one nudge when the model tries to end its turn with a run still open.

Copy it next to phase.py and phases.json and register it as a Stop hook in the
skill's frontmatter. It reads the hook input on stdin, looks for runs of this
flow in the session scratchpad that are neither complete nor abandoned, and if
it finds one it blocks the stop once (exit 2) with the next phase named.

It never blocks twice in a row: when the input says a stop hook already fired
(stop_hook_active), it lets the turn end. A run that is waiting on the user
therefore costs one extra sentence, not a loop.
"""
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import phase  # noqa: E402


def main():
    try:
        data = json.load(sys.stdin)
    except (ValueError, OSError):
        return 0
    if not isinstance(data, dict) or data.get("stop_hook_active"):
        return 0
    # A broken phases.json is reported by every phase.py call. Failing here instead would
    # print a hook error at the end of every turn for the rest of the session.
    try:
        cfg = phase.load_config()
    except phase.ConfigError:
        return 0
    if phase.lint_config(cfg):
        return 0

    root = os.environ.get("FLOW_RUN_ROOT")
    if not root and data.get("scratchpad_dir"):
        root = os.path.join(data["scratchpad_dir"], cfg["flow"])
    if not root:
        if data.get("session_id"):
            os.environ["CLAUDE_CODE_SESSION_ID"] = data["session_id"]
        root = phase.run_root(cfg)
    if not root:
        return 0

    open_runs = []
    for path in glob.glob(os.path.join(root, "*", "state.json")):
        try:
            with open(path) as f:
                state = json.load(f)
        except (ValueError, OSError):
            continue
        if not isinstance(state, dict) or state.get("abandoned"):
            continue
        nxt = phase.next_phase(cfg, state)
        if nxt:
            open_runs.append((state.get("id", "?"), nxt))
    if not open_runs:
        return 0

    lines = ["%s run %s is open at phase %d (%s → %s)."
             % (cfg["flow"], rid, nxt["n"], nxt["title"], nxt["artifact"]) for rid, nxt in open_runs]
    lines.append("Continue it and close each phase with phase.py done. If you are waiting on the "
                 "user, say that in one sentence and stop. If the run should end here, run "
                 "phase.py abandon <ID> and say why.")
    print("\n".join(lines), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())

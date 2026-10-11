#!/usr/bin/env python3
"""Phase gate for a sequential skill.

Copy this file verbatim into a skill's scripts/ directory, next to a phases.json
that describes that skill's phases. The engine knows nothing about any flow; every
rule it enforces comes from phases.json.

    phase.py init    <ID>        create the run directory and its state
    phase.py check   <ID> <N>    run the checks of phases 0..N, change nothing
    phase.py done    <ID> <N>    same checks; on green, close phase N
    phase.py status  <ID>        closed phases, the next one and its artifact
    phase.py dir     <ID>        print the run directory
    phase.py abandon <ID>        mark the run abandoned (the stop hook ignores it)
    phase.py lint                validate phases.json itself

Exit codes: 0 green, 1 red (the checks printed what is missing), 2 usage or config error.

The run lives in the session scratchpad under <flow>/<ID>/. FLOW_RUN_ROOT overrides
the scratchpad; FLOW_PHASES overrides the phases.json location.
"""
import glob
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
# Recovery hints print this, so a pasted hint works even without the exec bit.
SELF = "python3 " + os.path.abspath(sys.argv[0])
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
PLACEHOLDER_RE = re.compile(r"^\s*(<[^>]*>|todo|tbd|\.\.\.|…|-|n/a)?\s*$", re.IGNORECASE)
CHECK_TYPES = {"sections", "field", "regex", "absent", "implies", "custom"}
# A custom check that never exits would hang the gate with no message. Five minutes is
# far above a local check and leaves room for one that reads a write back over the network.
CUSTOM_TIMEOUT = 300


class ConfigError(Exception):
    pass


def die(msg, code=2):
    print(msg, file=sys.stderr)
    sys.exit(code)


# ---------------------------------------------------------------- config

def load_config():
    path = os.environ.get("FLOW_PHASES") or os.path.join(HERE, "phases.json")
    try:
        with open(path) as f:
            cfg = json.load(f)
    except FileNotFoundError:
        raise ConfigError("phases.json not found at %s" % path)
    except json.JSONDecodeError as e:
        raise ConfigError("phases.json is not valid JSON: %s" % e)
    if not isinstance(cfg, dict):
        raise ConfigError("phases.json must be an object with 'flow' and 'phases', not a %s"
                          % type(cfg).__name__)
    cfg["_path"] = path
    return cfg


def _str_list(value):
    return isinstance(value, list) and bool(value) and all(isinstance(v, str) and v for v in value)


def lint_config(cfg):
    """Return a list of problems with phases.json; empty means usable.

    Every value the checks later rely on is type-checked here, because a wrong type
    does not fail loudly at run time: a string 'enum' matches substrings, and a string
    'headings' is read one character at a time."""
    if not isinstance(cfg, dict):
        return ["phases.json must be an object with 'flow' and 'phases'"]
    problems = []
    if not isinstance(cfg.get("flow"), str) or not ID_RE.match(cfg.get("flow", "")):
        problems.append("'flow' must be a short name made of letters, digits, '.', '_' or '-'")
    phases = cfg.get("phases")
    if not isinstance(phases, list) or not phases:
        return problems + ["'phases' must be a non-empty list"]
    artifacts = set()
    for i, p in enumerate(phases):
        where = "phase %s" % i
        if not isinstance(p, dict):
            problems.append("%s: must be an object" % where)
            continue
        if p.get("n") != i:
            problems.append("%s: 'n' must be %d — phases are numbered 0, 1, 2… in order" % (where, i))
        if not isinstance(p.get("title"), str) or not p.get("title"):
            problems.append("%s: missing 'title'" % where)
        art = p.get("artifact")
        if not isinstance(art, str) or not art or "/" in art or art.startswith("."):
            problems.append("%s: 'artifact' must be a bare file name in the run directory" % where)
        elif art in artifacts:
            problems.append("%s: artifact %s is already used by an earlier phase" % (where, art))
        else:
            artifacts.add(art)
        if "run_when" in p and not p.get("conditional"):
            problems.append("%s: 'run_when' only makes sense with \"conditional\": true" % where)
        if "run_when" in p:
            problems += ["%s run_when: %s" % (where, m) for m in _lint_cond(p["run_when"], artifacts)]
        checks = p.get("checks", [])
        if not isinstance(checks, list):
            problems.append("%s: 'checks' must be a list" % where)
            continue
        for j, c in enumerate(checks):
            cw = "%s check %d" % (where, j)
            if not isinstance(c, dict):
                problems.append("%s: must be an object" % cw)
                continue
            t = c.get("type")
            if t not in CHECK_TYPES:
                problems.append("%s: unknown type %r (known: %s)" % (cw, t, ", ".join(sorted(CHECK_TYPES))))
            elif t == "sections":
                if not _str_list(c.get("headings")):
                    problems.append("%s: 'sections' needs a 'headings' list of strings" % cw)
                mc = c.get("min_chars", 0)
                if not isinstance(mc, int) or isinstance(mc, bool) or mc < 0:
                    problems.append("%s: 'min_chars' must be a whole number" % cw)
            elif t == "field":
                if not isinstance(c.get("name"), str) or not c.get("name"):
                    problems.append("%s: 'field' needs a 'name'" % cw)
                if "enum" in c and not _str_list(c["enum"]):
                    problems.append("%s: 'enum' must be a list of strings" % cw)
            elif t in ("regex", "absent"):
                pattern = c.get("pattern")
                if not isinstance(pattern, str) or not pattern:
                    problems.append("%s: '%s' needs a 'pattern'" % (cw, t))
                else:
                    try:
                        re.compile(pattern, re.MULTILINE)
                    except re.error as e:
                        problems.append("%s: bad pattern: %s" % (cw, e))
            elif t == "implies":
                for key in ("if", "then"):
                    if key not in c:
                        problems.append("%s: 'implies' needs '%s'" % (cw, key))
                    else:
                        problems += ["%s %s: %s" % (cw, key, m) for m in _lint_cond(c[key], artifacts)]
            elif t == "custom":
                cmd = c.get("command")
                if not isinstance(cmd, str) or not cmd:
                    problems.append("%s: 'custom' needs a 'command'" % cw)
                else:
                    try:
                        cmd.format(run_dir="", id="", skill_dir="", scripts_dir="", artifact="")
                    except (KeyError, IndexError, ValueError) as e:
                        problems.append("%s: 'command' has a literal brace or unknown placeholder %s"
                                        " — write literal braces as {{ and }}" % (cw, e))
    return problems


def _lint_cond(cond, known_artifacts):
    out = []
    if not isinstance(cond, dict) or not isinstance(cond.get("artifact"), str) \
            or not isinstance(cond.get("field"), str):
        return ["needs 'artifact' and 'field'"]
    if "equals" not in cond and "in" not in cond:
        out.append("needs 'equals' or 'in'")
    if "equals" in cond and not isinstance(cond["equals"], str):
        out.append("'equals' must be a string — field values are read as text")
    if "in" in cond and not _str_list(cond["in"]):
        out.append("'in' must be a list of strings")
    if cond["artifact"] not in known_artifacts:
        out.append("artifact %s is not produced by this or an earlier phase" % cond["artifact"])
    return out


# ---------------------------------------------------------------- run directory

def scratchpad():
    sid = os.environ.get("CLAUDE_CODE_SESSION_ID") or os.environ.get("CLAUDE_SESSION_ID")
    if not sid:
        return None
    uid = os.getuid()
    bases = ["/private/tmp/claude-%d" % uid, "/tmp/claude-%d" % uid]
    tmp = os.environ.get("TMPDIR")
    if tmp:
        bases.append(os.path.join(tmp, "claude-%d" % uid))
    for base in bases:
        hits = glob.glob(os.path.join(base, "*", sid, "scratchpad"))
        if hits:
            return hits[0]
    return None


def run_root(cfg):
    root = os.environ.get("FLOW_RUN_ROOT")
    if root:
        return root.rstrip("/")
    pad = scratchpad()
    if pad:
        return os.path.join(pad, cfg["flow"])
    return None


def run_dir(cfg, run_id):
    if not ID_RE.match(run_id):
        die("run id %r: use letters, digits, '.', '_' or '-' only" % run_id)
    root = run_root(cfg)
    if not root:
        die("cannot find the session scratchpad. Put its path in front of every call:\n"
            "  FLOW_RUN_ROOT=<scratchpad>/%s %s <command> %s" % (cfg["flow"], SELF, run_id))
    return os.path.join(root, run_id)


def state_path(rdir):
    return os.path.join(rdir, "state.json")


def read_state(rdir):
    try:
        with open(state_path(rdir)) as f:
            state = json.load(f)
    except FileNotFoundError:
        return None
    except ValueError as e:
        die("%s is not valid JSON (%s). It is written only by this engine — restore it, or delete "
            "the run directory and start again with: %s init <ID>" % (state_path(rdir), e, SELF))
    if not isinstance(state, dict):
        die("%s is not a run state — delete the run directory and start again" % state_path(rdir))
    return state


def write_state(rdir, state):
    state["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tmp = state_path(rdir) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2)
    os.replace(tmp, state_path(rdir))


# ---------------------------------------------------------------- artifacts

def read_text(rdir, name):
    try:
        with open(os.path.join(rdir, name)) as f:
            return f.read()
    except FileNotFoundError:
        return None


def field_value(text, name):
    if text is None:
        return None
    # [ \t], not \s: \s crosses the newline, so an empty "Name:" would take the next line as its value.
    m = re.search(r"^\**%s\**[ \t]*:[ \t]*(.+?)[ \t]*$" % re.escape(name), text, re.MULTILINE)
    if not m:
        return None
    return m.group(1).strip().strip("`*").strip()


def _mark_lines(lines):
    """Yield (line, kind): kind is 'fence' for a fence marker, 'code' inside a fenced
    block, 'text' elsewhere. A '#' line inside a code block is a comment, not a heading."""
    fence = None
    for line in lines:
        s = line.lstrip()
        if fence is None and s.startswith(("```", "~~~")):
            fence = s[:3]
            yield line, "fence"
        elif fence is not None and s.startswith(fence):
            fence = None
            yield line, "fence"
        else:
            yield line, "code" if fence else "text"


def _is_heading(line, kind):
    return kind == "text" and line.lstrip().startswith("#")


def section_body(text, heading):
    marked = list(_mark_lines(text.splitlines()))
    level = len(heading) - len(heading.lstrip("#"))
    for i, (line, kind) in enumerate(marked):
        if kind == "text" and line.strip() == heading.strip():
            body = []
            for nxt, nkind in marked[i + 1:]:
                if _is_heading(nxt, nkind):
                    s = nxt.lstrip()
                    if len(s) - len(s.lstrip("#")) <= level:
                        break
                body.append(nxt)
            return "\n".join(body)
    return None


def section_content(body):
    """The part of a section body that is written content, not structure: without
    sub-headings and fence markers. Empty means the section holds only headings."""
    return "\n".join(l for l, kind in _mark_lines(body.splitlines())
                     if kind == "code" or (kind == "text" and not _is_heading(l, kind)))


def skipped_name(artifact):
    return os.path.splitext(artifact)[0] + ".skipped"


def cond_holds(rdir, cond):
    value = field_value(read_text(rdir, cond["artifact"]), cond["field"])
    if "equals" in cond:
        return value == cond["equals"]
    return value in cond["in"]


def describe(cond):
    want = cond.get("equals", cond.get("in"))
    return "%s says %s: %s" % (cond["artifact"], cond["field"], want)


def phase_failures(cfg, rdir, run_id, p):
    """Checks for one phase. Returns a list of failure strings."""
    art, skip = p["artifact"], skipped_name(p["artifact"])
    text, skip_text = read_text(rdir, art), read_text(rdir, skip)
    tag = "phase %d (%s)" % (p["n"], p["title"])

    if p.get("conditional"):
        must_run = cond_holds(rdir, p["run_when"]) if "run_when" in p else None
        if text is not None and skip_text is not None:
            return ["%s: both %s and %s exist — keep one" % (tag, art, skip)]
        if skip_text is not None:
            if not skip_text.strip():
                return ["%s: %s is empty — write the one-line reason the phase does not apply" % (tag, skip)]
            if must_run:
                return ["%s: skipped, but it must run because %s" % (tag, describe(p["run_when"]))]
            return []
        if text is None:
            return ["%s: no %s and no %s — a conditional phase still leaves a file" % (tag, art, skip)]
        if must_run is False:
            return ["%s: %s exists, but the phase applies only when %s — write %s instead"
                    % (tag, art, describe(p["run_when"]), skip)]
    elif text is None:
        return ["%s: %s does not exist yet" % (tag, art)]

    if not text.strip():
        return ["%s: %s is empty" % (tag, art)]

    out = []
    for c in p.get("checks", []):
        msg = c.get("message")
        t = c["type"]
        if t == "sections":
            min_chars = c.get("min_chars", 20)
            for h in c["headings"]:
                body = section_body(text, h)
                if body is None:
                    out.append("%s: %s has no '%s' section" % (tag, art, h))
                    continue
                # Emptiness ignores sub-headings; length still counts them, since configs set
                # min_chars on sections whose sub-headings carry ids (### PRRT_… — path).
                if PLACEHOLDER_RE.match(section_content(body)) or len(re.sub(r"\s", "", body)) < min_chars:
                    out.append("%s: '%s' in %s is a stub (under %d characters)" % (tag, h, art, min_chars))
        elif t == "field":
            value = field_value(text, c["name"])
            # A value the enum lists was chosen on purpose, so it passes even when it reads
            # like a stub marker ("n/a", "-"); the placeholder test is for free-form values.
            listed = "enum" in c and value in c["enum"]
            if not listed and (value is None or PLACEHOLDER_RE.match(value)):
                out.append(msg or "%s: %s has no '%s:' line" % (tag, art, c["name"]))
            elif "enum" in c and not listed:
                out.append(msg or "%s: %s: %r is not one of %s" % (tag, c["name"], value, ", ".join(c["enum"])))
        elif t == "regex":
            if not re.search(c["pattern"], text, re.MULTILINE):
                out.append("%s: %s" % (tag, msg or "%s does not match %s" % (art, c["pattern"])))
        elif t == "absent":
            m = re.search(c["pattern"], text, re.MULTILINE)
            if m:
                out.append("%s: %s" % (tag, msg or "%s contains %r" % (art, m.group(0))))
        elif t == "implies":
            if cond_holds(rdir, c["if"]) and not cond_holds(rdir, c["then"]):
                out.append("%s: %s" % (tag, msg or "%s, so %s" % (describe(c["if"]), describe(c["then"]))))
        elif t == "custom":
            # Values go in shell-quoted, so a path with a space stays one argument.
            q = shlex.quote
            cmd = c["command"].format(run_dir=q(rdir), id=q(run_id), skill_dir=q(os.path.dirname(HERE)),
                                      scripts_dir=q(HERE), artifact=q(os.path.join(rdir, art)))
            try:
                res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=CUSTOM_TIMEOUT)
            except subprocess.TimeoutExpired:
                out.append("%s: custom check did not finish within %d s: %s" % (tag, CUSTOM_TIMEOUT, cmd))
                continue
            if res.returncode != 0:
                lines = [l for l in (res.stdout + res.stderr).splitlines() if l.strip()]
                out += ["%s: %s" % (tag, l) for l in lines] or ["%s: %s" % (tag, msg or "custom check failed: " + cmd)]
    return out


# ---------------------------------------------------------------- commands

def need_phase(cfg, arg):
    try:
        n = int(arg)
    except (TypeError, ValueError):
        die("phase number expected, got %r" % arg)
    if not 0 <= n < len(cfg["phases"]):
        die("phase %d does not exist — this flow has phases 0..%d" % (n, len(cfg["phases"]) - 1))
    return n


def need_state(rdir, run_id):
    state = read_state(rdir)
    if state is None:
        die("no run %s yet — start it with: %s init %s" % (run_id, SELF, run_id))
    return state


def next_phase(cfg, state):
    closed = state.get("closed", [])
    n = len(closed)
    return cfg["phases"][n] if n < len(cfg["phases"]) else None


def run_checks(cfg, rdir, run_id, upto):
    fails = []
    for p in cfg["phases"][: upto + 1]:
        fails += phase_failures(cfg, rdir, run_id, p)
    return fails


def cmd_init(cfg, run_id):
    rdir = run_dir(cfg, run_id)
    if read_state(rdir):
        die("run %s already exists in %s — resume it with: %s status %s"
            % (run_id, rdir, SELF, run_id))
    os.makedirs(rdir, exist_ok=True)
    write_state(rdir, {"flow": cfg["flow"], "id": run_id, "closed": [], "abandoned": False})
    first = cfg["phases"][0]
    print("run %s started in %s\nnext: phase 0 (%s) → %s" % (run_id, rdir, first["title"], first["artifact"]))


def cmd_check(cfg, run_id, arg, close):
    n = need_phase(cfg, arg)
    rdir = run_dir(cfg, run_id)
    state = need_state(rdir, run_id)
    closed = state.get("closed", [])
    if close and n > len(closed):
        missing = cfg["phases"][len(closed)]
        print("phase %d is not open: phase %d (%s) has not been closed yet"
              % (n, missing["n"], missing["title"]))
        return 1
    fails = run_checks(cfg, rdir, run_id, n)
    if fails:
        print("phase %d is %s:" % (n, "not closed" if close else "red"))
        for f in fails:
            print("  - " + f)
        print("fix the artifact and run the same command again.")
        return 1
    if not close:
        print("phase %d is green (not closed — use done to close it)" % n)
        return 0
    reopened = [i for i in closed if i > n]
    state["closed"] = list(range(n + 1))
    state["abandoned"] = False
    write_state(rdir, state)
    msg = "phase %d closed." % n
    if reopened:
        msg += " Reopened phases %s — close them again in order." % ", ".join(map(str, reopened))
    nxt = next_phase(cfg, state)
    msg += " next: phase %d (%s) → %s" % (nxt["n"], nxt["title"], nxt["artifact"]) if nxt else " The flow is complete."
    print(msg)
    return 0


def cmd_status(cfg, run_id):
    rdir = run_dir(cfg, run_id)
    state = need_state(rdir, run_id)
    closed = state.get("closed", [])
    print("run %s — %s" % (run_id, rdir))
    print("skill dir: %s" % os.path.dirname(HERE))
    for p in cfg["phases"]:
        mark = "x" if p["n"] in closed else " "
        print("  [%s] %d  %-28s → %s" % (mark, p["n"], p["title"], p["artifact"]))
    nxt = next_phase(cfg, state)
    if state.get("abandoned"):
        print("abandoned.")
    print("next: phase %d (%s) → %s" % (nxt["n"], nxt["title"], nxt["artifact"]) if nxt else "complete.")
    return 0


def cmd_abandon(cfg, run_id):
    rdir = run_dir(cfg, run_id)
    state = need_state(rdir, run_id)
    state["abandoned"] = True
    write_state(rdir, state)
    print("run %s marked abandoned" % run_id)
    return 0


def main(argv):
    # Windows consoles default to a legacy code page that cannot encode the arrows and glyphs below.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 0 if len(argv) >= 2 else 2
    try:
        cfg = load_config()
    except ConfigError as e:
        die(str(e))
    cmd = argv[1]
    if cmd == "lint":
        problems = lint_config(cfg)
        for pr in problems:
            print("  - " + pr)
        print("phases.json is %s" % ("invalid" if problems else "valid"))
        return 1 if problems else 0
    problems = lint_config(cfg)
    if problems:
        die("phases.json is invalid — run: %s lint" % SELF)
    if len(argv) < 3:
        die("usage: %s %s <ID>%s" % (SELF, cmd, " <N>" if cmd in ("check", "done") else ""))
    run_id = argv[2]
    if cmd == "init":
        cmd_init(cfg, run_id)
        return 0
    if cmd in ("check", "done"):
        if len(argv) < 4:
            die("usage: %s %s <ID> <N>" % (SELF, cmd))
        return cmd_check(cfg, run_id, argv[3], close=(cmd == "done"))
    if cmd == "status":
        return cmd_status(cfg, run_id)
    if cmd == "dir":
        print(run_dir(cfg, run_id))
        return 0
    if cmd == "abandon":
        return cmd_abandon(cfg, run_id)
    die("unknown command %r — see %s --help" % (cmd, SELF))


if __name__ == "__main__":
    sys.exit(main(sys.argv))

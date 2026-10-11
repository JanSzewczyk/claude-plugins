#!/usr/bin/env python3
"""Structural audit of one or more skills.

    audit.py <skill-dir> [<skill-dir> ...] [--json]

Checks what a script can check: the frontmatter contract, size, links that resolve,
files nothing points at, phase files and their gate, portability, and a few prose
smells. It cannot judge whether the tier fits or the phases are cut well — that is
the rubric's job. Exit code 1 when any skill has a blocker or major finding.
"""
import json
import os
import re
import subprocess
import sys
from urllib.parse import unquote

SEVERITIES = ["blocker", "major", "minor", "info"]
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s#]+)(?:#[^)]*)?\)")
TICK_PATH_RE = re.compile(r"`((?:scripts|references|phases|assets|tests|evals)/[\w./-]+)`")
TICK_SKILL_RE = re.compile(r"`(/[a-z][a-z0-9-]+(?::[a-z0-9-]+)?)`")
CAPS_RE = re.compile(r"\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT|MANDATORY|REQUIRED)\b")
ABS_RE = re.compile(r"(/Users/[\w.-]+|/home/[\w.-]+|~/\.claude|\$HOME/\.claude)")
HOME_RE = re.compile(r"(/Users/[\w.-]+|/home/[\w.-]+)")
OUTWARD_RE = re.compile(r"(git push|gh pr (create|merge|review)|gh api [^`\n]*-X ?(POST|PUT|PATCH|DELETE)|"
                        r"curl [^`\n]*-X ?(POST|PUT|PATCH|DELETE)|create\w*Issue|editJiraIssue|"
                        r"transitionJiraIssue|addComment\w*|send_message|slack_send|create_draft|"
                        r"updateConfluencePage|createConfluencePage)")
STEP_WORDS_RE =re.compile(r"(\bthen\b|→|->|\bfinally\b|\bafter that\b|\bnext\b)", re.IGNORECASE)
TEXT_EXT = (".md", ".py", ".sh", ".json", ".js", ".ts", ".txt", ".yaml", ".yml")


BUILTIN_COMMANDS = {"workflows", "workflow-authoring", "deep-research", "config", "effort", "model", "compact",
                    "clear", "help", "agents", "hooks", "mcp", "permissions", "resume", "reload-skills", "add-dir",
                    "init", "memory", "review", "status", "cost", "plugin", "skills", "loop", "schedule"}
# `/tmp` in backticks is a path, not a slash command.
SYSTEM_DIRS = {"tmp", "private", "var", "etc", "usr", "opt", "bin", "sbin", "dev", "home", "users", "root",
               "proc", "mnt", "srv", "lib", "sys", "volumes", "applications", "library"}


def prose_lines(text):
    """(line number, line) for lines outside fenced code blocks — templates there are not live links."""
    fence = None
    for i, line in enumerate(text.splitlines(), 1):
        s = line.lstrip()
        if fence is None and (s.startswith("```") or s.startswith("~~~")):
            fence = s[:3]
            continue
        if fence is not None:
            if s.startswith(fence):
                fence = None
            continue
        yield i, line


def parse_frontmatter(text):
    """Minimal YAML subset: top-level scalars, quoted strings, and >- / | blocks."""
    if not text.startswith("---"):
        return None, 0
    lines = text.splitlines()
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return None, 0
    fm, key = {}, None
    for line in lines[1:end]:
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if m and not line.startswith(" "):
            key, val = m.group(1), m.group(2).strip()
            if val in (">", ">-", "|", "|-", ">+", "|+", ""):
                fm[key] = ""
            else:
                if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                    val = val[1:-1]
                fm[key] = val
        elif key and line.startswith(" "):
            fm[key] = (fm[key] + " " + line.strip()).strip()
    return fm, end + 1


class Audit:
    def __init__(self, skill_dir):
        self.dir = os.path.abspath(skill_dir.rstrip("/"))
        self.name = os.path.basename(self.dir)
        self.findings = []

    def add(self, sev, where, msg):
        self.findings.append({"severity": sev, "where": where, "message": msg})

    def rel(self, path):
        return os.path.relpath(path, self.dir).replace(os.sep, "/")

    def files(self):
        out = []
        for root, dirs, names in os.walk(self.dir):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("__pycache__", "node_modules")]
            for n in names:
                if not n.startswith("."):
                    out.append(os.path.join(root, n))
        return sorted(out)

    def run(self):
        if not os.path.isdir(self.dir):
            self.add("blocker", self.dir, "no such directory — check the path")
            return self
        skill_md = os.path.join(self.dir, "SKILL.md")
        if not os.path.isfile(skill_md):
            self.add("blocker", "SKILL.md", "no SKILL.md — this is not a skill")
            return self
        try:
            with open(skill_md, encoding="utf-8") as f:
                text = f.read()
        except UnicodeDecodeError as e:
            self.add("blocker", "SKILL.md", "not UTF-8 (%s) — the loader reads skills as UTF-8" % e.reason)
            return self
        self.check_frontmatter(text)
        all_files = self.files()
        md_texts = {}
        for p in all_files:
            if p.endswith(TEXT_EXT):
                try:
                    with open(p, encoding="utf-8") as f:
                        md_texts[p] = f.read()
                except UnicodeDecodeError:
                    pass
        self.check_size(text)
        self.check_links(md_texts)
        self.check_orphans(all_files, md_texts)
        self.check_phases(text, md_texts)
        self.check_prose(text, md_texts)
        self.check_portability(md_texts)
        self.check_hygiene(text, all_files, md_texts)
        return self

    # ------------------------------------------------------------ checks

    def check_frontmatter(self, text):
        fm, _ = parse_frontmatter(text)
        if fm is None:
            self.add("blocker", "SKILL.md:1", "no YAML frontmatter between --- lines")
            return
        name, desc = fm.get("name", ""), fm.get("description", "")
        if not name:
            self.add("major", "SKILL.md:1", "frontmatter has no name")
        else:
            if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name) or len(name) > 64:
                self.add("major", "SKILL.md:1", "name %r should be lowercase kebab-case, 64 characters at most" % name)
            if name != self.name:
                self.add("minor", "SKILL.md:1", "name %r differs from the directory name %r" % (name, self.name))
        if not desc:
            self.add("blocker", "SKILL.md:1", "frontmatter has no description — nothing tells the model when to use it")
            return
        total = len(desc) + len(fm.get("when_to_use", ""))
        if total > 1536:
            self.add("blocker", "SKILL.md:1", "description is %d characters; the listing cuts it at 1,536" % total)
        elif total > 1024:
            self.add("minor", "SKILL.md:1", "description is %d characters; the open standard caps it at 1,024" % total)
        if not re.search(r"\buse (this |it )?(when|whenever|for)\b|\buse this skill\b", desc, re.IGNORECASE):
            self.add("minor", "SKILL.md:1", "description has no 'Use when…' clause — say when to reach for it")
        if len(STEP_WORDS_RE.findall(desc)) >= 3:
            self.add("minor", "SKILL.md:1", "description narrates the steps; the model may follow the summary "
                     "instead of reading the body — say when to use it, not how it runs")

    def check_size(self, text):
        n = text.count("\n") + 1
        if n > 500:
            self.add("major", "SKILL.md", "%d lines — keep SKILL.md under 500 and move detail to reference files" % n)
        words = len(text.split())
        if words * 1.3 > 5000:
            self.add("minor", "SKILL.md", "about %d tokens; after compaction only the first 5,000 come back — keep "
                     "the execution contract near the top" % int(words * 1.3))

    def check_links(self, md_texts):
        for path, text in md_texts.items():
            if not path.endswith(".md"):
                continue
            base = os.path.dirname(path)
            for i, line in prose_lines(text):
                for target in LINK_RE.findall(line):
                    if re.match(r"^[a-z]+:", target):
                        continue
                    if not os.path.exists(os.path.normpath(os.path.join(base, unquote(target)))):
                        self.add("major", "%s:%d" % (self.rel(path), i), "broken link → %s" % target)
                for target in TICK_PATH_RE.findall(line):
                    if "<" in target or "*" in target:
                        continue
                    if not any(os.path.exists(os.path.join(d, target)) for d in (self.dir, base)):
                        self.add("minor", "%s:%d" % (self.rel(path), i), "names `%s`, which does not exist" % target)

    def check_orphans(self, all_files, md_texts):
        for p in all_files:
            rel = self.rel(p)
            if rel == "SKILL.md" or "/" not in rel or rel.startswith(("tests/", "evals/")):
                continue
            if os.path.basename(p) in ("__init__.py",):
                continue
            others = "\n".join(t for q, t in md_texts.items() if q != p)
            if rel not in others and os.path.basename(p) not in others:
                self.add("minor", rel, "nothing in the skill mentions this file — link it or drop it")

    def check_phases(self, text, md_texts):
        pdir = os.path.join(self.dir, "phases")
        phase_files = []
        if os.path.isdir(pdir):
            phase_files = self.check_phase_files(pdir, text, md_texts)
        gate_json = os.path.join(self.dir, "scripts", "phases.json")
        engine = next((os.path.join(self.dir, "scripts", n) for n in ("phase.py", "phase.sh")
                       if os.path.exists(os.path.join(self.dir, "scripts", n))), None)
        if not os.path.exists(gate_json):
            if phase_files:
                self.add("info", "phases/", "phase files but no scripts/phases.json — fine for a phase-file guide, "
                         "not for a gated pipeline")
            return
        try:
            with open(gate_json, encoding="utf-8") as f:
                cfg = json.load(f)
        except ValueError as e:
            self.add("major", "scripts/phases.json", "not valid JSON: %s" % e)
            return
        if not isinstance(cfg, dict):
            self.add("major", "scripts/phases.json", "must be an object with 'flow' and 'phases', not a %s"
                     % type(cfg).__name__)
            return
        phases = cfg.get("phases")
        count = len(phases) if isinstance(phases, list) else 0
        if os.path.isdir(pdir) and count != len(phase_files):
            self.add("major", "scripts/phases.json", "%d phases in phases.json, %d phase files" % (count, len(phase_files)))
        if not engine:
            self.add("major", "scripts/phases.json", "no gate engine beside it — copy phase.py verbatim into "
                     "scripts/, or the phases are never checked")
            return
        if engine.endswith(".py"):
            res = subprocess.run([sys.executable, engine, "lint"], capture_output=True, text=True,
                                 env=dict(os.environ, FLOW_PHASES=gate_json))
            if res.returncode != 0:
                detail = [l.strip(" -") for l in res.stdout.splitlines() if l.strip().startswith("-")]
                self.add("major", "scripts/phases.json", "gate lint failed: " +
                         "; ".join(detail or [l.strip() for l in res.stderr.splitlines() if l.strip()][-1:]))
        if os.path.basename(engine) not in text:
            self.add("major", "SKILL.md", "the gate script is never named in SKILL.md — the run won't call it")

    def check_phase_files(self, pdir, text, md_texts):
        phase_files = sorted(f for f in os.listdir(pdir) if f.endswith(".md"))
        nums = []
        for f in phase_files:
            m = re.match(r"^(\d+)", f)
            if not m:
                self.add("minor", "phases/" + f, "phase file without a leading number — order is not visible")
                continue
            nums.append(int(m.group(1)))
            if "phases/" + f not in text:
                self.add("major", "phases/" + f, "not linked from SKILL.md — the run has no way to reach it")
        if nums and sorted(nums) != list(range(min(nums), min(nums) + len(nums))):
            self.add("major", "phases/", "phase numbers are not contiguous: %s" % sorted(nums))
        for f in phase_files:
            path = os.path.join(pdir, f)
            for i, line in enumerate(md_texts.get(path, "").splitlines(), 1):
                for target in LINK_RE.findall(line):
                    if re.match(r"^\d+[\w-]*\.md$", os.path.basename(target)) and os.path.basename(target) != f:
                        self.add("minor", "phases/%s:%d" % (f, i), "links another phase file (%s); link phases "
                                 "from SKILL.md only — nested references get read partially" % target)
        return phase_files

    def check_prose(self, text, md_texts):
        instr = {p: t for p, t in md_texts.items()
                 if p.endswith(".md") and (self.rel(p) == "SKILL.md" or self.rel(p).startswith("phases/"))}
        caps = sum(len(CAPS_RE.findall(t)) for t in instr.values())
        if caps > 5:
            self.add("minor", "SKILL.md", "%d all-caps MUST/NEVER/ALWAYS-style words across SKILL.md and phase "
                     "files — a yellow flag; give the reason instead" % caps)

    def check_portability(self, md_texts):
        for path, t in md_texts.items():
            # scripts may resolve ~ at run time; only a hardcoded home directory is unportable there
            pattern = ABS_RE if path.endswith(".md") else HOME_RE
            for i, line in enumerate(t.splitlines(), 1):
                m = pattern.search(line)
                if m:
                    self.add("minor", "%s:%d" % (self.rel(path), i),
                             "environment path %s — use ${CLAUDE_SKILL_DIR} or a relative path" % m.group(1))
                    break

    def check_hygiene(self, text, all_files, md_texts):
        fm, _ = parse_frontmatter(text)
        fm = fm or {}
        has_scripts = any(self.rel(p).startswith("scripts/") for p in all_files)
        if has_scripts and "allowed-tools" not in fm:
            self.add("info", "SKILL.md:1", "ships scripts but has no allowed-tools — expect permission prompts")
        if not any(self.rel(p).startswith(("tests/", "evals/")) or "/tests/" in self.rel(p) for p in all_files):
            self.add("info", self.name, "no tests/ or evals/ — nothing shows the skill was tried")
        seen, refs = set(), {}
        for path, t in md_texts.items():
            if not path.endswith(".md"):
                continue
            for i, line in enumerate(t.splitlines(), 1):
                m = OUTWARD_RE.search(line)
                if m and m.group(0) not in seen:
                    seen.add(m.group(0))
                    self.add("info", "%s:%d" % (self.rel(path), i), "outward write (%s) — check it is confirmed "
                             "or read back, per the rubric" % m.group(0))
            for i, line in prose_lines(t):
                for ref in TICK_SKILL_RE.findall(line):
                    refs.setdefault(ref, []).append("%s:%d" % (self.rel(path), i))
        for ref, where in sorted(refs.items()):
            name = ref.lstrip("/")
            if name.lower() in SYSTEM_DIRS:
                continue
            if name != self.name and name not in BUILTIN_COMMANDS and not self.skill_exists(name):
                more = " (and %d more places)" % (len(where) - 1) if len(where) > 1 else ""
                self.add("minor", where[0], "refers to %s%s, which is not installed where this machine can see "
                         "it — verify it exists before the run depends on it" % (ref, more))

    def skill_exists(self, name):
        """Look for a skill or command called `name` wherever Claude Code would load one from."""
        if ":" in name:
            return True
        home = os.path.expanduser("~/.claude")
        roots = [os.path.dirname(self.dir), os.path.join(home, "skills")]
        d = os.getcwd()
        while True:
            roots.append(os.path.join(d, ".claude", "skills"))
            if os.path.dirname(d) == d:
                break
            d = os.path.dirname(d)
        if any(os.path.isdir(os.path.join(r, name)) for r in roots):
            return True
        commands = [os.path.join(home, "commands", name + ".md"),
                    os.path.join(os.getcwd(), ".claude", "commands", name + ".md")]
        if any(os.path.isfile(c) for c in commands):
            return True
        plugins = os.path.join(home, "plugins")
        for root, dirs, names in os.walk(plugins):
            if os.path.basename(root) in ("skills", "commands", "workflows") and (
                    name in dirs or name + ".md" in names or name + ".js" in names):
                return True
            if root.count(os.sep) - plugins.count(os.sep) > 6:
                dirs[:] = []
        return False


def main(argv):
    # Windows consoles default to a legacy code page that cannot encode the arrows and glyphs below.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    as_json = "--json" in argv
    dirs = [a for a in argv[1:] if a != "--json"]
    if not dirs:
        print(__doc__)
        return 2
    results = [Audit(d).run() for d in dirs]
    if as_json:
        # Keyed by folder name; two audited skills sharing one fall back to their full paths.
        names = [a.name for a in results]
        print(json.dumps({(a.name if names.count(a.name) == 1 else a.dir): a.findings for a in results},
                         indent=2))
    else:
        for a in results:
            counts = {s: sum(1 for f in a.findings if f["severity"] == s) for s in SEVERITIES}
            print("%s — %s" % (a.name, ", ".join("%d %s" % (counts[s], s) for s in SEVERITIES)))
            for s in SEVERITIES:
                for f in a.findings:
                    if f["severity"] == s:
                        print("  %-7s %-32s %s" % (s.upper(), f["where"], f["message"]))
            print()
    bad = any(f["severity"] in ("blocker", "major") for a in results for f in a.findings)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

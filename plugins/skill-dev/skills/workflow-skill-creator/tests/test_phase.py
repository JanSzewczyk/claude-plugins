"""Offline tests for assets/gate/phase.py and stop_gate.py.

    python3 tests/test_phase.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GATE = os.path.join(ROOT, "assets", "gate")
ENGINE = os.path.join(GATE, "phase.py")
HOOK = os.path.join(GATE, "stop_gate.py")
EXAMPLE = os.path.join(GATE, "phases.example.json")

GOOD = {
    "00-preflight.md": "Tools: ok\n\n## Target\nIssue ABC-1, picked from the newest unresolved.\n",
    "01-reading.md": "## What happened\nThe export button throws on an empty report with no rows at all.\n\n"
                     "## What the input does not say\nWhich tenant, and whether it reproduces after reload.\n",
    "02-evidence.md": "Level: verified\nWhere: src/report/export.ts:41\n\n## Where\n"
                      "src/report/export.ts:41 reads rows[0] without a length check.\n\n"
                      "## Not verified\nOther call sites of the same helper.\n",
    "03-signal.skipped": "phase 2 located the cause, so the signal is good enough\n",
    "04-verdict.md": "Ticket: yes\nDo-next: guard the empty case in the export helper\n",
}


class GateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.env = dict(os.environ, FLOW_PHASES=EXAMPLE, FLOW_RUN_ROOT=os.path.join(self.tmp, "runs"))
        self.rdir = os.path.join(self.tmp, "runs", "ABC-1")

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def run_engine(self, *args, env=None):
        res = subprocess.run([sys.executable, ENGINE] + list(args), env=env or self.env,
                             capture_output=True, text=True)
        return res.returncode, res.stdout + res.stderr

    def write(self, name, text):
        with open(os.path.join(self.rdir, name), "w") as f:
            f.write(text)

    def close_all(self, upto):
        for n in range(upto + 1):
            code, out = self.run_engine("done", "ABC-1", str(n))
            self.assertEqual(code, 0, out)

    def start(self, files=GOOD, env=None):
        self.assertEqual(self.run_engine("init", "ABC-1", env=env)[0], 0)
        for name, text in files.items():
            self.write(name, text)

    def env_with(self, cfg=None, raw=None, **extra):
        path = os.path.join(self.tmp, "cfg-%d.json" % len(os.listdir(self.tmp)))
        with open(path, "w") as f:
            f.write(raw if raw is not None else json.dumps(cfg))
        return dict(self.env, FLOW_PHASES=path, **extra)

    def example_with_check(self, n, check):
        with open(EXAMPLE) as f:
            cfg = json.load(f)
        cfg["phases"][n]["checks"].append(check)
        return cfg

    # -- config

    def test_example_config_lints_clean(self):
        code, out = self.run_engine("lint")
        self.assertEqual(code, 0, out)

    def test_lint_catches_numbering_and_unknown_check(self):
        bad = {"flow": "x", "phases": [{"n": 1, "title": "A", "artifact": "a.md",
                                        "checks": [{"type": "nope"}]}]}
        path = os.path.join(self.tmp, "bad.json")
        with open(path, "w") as f:
            json.dump(bad, f)
        code, out = self.run_engine("lint", env=dict(self.env, FLOW_PHASES=path))
        self.assertEqual(code, 1)
        self.assertIn("'n' must be 0", out)
        self.assertIn("unknown type", out)

    def test_lint_reports_wrong_shapes_instead_of_crashing(self):
        phase = {"n": 0, "title": "A", "artifact": "00-a.md"}
        cases = {
            "top-level list": ("[]", "must be an object"),
            "phase as a string": (json.dumps({"flow": "x", "phases": ["A"]}), "phase 0: must be an object"),
            "checks as an object": (json.dumps({"flow": "x", "phases": [dict(phase, checks={"type": "field"})]}),
                                    "'checks' must be a list"),
            "check as a string": (json.dumps({"flow": "x", "phases": [dict(phase, checks=["field"])]}),
                                  "check 0: must be an object"),
            "headings as a string": (json.dumps({"flow": "x", "phases": [dict(phase, checks=[
                {"type": "sections", "headings": "## Target"}])]}), "'headings' list of strings"),
            "enum as a string": (json.dumps({"flow": "x", "phases": [dict(phase, checks=[
                {"type": "field", "name": "Tools", "enum": "ok"}])]}), "'enum' must be a list"),
            "in as a string": (json.dumps({"flow": "x", "phases": [phase, {
                "n": 1, "title": "B", "artifact": "01-b.md", "conditional": True,
                "run_when": {"artifact": "00-a.md", "field": "Level", "in": "unlocated"}}]}), "'in' must be a list"),
            "artifact '..'": (json.dumps({"flow": "x", "phases": [dict(phase, artifact="..")]}), "bare file name"),
        }
        for label, (raw, expected) in cases.items():
            code, out = self.run_engine("lint", env=self.env_with(raw=raw))
            self.assertNotIn("Traceback", out, label)
            self.assertIn(code, (1, 2), label)
            self.assertIn(expected, out, label)

    def test_invalid_config_blocks_every_command(self):
        path = os.path.join(self.tmp, "bad.json")
        with open(path, "w") as f:
            json.dump({"flow": "x", "phases": []}, f)
        code, out = self.run_engine("init", "ABC-1", env=dict(self.env, FLOW_PHASES=path))
        self.assertEqual(code, 2)
        self.assertIn("invalid", out)

    # -- ordering

    def test_full_green_run(self):
        self.start()
        self.close_all(4)
        code, out = self.run_engine("status", "ABC-1")
        self.assertIn("complete.", out)

    def test_cannot_close_a_phase_out_of_order(self):
        self.start()
        code, out = self.run_engine("done", "ABC-1", "2")
        self.assertEqual(code, 1)
        self.assertIn("phase 0 (Preflight) has not been closed", out)

    def test_missing_artifact_is_red(self):
        self.start({"00-preflight.md": GOOD["00-preflight.md"]})
        self.close_all(0)
        code, out = self.run_engine("done", "ABC-1", "1")
        self.assertEqual(code, 1)
        self.assertIn("01-reading.md does not exist", out)

    def test_reclosing_an_earlier_phase_reopens_later_ones(self):
        self.start()
        self.close_all(3)
        code, out = self.run_engine("done", "ABC-1", "1")
        self.assertEqual(code, 0, out)
        self.assertIn("Reopened phases 2, 3", out)
        code, out = self.run_engine("done", "ABC-1", "3")
        self.assertEqual(code, 1)

    def test_editing_an_earlier_artifact_breaks_later_checks(self):
        self.start()
        self.close_all(2)
        self.write("01-reading.md", "## What happened\nTODO\n")
        code, out = self.run_engine("check", "ABC-1", "2")
        self.assertEqual(code, 1)
        self.assertIn("stub", out)

    # -- checks

    def test_stub_section_and_bad_enum(self):
        files = dict(GOOD)
        files["02-evidence.md"] = "Level: maybe\nWhere: src/a.ts:1\n\n## Where\n<fill in>\n\n## Not verified\nnothing else\n"
        self.start(files)
        self.close_all(1)
        code, out = self.run_engine("done", "ABC-1", "2")
        self.assertEqual(code, 1)
        self.assertIn("'maybe' is not one of", out)
        self.assertIn("'## Where' in 02-evidence.md is a stub", out)
        self.assertIn("'## Not verified' in 02-evidence.md is a stub", out)

    def test_empty_field_does_not_take_the_next_line(self):
        files = dict(GOOD)
        files["04-verdict.md"] = "Ticket: no\nDo-next:\n\n## Notes\nsomething long enough\n"
        self.start(files)
        self.close_all(3)
        code, out = self.run_engine("done", "ABC-1", "4")
        self.assertEqual(code, 1)
        self.assertIn("has no 'Do-next:' line", out)

    def test_enum_value_that_reads_like_a_placeholder_is_accepted(self):
        cfg = self.example_with_check(4, {"type": "field", "name": "Live", "enum": ["run", "n/a"]})
        env = self.env_with(cfg)
        files = dict(GOOD)
        files["04-verdict.md"] = GOOD["04-verdict.md"] + "Live: n/a\n"
        self.start(files, env=env)
        for n in range(5):
            code, out = self.run_engine("done", "ABC-1", str(n), env=env)
            self.assertEqual(code, 0, out)

    def test_placeholder_in_a_field_without_enum_is_still_missing(self):
        files = dict(GOOD)
        files["04-verdict.md"] = "Ticket: no\nDo-next: n/a\n"
        self.start(files)
        self.close_all(3)
        code, out = self.run_engine("done", "ABC-1", "4")
        self.assertEqual(code, 1)
        self.assertIn("has no 'Do-next:' line", out)

    def test_value_on_the_next_line_is_not_read(self):
        files = dict(GOOD)
        files["02-evidence.md"] = GOOD["02-evidence.md"].replace("Level: verified", "Level:\nverified")
        self.start(files)
        self.close_all(1)
        code, out = self.run_engine("done", "ABC-1", "2")
        self.assertEqual(code, 1)
        self.assertIn("has no 'Level:' line", out)

    def test_bold_field_name_still_reads(self):
        files = dict(GOOD)
        files["02-evidence.md"] = GOOD["02-evidence.md"].replace("Level: verified", "**Level:** verified")
        self.start(files)
        self.close_all(2)

    def test_hash_line_in_a_code_block_does_not_end_the_section(self):
        files = dict(GOOD)
        files["00-preflight.md"] = ("Tools: ok\n\n## Target\n```bash\n# pick the newest\ngh issue list\n```\n"
                                    "Issue ABC-1, picked from the newest unresolved.\n")
        self.start(files)
        self.close_all(0)

    def test_section_holding_only_a_subheading_is_a_stub(self):
        files = dict(GOOD)
        files["00-preflight.md"] = "Tools: ok\n\n## Target\n### A sub-heading long enough to pass the count\n"
        self.start(files)
        code, out = self.run_engine("done", "ABC-1", "0")
        self.assertEqual(code, 1)
        self.assertIn("'## Target' in 00-preflight.md is a stub", out)

    def test_regex_check(self):
        files = dict(GOOD)
        files["02-evidence.md"] = GOOD["02-evidence.md"].replace("Where: src/report/export.ts:41", "Where: somewhere in export")
        self.start(files)
        self.close_all(1)
        code, out = self.run_engine("done", "ABC-1", "2")
        self.assertIn("'Where: <path>:<line>'", out)

    def test_conditional_phase_needs_a_file(self):
        files = dict(GOOD)
        del files["03-signal.skipped"]
        self.start(files)
        self.close_all(2)
        code, out = self.run_engine("done", "ABC-1", "3")
        self.assertEqual(code, 1)
        self.assertIn("a conditional phase still leaves a file", out)

    def test_conditional_phase_cannot_be_skipped_when_it_applies(self):
        files = dict(GOOD)
        files["02-evidence.md"] = GOOD["02-evidence.md"].replace("Level: verified", "Level: unlocated")
        self.start(files)
        self.close_all(2)
        code, out = self.run_engine("done", "ABC-1", "3")
        self.assertEqual(code, 1)
        self.assertIn("must run because", out)

    def test_conditional_phase_cannot_run_when_it_does_not_apply(self):
        files = dict(GOOD)
        del files["03-signal.skipped"]
        files["03-signal.md"] = "## Proposal\nAdd the tenant tag to every captured event from export.\n"
        self.start(files)
        self.close_all(2)
        code, out = self.run_engine("done", "ABC-1", "3")
        self.assertEqual(code, 1)
        self.assertIn("applies only when", out)

    def test_empty_skipped_file_is_red(self):
        files = dict(GOOD)
        files["03-signal.skipped"] = "  \n"
        self.start(files)
        self.close_all(2)
        code, out = self.run_engine("done", "ABC-1", "3")
        self.assertIn("is empty", out)

    def test_implies_cross_artifact(self):
        files = dict(GOOD)
        files["02-evidence.md"] = GOOD["02-evidence.md"].replace("Level: verified", "Level: located")
        self.start(files)
        self.close_all(3)
        code, out = self.run_engine("done", "ABC-1", "4")
        self.assertEqual(code, 1)
        self.assertIn("Ticket: yes needs Level: verified", out)

    def test_absent_check(self):
        files = dict(GOOD)
        files["04-verdict.md"] = "Ticket: no\nDo-next: probably nothing\n"
        self.start(files)
        self.close_all(3)
        code, out = self.run_engine("done", "ABC-1", "4")
        self.assertIn("says 'probably'", out)

    def test_custom_check_reports_each_line(self):
        with open(EXAMPLE) as f:
            cfg = json.load(f)
        cfg["phases"][0]["checks"].append(
            {"type": "custom", "command": "printf 'first problem\\nsecond problem\\n'; exit 1"})
        path = os.path.join(self.tmp, "custom.json")
        with open(path, "w") as f:
            json.dump(cfg, f)
        env = dict(self.env, FLOW_PHASES=path)
        self.assertEqual(self.run_engine("init", "ABC-1", env=env)[0], 0)
        self.write("00-preflight.md", GOOD["00-preflight.md"])
        code, out = self.run_engine("done", "ABC-1", "0", env=env)
        self.assertEqual(code, 1)
        self.assertIn("first problem", out)
        self.assertIn("second problem", out)

    def test_custom_placeholders_survive_a_path_with_a_space(self):
        env = self.env_with(self.example_with_check(0, {"type": "custom", "command": "test -f {artifact}"}),
                            FLOW_RUN_ROOT=os.path.join(self.tmp, "runs with space"))
        self.rdir = os.path.join(self.tmp, "runs with space", "ABC-1")
        self.start({"00-preflight.md": GOOD["00-preflight.md"]}, env=env)
        code, out = self.run_engine("done", "ABC-1", "0", env=env)
        self.assertEqual(code, 0, out)

    def test_lint_rejects_a_literal_brace_in_a_custom_command(self):
        env = self.env_with(self.example_with_check(0, {"type": "custom", "command": "awk '{print $1}' {artifact}"}))
        code, out = self.run_engine("lint", env=env)
        self.assertEqual(code, 1)
        self.assertIn("write literal braces as {{ and }}", out)

    # -- run directory

    def test_corrupt_state_gives_a_message(self):
        self.start()
        self.write("state.json", "{not json")
        code, out = self.run_engine("status", "ABC-1")
        self.assertEqual(code, 2)
        self.assertNotIn("Traceback", out)
        self.assertIn("state.json is not valid JSON", out)

    def test_init_twice_refuses(self):
        self.start()
        code, out = self.run_engine("init", "ABC-1")
        self.assertEqual(code, 2)
        self.assertIn("already exists", out)

    def test_bad_run_id(self):
        code, out = self.run_engine("init", "../escape")
        self.assertEqual(code, 2)

    def test_no_scratchpad_says_how_to_fix(self):
        env = {k: v for k, v in self.env.items()
               if k not in ("FLOW_RUN_ROOT", "CLAUDE_CODE_SESSION_ID", "CLAUDE_SESSION_ID")}
        code, out = self.run_engine("init", "ABC-1", env=env)
        self.assertEqual(code, 2)
        self.assertIn("FLOW_RUN_ROOT=", out)

    # -- stop hook

    def run_hook(self, payload):
        res = subprocess.run([sys.executable, HOOK], input=json.dumps(payload), env=self.env,
                             capture_output=True, text=True)
        return res.returncode, res.stderr

    def test_hook_blocks_once_on_an_open_run(self):
        self.start()
        self.close_all(1)
        code, err = self.run_hook({"stop_hook_active": False})
        self.assertEqual(code, 2)
        self.assertIn("open at phase 2", err)
        code, _ = self.run_hook({"stop_hook_active": True})
        self.assertEqual(code, 0)

    def test_hook_ignores_complete_and_abandoned_runs(self):
        self.start()
        self.close_all(4)
        self.assertEqual(self.run_hook({"stop_hook_active": False})[0], 0)
        shutil.rmtree(self.rdir)
        self.start()
        self.run_engine("abandon", "ABC-1")
        self.assertEqual(self.run_hook({"stop_hook_active": False})[0], 0)

    def test_hook_lets_the_turn_end_on_bad_input_or_a_broken_config(self):
        self.start()
        for stdin in ("[]", "", "not json"):
            res = subprocess.run([sys.executable, HOOK], input=stdin, env=self.env, capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, res.stderr)
        res = subprocess.run([sys.executable, HOOK], input="{}", env=self.env_with({"flow": "example-triage"}),
                             capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, res.stderr)

    def test_hook_finds_runs_through_scratchpad_dir(self):
        env = dict(self.env)
        del env["FLOW_RUN_ROOT"]
        pad = os.path.join(self.tmp, "pad")
        env_engine = dict(env, FLOW_RUN_ROOT=os.path.join(pad, "example-triage"))
        self.assertEqual(self.run_engine("init", "ABC-1", env=env_engine)[0], 0)
        res = subprocess.run([sys.executable, HOOK], input=json.dumps({"scratchpad_dir": pad}),
                             env=env, capture_output=True, text=True)
        self.assertEqual(res.returncode, 2, res.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=1)

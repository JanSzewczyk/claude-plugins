"""Offline tests for scripts/audit.py.

    python3 tests/test_audit.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIT = os.path.join(ROOT, "scripts", "audit.py")
ENGINE = os.path.join(ROOT, "assets", "gate", "phase.py")
EXAMPLE = os.path.join(ROOT, "assets", "gate", "phases.example.json")

GOOD_SKILL = """---
name: demo-flow
description: "Triage one item end to end. Use when an item needs a verdict. NOT for bulk work."
allowed-tools: Read, Bash
---

# Demo

Close each phase with `scripts/phase.py`.

| # | Read |
|---|---|
| 0 | [phases/00-a.md](phases/00-a.md) |
| 1 | [phases/01-b.md](phases/01-b.md) |
"""


class AuditTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.skill = os.path.join(self.tmp, "demo-flow")
        os.makedirs(os.path.join(self.skill, "phases"))
        os.makedirs(os.path.join(self.skill, "scripts"))
        os.makedirs(os.path.join(self.skill, "tests"))
        self.write("SKILL.md", GOOD_SKILL)
        self.write("phases/00-a.md", "# Phase 0\nDo a.\n")
        self.write("phases/01-b.md", "# Phase 1\nDo b.\n")
        self.write("tests/run.sh", "true\n")
        shutil.copy(ENGINE, os.path.join(self.skill, "scripts", "phase.py"))
        cfg = {"flow": "demo", "phases": [{"n": 0, "title": "A", "artifact": "00-a.md"},
                                          {"n": 1, "title": "B", "artifact": "01-b.md"}]}
        self.write("scripts/phases.json", json.dumps(cfg))

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def write(self, rel, text):
        with open(os.path.join(self.skill, rel), "w") as f:
            f.write(text)

    def audit(self):
        res = subprocess.run([sys.executable, AUDIT, self.skill, "--json"], capture_output=True, text=True)
        return res.returncode, json.loads(res.stdout)["demo-flow"]

    def messages(self, findings, severity=None):
        return [f["message"] for f in findings if severity is None or f["severity"] == severity]

    def test_clean_skill(self):
        code, findings = self.audit()
        self.assertEqual(code, 0, findings)
        self.assertEqual(self.messages(findings, "major"), [])

    def test_missing_description_is_blocker(self):
        self.write("SKILL.md", GOOD_SKILL.replace('description: "Triage one item end to end. Use when an item needs a verdict. NOT for bulk work."\n', ""))
        code, findings = self.audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("no description" in m for m in self.messages(findings, "blocker")))

    def test_description_that_narrates_steps(self):
        self.write("SKILL.md", GOOD_SKILL.replace(
            "Triage one item end to end.", "Fetches the item, then reads it, then prices it, then files it."))
        _, findings = self.audit()
        self.assertTrue(any("narrates the steps" in m for m in self.messages(findings)))

    def test_unlinked_phase_and_gap(self):
        self.write("phases/03-d.md", "# Phase 3\n")
        _, findings = self.audit()
        majors = self.messages(findings, "major")
        self.assertTrue(any("not linked from SKILL.md" in m for m in majors))
        self.assertTrue(any("not contiguous" in m for m in majors))
        self.assertTrue(any("3 phase files" in m for m in majors))

    def test_broken_link_and_dead_backtick_path(self):
        self.write("SKILL.md", GOOD_SKILL + "\nSee [ref](references/missing.md) and `scripts/nope.sh`.\n")
        _, findings = self.audit()
        self.assertTrue(any("broken link" in m for m in self.messages(findings, "major")))
        self.assertTrue(any("`scripts/nope.sh`" in m for m in self.messages(findings, "minor")))

    def test_phase_to_phase_link(self):
        self.write("phases/00-a.md", "# Phase 0\nThen [next](01-b.md).\n")
        _, findings = self.audit()
        self.assertTrue(any("links another phase file" in m for m in self.messages(findings, "minor")))

    def test_orphan_file(self):
        os.makedirs(os.path.join(self.skill, "references"))
        self.write("references/unused.md", "# nobody links me\n")
        _, findings = self.audit()
        self.assertTrue(any("nothing in the skill mentions" in m for m in self.messages(findings, "minor")))

    def test_invalid_phases_json_fails_lint(self):
        self.write("scripts/phases.json", json.dumps({"flow": "demo", "phases": [
            {"n": 0, "title": "A", "artifact": "00-a.md"}, {"n": 5, "title": "B", "artifact": "01-b.md"}]}))
        _, findings = self.audit()
        self.assertTrue(any("gate lint failed" in m for m in self.messages(findings, "major")))

    def test_caps_and_env_paths(self):
        self.write("SKILL.md", GOOD_SKILL + "\nYou MUST. NEVER. ALWAYS. MUST. NEVER. ALWAYS.\nRead ~/.claude/x.\n")
        _, findings = self.audit()
        minors = self.messages(findings, "minor")
        self.assertTrue(any("all-caps" in m for m in minors))
        self.assertTrue(any("environment path" in m for m in minors))

    def test_missing_skill_reference(self):
        self.write("SKILL.md", GOOD_SKILL + "\nFile it with `/definitely-not-a-skill-xyz`.\n")
        _, findings = self.audit()
        self.assertTrue(any("definitely-not-a-skill-xyz" in m for m in self.messages(findings, "minor")))

    def test_phases_json_without_an_engine_is_major(self):
        os.remove(os.path.join(self.skill, "scripts", "phase.py"))
        code, findings = self.audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("no gate engine" in m for m in self.messages(findings, "major")))

    def test_phases_json_is_checked_without_a_phases_dir(self):
        shutil.rmtree(os.path.join(self.skill, "phases"))
        self.write("SKILL.md", GOOD_SKILL.split("| # |")[0])
        self.write("scripts/phases.json", "{not json")
        code, findings = self.audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("not valid JSON" in m for m in self.messages(findings, "major")))

    def test_phases_json_as_a_list_is_a_finding(self):
        self.write("scripts/phases.json", "[]")
        code, findings = self.audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("must be an object" in m for m in self.messages(findings, "major")))

    def test_missing_directory_says_so(self):
        res = subprocess.run([sys.executable, AUDIT, os.path.join(self.tmp, "nope"), "--json"],
                             capture_output=True, text=True)
        self.assertEqual(res.returncode, 1)
        self.assertIn("no such directory", res.stdout)

    def test_non_utf8_skill_md_is_a_blocker(self):
        with open(os.path.join(self.skill, "SKILL.md"), "ab") as f:
            f.write("caf\xe9\n".encode("latin-1"))
        code, findings = self.audit()
        self.assertEqual(code, 1)
        self.assertTrue(any("not UTF-8" in m for m in self.messages(findings, "blocker")))

    def test_encoded_link_and_system_path_are_not_findings(self):
        os.makedirs(os.path.join(self.skill, "references"))
        self.write("references/my notes.md", "# notes\n")
        self.write("SKILL.md", GOOD_SKILL + "\nSee [notes](references/my%20notes.md). Scratch goes in `/tmp`.\n")
        code, findings = self.audit()
        self.assertEqual(code, 0, findings)
        self.assertFalse(any("/tmp" in m or "broken link" in m for m in self.messages(findings)))

    def test_json_keeps_two_skills_with_one_folder_name(self):
        other = os.path.join(self.tmp, "elsewhere", "demo-flow")
        shutil.copytree(self.skill, other)
        res = subprocess.run([sys.executable, AUDIT, self.skill, other, "--json"], capture_output=True, text=True)
        self.assertEqual(sorted(json.loads(res.stdout)), sorted([self.skill, other]))

    def test_real_example_config_lints(self):
        shutil.copy(EXAMPLE, os.path.join(self.skill, "scripts", "phases.json"))
        _, findings = self.audit()
        self.assertFalse(any("gate lint failed" in m for m in self.messages(findings)))


if __name__ == "__main__":
    unittest.main(verbosity=1)

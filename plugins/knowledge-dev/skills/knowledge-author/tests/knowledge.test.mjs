// Runs the knowledge build against a throwaway copy of tests/fixture/, a frozen slice of notes,
// targets and the hand-written SKILL.md files they fill. The fixture holds inputs only: a test that
// needs generated files builds them in its copy first. Every test can break them without touching the real ones and the
// assertions do not move when the repository's own notes change. The last test checks the
// repository itself.
//
// Usage: node --test plugins/knowledge-dev/skills/knowledge-author/tests/knowledge.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  build,
  check,
  coverage,
  loadConfig,
  loadNotes,
  parseFrontmatter,
  renderNote,
  scaffold,
  selectNotes,
  validateNotes,
} from "../scripts/knowledge.mjs";

const FIXTURE = resolve(import.meta.dirname, "fixture");
const REPO_ROOT = resolve(import.meta.dirname, "../../../../..");
const SCRIPT = resolve(import.meta.dirname, "../scripts/knowledge.mjs");

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "knowledge-"));
  cpSync(join(FIXTURE, "knowledge"), join(root, "knowledge"), { recursive: true });
  cpSync(join(FIXTURE, "plugins/testing"), join(root, "plugins/testing"), { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

const cli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args, "--root", root], { encoding: "utf8" });
const note = (id) => join(root, "knowledge", `${id}.md`);
const skill = (name, file = "SKILL.md") => join(root, "plugins/testing/skills", name, file);
const edit = (file, from, to) => writeFileSync(file, readFileSync(file, "utf8").replace(from, to));
const issues = () => validateNotes(loadNotes(root), loadConfig(root));
const messages = (list) => list.map((i) => i.message).join("\n");
const drift = () => check(root).problems;
const setTarget = (name, patch) => {
  const file = join(root, "knowledge/targets.json");
  const targets = JSON.parse(readFileSync(file, "utf8"));
  Object.assign(targets.targets.find((t) => t.skill.endsWith(`/${name}`)), patch);
  writeFileSync(file, JSON.stringify(targets));
};
const byId = (id) => loadNotes(root).find((n) => n.id === id);

describe("frontmatter dialect", () => {
  test("reads scalars, quoted scalars and inline lists", () => {
    const { data, errors } = parseFrontmatter('---\ntitle: "Quoted: yes"\napplies: [typescript, "storybook@>=10"]\nsources: []\n---\nbody');
    assert.deepEqual(errors, []);
    assert.equal(data.title, "Quoted: yes");
    assert.deepEqual(data.applies, ["typescript", "storybook@>=10"]);
    assert.deepEqual(data.sources, []);
  });

  test("rejects block lists instead of guessing", () => {
    const { errors } = parseFrontmatter("---\napplies:\n  - x\n---\n");
    assert.match(errors.join(), /outside the dialect/);
  });
});

describe("validate", () => {
  test("the PoC notes pass", () => {
    assert.deepEqual(issues(), []);
  });

  test("the path is the id and the folder the type, so id and type are unknown keys", () => {
    edit(note("testing/storybook/portal-content-via-screen"), "title:", "id: testing/storybook/portal-content-via-screen\ntitle:");
    assert.match(messages(issues()), /unknown key\(s\): id/);
  });

  test("reports an applies value outside the vocabulary", () => {
    edit(note("testing/storybook/portal-content-via-screen"), "applies: [typescript,", "applies: [typescript, rust,");
    assert.match(messages(issues()), /"rust" is not in knowledge.config.json/);
  });

  test("reports implements pointing at a rule, and a missing section", () => {
    const file = note("testing/builders/typescript/mimicry-js/overrides-and-traits");
    edit(file, "implements: testing/builders/principles/set-asserted-values-explicitly", "implements: testing/storybook/portal-content-via-screen");
    edit(file, "## Incorrect", "## Wrong");
    const found = messages(issues());
    assert.match(found, /which is a rule, not a principle/);
    assert.match(found, /unknown section "## Wrong"/);
    assert.match(found, /missing section "## Incorrect"/);
  });

  test("a principle may name a library but not a language", () => {
    edit(note("testing/builders/principles/set-asserted-values-explicitly"), "impact: high", "impact: high\napplies: [python]");
    assert.match(messages(issues()), /a principle applies to no single language or framework/);
  });

  test("only {{TODO}} blocks a note; the word TODO in a sample does not", () => {
    edit(note("testing/storybook/portal-content-via-screen"), "const dialog", "// TODO: remove after the upgrade\nconst dialog");
    assert.deepEqual(issues(), []);
  });

  test("overlapping vocabularies are refused when the config loads", () => {
    const file = join(root, "knowledge/knowledge.config.json");
    const config = JSON.parse(readFileSync(file, "utf8"));
    config.libraries.push("react");
    writeFileSync(file, JSON.stringify(config));
    assert.throws(() => loadConfig(root), /listed under both frameworks and libraries/);
  });
});

describe("selection", () => {
  test("a principle with no language reaches both language targets, a rule only its own", () => {
    const notes = loadNotes(root);
    const ids = (where) => selectNotes(notes, { include: ["testing/builders/**"], where }).map((n) => n.id);
    const python = ids({ languages: ["python"] });
    assert.ok(python.includes("testing/builders/principles/set-asserted-values-explicitly"));
    assert.ok(python.includes("testing/builders/python/factory-boy/overrides-and-traits"));
    assert.ok(!python.includes("testing/builders/typescript/mimicry-js/overrides-and-traits"));
  });

  test("orders by impact, then id", () => {
    const impacts = selectNotes(loadNotes(root), { include: ["**"] }).map((n) => n.data.impact);
    const rank = ["critical", "high", "medium", "low"];
    assert.deepEqual(impacts, [...impacts].sort((a, b) => rank.indexOf(a) - rank.indexOf(b)));
  });
});

describe("rendering", () => {
  test("nothing only the author or the build needs reaches the model", () => {
    build(root);
    for (const name of ["storybook-testing", "storybook-rules", "builder-rules-ts", "builder-rules-py"]) {
      const rendered = readFileSync(skill(name, "references/rules.md"), "utf8") + readFileSync(skill(name), "utf8");
      assert.doesNotMatch(rendered, /^(sources|applies|implements|expects|summary|impact):/m, name);
      assert.doesNotMatch(rendered, /testing-library\.com|readthedocs|storybook\.js\.org/, name);
    }
  });

  test("compact keeps Rule, the first sentence of Why and Correct; Incorrect only when critical", () => {
    const high = renderNote(byId("testing/storybook/portal-content-via-screen"), { profile: "compact" });
    assert.match(high, /\*\*Rule\.\*\*/);
    assert.match(high, /\*\*Correct:\*\*/);
    assert.doesNotMatch(high, /\*\*Incorrect:\*\*/);
    assert.match(high, /\*\*Why\.\*\* Modals, popovers, tooltips and select option lists are portalled to `document.body`\.\n/);

    const critical = renderNote(byId("testing/storybook/never-import-userevent"), { profile: "compact" });
    assert.match(critical, /\*\*Incorrect:\*\*/);
  });

  test("lean keeps the whole Why and drops Incorrect unless critical", () => {
    const lean = renderNote(byId("testing/storybook/portal-content-via-screen"), { profile: "lean" });
    assert.match(lean, /A `canvas`\s+query never finds them/);
    assert.doesNotMatch(lean, /\*\*Incorrect:\*\*/);
  });
});

describe("build and check", () => {
  test("a second build writes nothing and check passes", () => {
    build(root);
    assert.deepEqual(build(root).written, []);
    assert.deepEqual(drift(), []);
    assert.equal(cli("check").status, 0);
  });

  test("a hand-edited rules file fails check as edited by hand", () => {
    build(root);
    appendFileSync(skill("storybook-testing", "references/rules.md"), "\nextra line\n");
    const result = cli("check");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /edited by hand/);
    assert.match(result.stderr, /storybook-testing\/references\/rules\.md/);
  });

  test("a changed note makes every artifact that carries it stale until the next build", () => {
    build(root);
    appendFileSync(note("testing/storybook/portal-content-via-screen"), "\nOne more sentence.\n");
    const stale = drift().filter((p) => /stale/.test(p.message)).map((p) => p.file).sort();
    assert.deepEqual(stale, [
      "plugins/testing/skills/storybook-rules/SKILL.md",
      "plugins/testing/skills/storybook-testing/SKILL.md",
      "plugins/testing/skills/storybook-testing/references/rules.md",
    ]);
    build(root);
    assert.deepEqual(drift(), []);
  });

  test("switching to the per-rule layout replaces rules.md with one file per note", () => {
    build(root);
    setTarget("builder-factory", { layout: "per-rule" });
    assert.match(messages(drift()), /left behind/);
    const { removed } = build(root);
    // build() returns native paths; compare with forward slashes so the test holds on Windows too.
    assert.ok(removed.some((f) => f.replaceAll("\\", "/").endsWith("builder-factory/references/rules.md")));
    assert.equal(readdirSync(skill("builder-factory", "references/rules")).length, 7);
    assert.match(readFileSync(skill("builder-factory"), "utf8"), /\(references\/rules\/testing--builders--/);

    rmSync(note("testing/builders/python/factory-boy/build-unless-the-test-needs-the-database"));
    assert.match(messages(drift()), /left behind/);
    build(root);
    assert.deepEqual(drift(), []);
  });

  test("a SKILL.md without markers is an error, never a silent append", () => {
    edit(skill("builder-factory"), "<!-- BEGIN:knowledge -->", "");
    const result = cli("build");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /has no <!-- BEGIN:knowledge -->/);
  });

  test("a knowledge skill over its line budget is refused", () => {
    setTarget("storybook-rules", { maxLines: 50 });
    const result = cli("build");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /the budget is 50/);
  });

  test("an unfinished note fails check as a note problem, not as drift", () => {
    build(root);
    scaffold(root, "testing/storybook/one-more-rule");
    const result = cli("check");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /problem\(s\) in the notes/);
    assert.doesNotMatch(result.stderr, /out of date/);
  });
});

describe("new", () => {
  test("fills applies from the path and stays invalid until every {{TODO}} is replaced", () => {
    const text = readFileSync(scaffold(root, "testing/builders/python/factory-boy/reset-sequences"), "utf8");
    assert.match(text, /applies: \[python, factory-boy\]/);
    assert.match(messages(issues()), /still has a \{\{TODO\}\} placeholder/);
  });

  test("a principle's path contributes only libraries", () => {
    const text = readFileSync(scaffold(root, "testing/storybook/principles/one-story-per-state"), "utf8");
    assert.match(text, /applies: \[storybook\]/);
  });

  test("refuses a path that already exists", () => {
    const result = cli("new", "testing/storybook/portal-content-via-screen");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /already exists/);
  });
});

describe("coverage", () => {
  test("reports the principles that still lack an implementation", () => {
    const gaps = coverage(root).filter((r) => !r.implementedBy.length).map((r) => `${r.principle} [${r.expected}]`);
    assert.deepEqual(gaps.sort(), [
      "testing/builders/principles/reset-builder-state-between-tests [python]",
      "testing/storybook/principles/use-csf-next-factories [vue]",
    ]);
  });
});

test("the repository is built and current", () => {
  assert.deepEqual(check(REPO_ROOT).problems, []);
});

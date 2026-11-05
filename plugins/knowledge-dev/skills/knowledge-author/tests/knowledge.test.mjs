// Runs the knowledge build against a throwaway copy of tests/fixture/, a frozen slice of notes,
// targets and the hand-written SKILL.md files they fill. The fixture holds inputs only: a test that
// needs generated files builds them in its copy first. Every test can break them without touching the real ones and the
// assertions do not move when the repository's own notes change. The last test checks the
// repository itself.
//
// Usage: node --test plugins/knowledge-dev/skills/knowledge-author/tests/knowledge.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import {
  build,
  check,
  coverage,
  lint,
  loadConfig,
  loadNotes,
  neighbors,
  parseFrontmatter,
  renderNote,
  scaffold,
  selectNotes,
  similar,
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

describe("guides", () => {
  const guide = "testing/guides/choose-how-to-query";
  const withGuide = (patch = {}) => setTarget("storybook-rules", { include: ["testing/principles/**", "testing/testing-library/**", "testing/guides/**"], ...patch });

  test("the folder makes it a guide, and it passes validate", () => {
    assert.equal(byId(guide).type, "guide");
    assert.deepEqual(issues(), []);
  });

  test("decides must name notes that exist and are not guides; sections are the guide's own", () => {
    edit(note(guide), "decides: [testing/principles/query-like-a-user,", "decides: [testing/guides/missing, testing/guides/choose-how-to-query,");
    edit(note(guide), "## Evolution", "## Why\n\nx\n\n## Evolution");
    const text = messages(issues());
    assert.match(text, /which does not exist/);
    assert.match(text, /which is a guide/);
    assert.match(text, /unknown section "## Why"/);
  });

  test("a rule cannot list decides, and a guide cannot omit it", () => {
    edit(note("testing/storybook/portal-content-via-screen"), "sources:", "decides: [testing/principles/query-like-a-user]\nsources:");
    edit(note(guide), /decides: .*\n/, "");
    const text = messages(issues());
    assert.match(text, /only a guide can list `decides`/);
    assert.match(text, /must list the notes it decided/);
  });

  test("by default only the Decision is rendered, inline, with no extra file", () => {
    withGuide();
    build(root);
    const skillMd = readFileSync(skill("storybook-rules"), "utf8");
    assert.match(skillMd, /Query the way a user finds the element/);
    assert.doesNotMatch(skillMd, /nothing visible identifies it/);
    assert.doesNotMatch(skillMd, /Read in full/);
    assert.throws(() => readdirSync(skill("storybook-rules", "references/guides")));
  });

  test("asking for more sections writes them to references/guides and points at the file", () => {
    withGuide({ guides: ["Decision", "Options", "Evolution"] });
    build(root);
    const file = skill("storybook-rules", "references/guides/testing--guides--choose-how-to-query.md");
    const full = readFileSync(file, "utf8");
    assert.match(full, /## Options/);
    assert.match(full, /nothing visible identifies it/);
    assert.match(full, /## Evolution/);
    assert.match(readFileSync(skill("storybook-rules"), "utf8"), /Read in full:\*\* `references\/guides\/testing--guides--choose-how-to-query\.md`/);
    assert.deepEqual(drift(), []);
    appendFileSync(file, "\nextra\n");
    assert.match(messages(drift()), /edited by hand/);
  });

  test("dropping the extra sections removes the guide file as left behind", () => {
    withGuide({ guides: ["Decision", "Options"] });
    build(root);
    withGuide({ guides: ["Decision"] });
    assert.match(messages(drift()), /left behind/);
    build(root);
    assert.deepEqual(drift(), []);
  });

  test("a target must ask for Decision and for real sections", () => {
    withGuide({ guides: ["Options"] });
    assert.match(cli("build").stderr, /must name sections .* and include Decision/);
  });

  test("new scaffolds a guide from its own template and it stays invalid until finished", () => {
    scaffold(root, "testing/guides/another-one");
    assert.match(readFileSync(note("testing/guides/another-one"), "utf8"), /^decides: /m);
    assert.match(messages(issues()), /\{\{TODO\}\}/);
  });

  test("neighbors links a guide to the notes it decided, both ways", () => {
    const [forGuide] = neighbors(root, [guide]);
    assert.deepEqual(forGuide.linked.sort(), ["testing/principles/query-like-a-user", "testing/testing-library/query-variants"]);
    const [forRule] = neighbors(root, ["testing/testing-library/query-variants"]);
    assert.ok(forRule.linked.includes(guide));
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

describe("similar and neighbors", () => {
  test("similar ranks the note a sentence is about first and ignores unrelated ones", () => {
    const title = byId("testing/storybook/portal-content-via-screen").data.title;
    const rows = similar(root, title);
    assert.equal(rows[0].id, "testing/storybook/portal-content-via-screen");
    assert.ok(rows[0].score >= 0.5);
    assert.deepEqual(similar(root, "zebra giraffe antelope savanna"), []);
  });

  test("new --about lists the closest existing notes and the folder's siblings", () => {
    const about = byId("testing/storybook/portal-content-via-screen").data.summary;
    const result = cli("new", "testing/storybook/portal-content-again", "--about", about);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /closest existing notes/);
    assert.match(result.stdout, /! testing\/storybook\/portal-content-via-screen/);
    assert.match(result.stdout, /same folder: .*portal-content-via-screen/);
  });

  test("neighbors gives siblings and links, and reports an unknown id", () => {
    const [row, missing] = neighbors(root, ["testing/storybook/portal-content-via-screen", "testing/nope"]);
    assert.ok(row.sameFolder.length > 0);
    assert.ok(Array.isArray(row.similar) && Array.isArray(row.linked));
    assert.equal(missing.missing, true);
  });

  test("the CLI prints neighbors as JSON", () => {
    const result = cli("neighbors", "testing/storybook/portal-content-via-screen", "--json");
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout)[0].id, "testing/storybook/portal-content-via-screen");
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

describe("lint", () => {
  const body = "\n## Rule\n\nR.\n\n## Why\n\nW.\n";
  const write = (id, front) => {
    mkdirSync(dirname(note(id)), { recursive: true });
    writeFileSync(note(id), `---\n${front}\n---\n${body}`);
  };
  const messagesOf = async (options) => (await lint(root, options)).map((f) => `${f.file} ${f.message}`).join("\n");

  test("a note no target receives is reported", async () => {
    write("elsewhere/lonely-note", "title: Nobody reads this\nsummary: No target includes it.\nimpact: low");
    assert.match(await messagesOf(), /elsewhere\/lonely-note\.md no target in targets\.json receives this note/);
  });

  test("two notes that say the same thing are reported, a parallel across languages is not", async () => {
    const original = readFileSync(note("testing/storybook/never-import-userevent"), "utf8");
    writeFileSync(note("testing/storybook/never-import-user-event"), original);
    const found = await messagesOf();
    assert.match(found, /never-import-user-event\.md looks like testing\/storybook\/never-import-userevent/);
    assert.doesNotMatch(found, /overrides-and-traits/, "the python and typescript notes are parallel, not duplicates");
  });

  test("a principle that expects implementations and has none is reported", async () => {
    write("testing/principles/lonely-principle", "title: A principle nobody implements\nsummary: Expects a language with no rule.\nimpact: low\nexpects: [typescript]");
    assert.match(await messagesOf(), /lonely-principle\.md no rule implements this principle/);
  });

  test("a principle without expects may stand alone", async () => {
    write("testing/principles/standalone", "title: Stands alone\nsummary: Needs no implementation.\nimpact: low");
    assert.doesNotMatch(await messagesOf(), /standalone\.md no rule implements/);
  });

  test("a knowledge skill close to its line budget is reported", async () => {
    build(root);
    const lines = readFileSync(skill("storybook-rules"), "utf8").split("\n").length;
    assert.doesNotMatch(await messagesOf(), /storybook-rules is/);
    setTarget("storybook-rules", { maxLines: lines });
    assert.match(await messagesOf(), new RegExp(`storybook-rules is ${lines} of ${lines} lines`));
  });

  test("sources are probed only on request", async () => {
    let calls = 0;
    const fetchImpl = async () => (calls += 1, { ok: false, status: 404 });
    assert.doesNotMatch(await messagesOf({ fetchImpl }), /source/);
    assert.equal(calls, 0);
    const found = await messagesOf({ links: true, fetchImpl });
    assert.match(found, /source https:\/\/storybook\.js\.org\/docs\/writing-tests\/interaction-testing answers 404/);
    assert.ok(calls > 0);
  });

  test("an unreachable source is a finding, and one URL is probed once", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    };
    assert.match(await messagesOf({ links: true, fetchImpl }), /cannot be reached \(ENOTFOUND\)/);
    const urls = new Set(loadNotes(root).flatMap((n) => n.data.sources ?? []));
    assert.equal(calls, urls.size);
  });

  test("the CLI exits 0 on findings and 1 with --strict", () => {
    write("elsewhere/lonely-note", "title: Nobody reads this\nsummary: No target includes it.\nimpact: low");
    assert.equal(cli("lint").status, 0);
    assert.equal(cli("lint", "--strict").status, 1);
  });
});

describe("the edit hook", () => {
  const HOOK = resolve(import.meta.dirname, "../../../hooks/check-edited-note.mjs");
  const run = (file) =>
    spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_input: { file_path: file }, cwd: root }), encoding: "utf8" });
  const NEVER = "knowledge/testing/storybook/never-import-userevent.md";

  test("is silent for a clean note and for files outside knowledge/", () => {
    assert.deepEqual([run(NEVER).status, run(NEVER).stdout, run(NEVER).stderr], [0, "", ""]);
    assert.equal(run("README.md").stdout, "");
    assert.equal(run("knowledge/README.md").status, 0);
  });

  test("blocks with exit 2 and names the contract violation", () => {
    edit(join(root, NEVER), "impact: critical", "impact: bogus");
    const result = run(NEVER);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /impact "bogus" is not one of/);
  });

  test("lets an unfinished {{TODO}} note through", () => {
    scaffold(root, "testing/storybook/half-written");
    const result = run("knowledge/testing/storybook/half-written.md");
    assert.doesNotMatch(result.stderr, /TODO/);
  });

  test("returns lint findings about the edited note as context, without blocking", () => {
    writeFileSync(note("testing/storybook/never-import-user-event"), readFileSync(note("testing/storybook/never-import-userevent"), "utf8"));
    const result = run("knowledge/testing/storybook/never-import-user-event.md");
    assert.equal(result.status, 0);
    const { hookSpecificOutput } = JSON.parse(result.stdout);
    assert.equal(hookSpecificOutput.hookEventName, "PostToolUse");
    assert.match(hookSpecificOutput.additionalContext, /looks like testing\/storybook\/never-import-userevent/);
  });

  test("does not report findings about other notes", () => {
    writeFileSync(note("testing/storybook/never-import-user-event"), readFileSync(note("testing/storybook/never-import-userevent"), "utf8"));
    assert.equal(run("knowledge/testing/storybook/name-stories-after-states.md").stdout, "");
  });
});

test("the repository is built and current", () => {
  assert.deepEqual(check(REPO_ROOT).problems, []);
});

#!/usr/bin/env node
// Works out which plugins changed since a git ref, what semver bump each one's change implies,
// and whether the bump has already been made. Does the mechanical half of a marketplace release:
// diffing, classifying, and (with --apply) writing the new version into plugin.json.
//
// The semantic half stays with the caller — this script proposes a floor, never the final call.
// A "patch" verdict on a diff that quietly changed a skill's contract is still a major.
//
// Usage: node plan-release.mjs [repo-root] [--since <ref>] [--apply] [--json] [--plugin <name>]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const apply = argv.includes("--apply");

function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
}

const VALUE_FLAGS = new Set(["--since", "--plugin"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const root = resolve(positional[0] ?? process.cwd());
const onlyPlugin = flag("--plugin", null);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function git(args, allowFail = false) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: "pipe" }).trim();
  } catch (err) {
    if (allowFail) return null;
    fail(`git ${args.join(" ")} failed: ${(err.stderr ?? err.message).toString().trim()}`);
  }
}

if (!existsSync(join(root, ".git"))) fail(`${root} is not a git repository`);

// Default comparison point, in order of preference: the last release tag this repo made,
// then the upstream branch, then the previous commit.
function defaultSince() {
  const lastTag = git(["describe", "--tags", "--abbrev=0"], true);
  if (lastTag) return lastTag;
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], true);
  if (upstream) return upstream;
  return git(["rev-parse", "HEAD~1"], true) ? "HEAD~1" : null;
}

const since = flag("--since", defaultSince());
if (!since) fail("Nothing to compare against — pass --since <ref> (the repo has no tags, no upstream, and no parent commit).");
if (!git(["rev-parse", "--verify", `${since}^{commit}`], true)) fail(`--since ref "${since}" does not resolve to a commit`);

const dirty = git(["status", "--porcelain"]) !== "";

// Changed paths: committed since `since`, plus anything currently uncommitted, so a release
// planned mid-edit sees the work in the tree rather than only what is already in history.
const changed = new Set(
  [...git(["diff", "--name-only", `${since}...HEAD`]).split("\n"), ...git(["status", "--porcelain"]).split("\n").map((l) => l.slice(3))]
    .map((l) => l.trim())
    .filter(Boolean)
);

// A path present at `since` but gone now, or vice versa — how additions and removals are
// detected. "Now" means the working tree, not HEAD: a skill added but not yet committed still
// counts as a new skill, which is exactly the state you are in when planning a release.
const namesAt = (ref) => new Set((git(["ls-tree", "-r", "--name-only", ref], true) ?? "").split("\n").filter(Boolean));
const before = namesAt(since);
const after = namesAt("HEAD");
for (const line of git(["status", "--porcelain"]).split("\n").filter(Boolean)) {
  const code = line.slice(0, 2);
  const path = line.slice(3).trim();
  if (code.includes("D")) after.delete(path);
  else if (code.includes("R")) {
    const [from, to] = path.split(" -> ").map((p) => p.trim());
    after.delete(from);
    after.add(to);
  } else after.add(path);
}
// Untracked directories are reported as a single `dir/` entry, so expand them to real files.
for (const entry of [...after]) {
  if (!entry.endsWith("/")) continue;
  after.delete(entry);
  const listed = git(["ls-files", "--others", "--exclude-standard", entry], true);
  for (const file of (listed ?? "").split("\n").filter(Boolean)) after.add(file.trim());
}

const BUMP_RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const raise = (current, next) => (BUMP_RANK[next] > BUMP_RANK[current] ? next : current);

function bumpVersion(version, kind) {
  const [maj, min, pat] = version.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  return version;
}

function unitsUnder(names, plugin, kind) {
  // kind: "skills" -> the skill folder name; "agents" -> the agent file's basename
  const out = new Set();
  const prefix = `plugins/${plugin}/${kind}/`;
  for (const n of names) {
    if (!n.startsWith(prefix)) continue;
    const rest = n.slice(prefix.length);
    if (kind === "skills") {
      const [dir] = rest.split("/");
      if (dir) out.add(dir);
    } else if (rest.endsWith(".md") && !rest.includes("/")) {
      out.add(rest.replace(/\.md$/, ""));
    }
  }
  return out;
}

const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(marketplacePath)) fail("No .claude-plugin/marketplace.json — this is not a marketplace repo root.");
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));

const plans = [];

for (const entry of marketplace.plugins ?? []) {
  const name = entry.name;
  if (onlyPlugin && name !== onlyPlugin) continue;

  const manifestPath = join(root, "plugins", name, "plugin.json");
  if (!existsSync(manifestPath)) continue;

  const touched = [...changed].filter((p) => p.startsWith(`plugins/${name}/`));
  if (touched.length === 0) continue;

  const manifestRaw = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const currentVersion = manifest.version;

  // Was the version already bumped in this range? If so we report it and propose nothing.
  const previousManifest = git(["show", `${since}:plugins/${name}/plugin.json`], true);
  const previousVersion = previousManifest ? (JSON.parse(previousManifest).version ?? null) : null;
  const alreadyBumped = previousVersion !== null && previousVersion !== currentVersion;

  const reasons = [];
  let kind = "none";

  const skillsBefore = unitsUnder(before, name, "skills");
  const skillsAfter = unitsUnder(after, name, "skills");
  const agentsBefore = unitsUnder(before, name, "agents");
  const agentsAfter = unitsUnder(after, name, "agents");

  for (const s of skillsAfter) if (!skillsBefore.has(s)) (kind = raise(kind, "minor")), reasons.push(`new skill: ${s}`);
  for (const s of skillsBefore) if (!skillsAfter.has(s)) (kind = raise(kind, "major")), reasons.push(`skill removed or renamed: ${s}`);
  for (const a of agentsAfter) if (!agentsBefore.has(a)) (kind = raise(kind, "minor")), reasons.push(`new agent: ${a}`);
  for (const a of agentsBefore) if (!agentsAfter.has(a)) (kind = raise(kind, "major")), reasons.push(`agent removed or renamed: ${a}`);

  const editedSkills = [...new Set(touched.filter((p) => p.includes("/skills/")).map((p) => p.split("/")[3]))].filter(
    (s) => skillsBefore.has(s) && skillsAfter.has(s)
  );
  const editedAgents = touched
    .filter((p) => p.includes("/agents/") && p.endsWith(".md"))
    .map((p) => p.split("/").pop().replace(/\.md$/, ""))
    .filter((a) => agentsBefore.has(a) && agentsAfter.has(a));

  if (editedSkills.length) (kind = raise(kind, "patch")), reasons.push(`skills edited: ${editedSkills.join(", ")}`);
  if (editedAgents.length) (kind = raise(kind, "patch")), reasons.push(`agents edited: ${[...new Set(editedAgents)].join(", ")}`);
  if (touched.includes(`plugins/${name}/plugin.json`) && kind === "none") {
    kind = raise(kind, "patch");
    reasons.push("plugin.json metadata changed");
  }
  if (kind === "none" && touched.length) {
    kind = "patch";
    reasons.push(`other files changed: ${touched.slice(0, 3).join(", ")}${touched.length > 3 ? ` (+${touched.length - 3})` : ""}`);
  }

  const proposed = alreadyBumped ? currentVersion : bumpVersion(currentVersion, kind);

  plans.push({
    plugin: name,
    currentVersion,
    previousVersion,
    alreadyBumped,
    bump: alreadyBumped ? "none" : kind,
    proposedVersion: proposed,
    reasons,
    touched,
    // Agents carry their own version + lastUpdated; the caller must handle those by hand.
    agentsNeedingOwnBump: [...new Set(editedAgents)],
    tagCommand: `claude plugin tag plugins/${name}`,
  });
}

if (apply) {
  if (dirty && !argv.includes("--force")) {
    // A dirty tree is fine for planning, but writing versions into it makes the diff hard to read.
    console.error("⚠ working tree is dirty — --apply will add version edits on top of your changes");
  }
  for (const plan of plans) {
    if (plan.bump === "none") continue;
    const manifestPath = join(root, "plugins", plan.plugin, "plugin.json");
    const raw = readFileSync(manifestPath, "utf8");
    const updated = raw.replace(/("version"\s*:\s*)"[^"]+"/, `$1"${plan.proposedVersion}"`);
    if (updated === raw) {
      console.error(`✗ ${plan.plugin}: could not find a "version" field to rewrite`);
      continue;
    }
    writeFileSync(manifestPath, updated, "utf8");
    plan.applied = true;
  }
}

if (asJson) {
  console.log(JSON.stringify({ root, since, dirty, plans }, null, 2));
  process.exit(0);
}

console.log(`Comparing against: ${since}${dirty ? "  (working tree is dirty — uncommitted changes included)" : ""}`);

if (plans.length === 0) {
  console.log("\nNo plugin changed. Nothing to release.");
  process.exit(0);
}

for (const plan of plans) {
  const header = plan.alreadyBumped
    ? `${plan.plugin}  ${plan.previousVersion} → ${plan.currentVersion}  (already bumped)`
    : `${plan.plugin}  ${plan.currentVersion} → ${plan.proposedVersion}  (${plan.bump})${plan.applied ? "  ✓ applied" : ""}`;
  console.log(`\n${header}`);
  for (const reason of plan.reasons) console.log(`    · ${reason}`);
  if (plan.agentsNeedingOwnBump.length) {
    console.log(`    ! bump version + lastUpdated in the agent frontmatter too: ${plan.agentsNeedingOwnBump.join(", ")}`);
  }
}

const pending = plans.filter((p) => p.bump !== "none" && !p.applied);
if (pending.length && !apply) {
  console.log(`\n${pending.length} plugin(s) need a version bump. Re-run with --apply to write them, or edit plugin.json by hand.`);
}

console.log("\nTag once the bumps are committed:");
for (const plan of plans) console.log(`  ${plan.tagCommand}`);

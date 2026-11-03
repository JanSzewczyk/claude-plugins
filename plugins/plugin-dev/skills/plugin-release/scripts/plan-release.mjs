#!/usr/bin/env node
// Works out which plugins changed since a git ref, what semver bump each one's change implies,
// and whether the bump has already been made. Does the mechanical half of a marketplace release:
// diffing, classifying, and (with --apply) writing the new version into its manifest.
//
// The semantic half stays with the caller — this script proposes a floor, never the final call.
// A "patch" verdict on a diff that quietly changed a skill's contract is still a major.
//
// Usage: node plan-release.mjs [repo-root] [--since <ref>] [--apply] [--json] [--plugin <name>] [--check]
//
// --check is the CI gate: with --since <the PR's base>, it exits 1 when a changed plugin has no
// version bump, and warns when the bump is smaller than the change implies. It writes nothing.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const apply = argv.includes("--apply");
const check = argv.includes("--check");

function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
}

const VALUE_FLAGS = new Set(["--since", "--plugin"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]));
const root = resolve(positional[0] ?? process.cwd());
const onlyPlugin = flag("--plugin", null);
const explicitSince = flag("--since", null);
if (check && apply) {
  console.error("✗ --check and --apply exclude each other");
  process.exit(1);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// Trailing whitespace only: the leading space of `git status --porcelain` output is data.
function git(args, allowFail = false) {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: "pipe" }).trimEnd();
  } catch (err) {
    if (allowFail) return null;
    fail(`git ${args.join(" ")} failed: ${(err.stderr ?? err.message).toString().trim()}`);
  }
}

const lines = (text) => (text ?? "").split("\n").filter(Boolean);

if (!existsSync(join(root, ".git"))) fail(`${root} is not a git repository`);

const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(marketplacePath)) fail("No .claude-plugin/marketplace.json — this is not a marketplace repo root.");
const marketplaceRaw = readFileSync(marketplacePath, "utf8");
const marketplace = JSON.parse(marketplaceRaw);

if (explicitSince && !git(["rev-parse", "--verify", `${explicitSince}^{commit}`], true)) {
  fail(`--since ref "${explicitSince}" does not resolve to a commit`);
}
if (onlyPlugin && !(marketplace.plugins ?? []).some((e) => e.name === onlyPlugin)) {
  fail(`marketplace.json lists no plugin named "${onlyPlugin}"`);
}

// Where a plugin's last release is. Tags are per plugin, so the newest tag in the repo says
// nothing about the others: comparing against it hides every change made before it.
function pluginTag(name) {
  return lines(git(["tag", "-l", `${name}--v*`, "--merged", "HEAD", "--sort=-v:refname"], true))[0] ?? null;
}

const repoReleasesPerPlugin = lines(git(["tag", "-l", "*--v*"], true)).length > 0;

// Fallback for a repo without per-plugin tags: its last plain tag, then the upstream branch, then
// the previous commit.
function repoBaseline() {
  const lastTag = git(["describe", "--tags", "--abbrev=0", "--exclude", "*--v*"], true);
  if (lastTag) return lastTag;
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], true);
  if (upstream) return upstream;
  return git(["rev-parse", "HEAD~1"], true) ? "HEAD~1" : null;
}

// The working tree, one entry per file. -z keeps paths verbatim (no quoting of spaces), and a
// rename is two fields: the new path, then the old one.
function workingTreeChanges() {
  const fields = git(["status", "--porcelain", "-z", "--untracked-files=all"]).split("\0").filter(Boolean);
  const out = [];
  for (let i = 0; i < fields.length; i += 1) {
    const code = fields[i].slice(0, 2);
    const path = fields[i].slice(3);
    out.push({ code, path, from: /[RC]/.test(code) ? fields[(i += 1)] : null });
  }
  return out;
}

const status = workingTreeChanges();
const dirty = status.length > 0;
const namesAt = (ref) => new Set(lines(git(["ls-tree", "-r", "--name-only", ref], true)));

// A path present at the baseline but gone now, or vice versa — how additions and removals are
// detected. "Now" means the working tree, not HEAD: a skill added but not yet committed still
// counts as a new skill, which is exactly the state you are in when planning a release.
const after = namesAt("HEAD");
for (const { code, path, from } of status) {
  if (from && code.includes("R")) after.delete(from);
  if (code.includes("D")) after.delete(path);
  else after.add(path);
}

// Changed paths: committed since `since`, plus anything currently uncommitted, so a release
// planned mid-edit sees the work in the tree rather than only what is already in history.
function changedSince(since) {
  const committed = since ? lines(git(["diff", "--name-only", `${since}...HEAD`])) : [];
  return new Set([...committed, ...status.flatMap(({ path, from }) => (from ? [path, from] : [path]))]);
}

const BUMP_RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const raise = (current, next) => (BUMP_RANK[next] > BUMP_RANK[current] ? next : current);

function bumpVersion(version, kind) {
  const [maj, min, pat] = version.split(/[-+]/)[0].split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  return version;
}

function unitsUnder(names, prefix, kind) {
  // kind: "skills" -> the skill folder name; "agents" -> the agent file's basename
  const out = new Set();
  const start = `${prefix}${kind}/`;
  for (const n of names) {
    if (!n.startsWith(start)) continue;
    const rest = n.slice(start.length);
    if (kind === "skills") {
      const [dir] = rest.split("/");
      if (dir) out.add(dir);
    } else if (rest.endsWith(".md") && !rest.includes("/")) {
      out.add(rest.replace(/\.md$/, ""));
    }
  }
  return out;
}

// A relative source resolves from the marketplace root; metadata.pluginRoot is prepended to the
// short form. Anything else (github, url, npm...) has no files here to diff.
function localPluginDir(entry) {
  if (typeof entry.source !== "string") return null;
  const base = marketplace.metadata?.pluginRoot;
  const dir = resolve(root, base && !entry.source.startsWith(".") ? join(base, entry.source) : entry.source);
  return existsSync(dir) ? dir : null;
}

// Claude Code reads .claude-plugin/plugin.json; a plugin.json beside skills/ is the older layout,
// still found here so a release can be cut before the manifest is moved.
function manifestRel(prefix, dir) {
  const candidate = [".claude-plugin/plugin.json", "plugin.json"].find((p) => existsSync(join(dir, p)));
  return candidate ? `${prefix}${candidate}` : null;
}

function versionAt(ref, path) {
  const raw = git(["show", `${ref}:${path}`], true);
  try {
    return raw ? (JSON.parse(raw).version ?? null) : null;
  } catch {
    return null;
  }
}

const plans = [];
const notPlanned = [];

for (const entry of marketplace.plugins ?? []) {
  const name = entry.name;
  if (onlyPlugin && name !== onlyPlugin) continue;

  const dir = localPluginDir(entry);
  if (!dir) {
    notPlanned.push({ plugin: name, reason: typeof entry.source === "string" ? `missing directory ${entry.source}` : "remote source, released from its own repo" });
    continue;
  }
  const rel = relative(root, dir).replace(/\\/g, "/");
  const prefix = rel ? `${rel}/` : "";
  const manifestPath = manifestRel(prefix, dir);
  const manifest = manifestPath ? JSON.parse(readFileSync(join(root, manifestPath), "utf8")) : {};
  const currentVersion = manifest.version ?? entry.version ?? null;

  // A plugin that was never tagged in a repo that tags per plugin is unreleased, whatever else
  // happened to it: its first release is the version it already declares.
  const tag = explicitSince ? null : pluginTag(name);
  const firstRelease = !explicitSince && !tag && repoReleasesPerPlugin;
  const since = explicitSince ?? tag ?? (firstRelease ? null : repoBaseline());
  if (!since && !firstRelease) {
    fail("Nothing to compare against — pass --since <ref> (the repo has no tags, no upstream, and no parent commit).");
  }

  const touched = [...changedSince(since)].filter((p) => p.startsWith(prefix));
  if (touched.length === 0 && !firstRelease) continue;

  if (currentVersion === null) {
    notPlanned.push({ plugin: name, reason: "no version in plugin.json or the marketplace entry, so installs follow the git commit" });
    continue;
  }
  if (!/^\d+\.\d+\.\d+/.test(currentVersion)) {
    notPlanned.push({ plugin: name, reason: `version "${currentVersion}" is not semver` });
    continue;
  }

  // Was the version already bumped in this range? If so we report it and propose nothing.
  // The manifest may have moved within the range (plugin.json → .claude-plugin/plugin.json).
  const previousVersion = since
    ? ([manifestPath, `${prefix}.claude-plugin/plugin.json`, `${prefix}plugin.json`].filter(Boolean).map((p) => versionAt(since, p)).find((v) => v !== null) ?? null)
    : null;
  const alreadyBumped = previousVersion !== null && previousVersion !== currentVersion;

  const reasons = [];
  let kind = "none";

  if (firstRelease) reasons.push(`never tagged: first release at ${currentVersion}`);

  const before = since ? namesAt(since) : new Set();
  const skillsBefore = unitsUnder(before, prefix, "skills");
  const skillsAfter = unitsUnder(after, prefix, "skills");
  const agentsBefore = unitsUnder(before, prefix, "agents");
  const agentsAfter = unitsUnder(after, prefix, "agents");

  let editedAgents = [];
  if (!firstRelease) {
    for (const s of skillsAfter) if (!skillsBefore.has(s)) (kind = raise(kind, "minor")), reasons.push(`new skill: ${s}`);
    for (const s of skillsBefore) if (!skillsAfter.has(s)) (kind = raise(kind, "major")), reasons.push(`skill removed or renamed: ${s}`);
    for (const a of agentsAfter) if (!agentsBefore.has(a)) (kind = raise(kind, "minor")), reasons.push(`new agent: ${a}`);
    for (const a of agentsBefore) if (!agentsAfter.has(a)) (kind = raise(kind, "major")), reasons.push(`agent removed or renamed: ${a}`);

    const inPlugin = touched.map((p) => p.slice(prefix.length));
    const editedSkills = [...new Set(inPlugin.filter((p) => p.startsWith("skills/")).map((p) => p.split("/")[1]))].filter(
      (s) => skillsBefore.has(s) && skillsAfter.has(s)
    );
    editedAgents = [
      ...new Set(
        inPlugin
          .filter((p) => p.startsWith("agents/") && p.endsWith(".md") && !p.slice("agents/".length).includes("/"))
          .map((p) => p.slice("agents/".length).replace(/\.md$/, ""))
      ),
    ].filter((a) => agentsBefore.has(a) && agentsAfter.has(a));

    if (editedSkills.length) (kind = raise(kind, "patch")), reasons.push(`skills edited: ${editedSkills.join(", ")}`);
    if (editedAgents.length) (kind = raise(kind, "patch")), reasons.push(`agents edited: ${editedAgents.join(", ")}`);
    if (manifestPath && touched.includes(manifestPath) && kind === "none") {
      kind = raise(kind, "patch");
      reasons.push("plugin.json metadata changed");
    }
    if (kind === "none" && touched.length) {
      kind = "patch";
      reasons.push(`other files changed: ${touched.slice(0, 3).join(", ")}${touched.length > 3 ? ` (+${touched.length - 3})` : ""}`);
    }
  }

  const proposed = alreadyBumped ? currentVersion : bumpVersion(currentVersion, kind);

  plans.push({
    plugin: name,
    since,
    currentVersion,
    previousVersion,
    alreadyBumped,
    firstRelease,
    bump: alreadyBumped ? "none" : kind,
    kind,
    proposedVersion: proposed,
    reasons,
    touched,
    manifestPath,
    // Agents that carry their own version + lastUpdated; the caller must handle those by hand.
    agentsNeedingOwnBump: editedAgents.filter((a) => /^version:/m.test(readFileSync(join(dir, "agents", `${a}.md`), "utf8"))),
    tagCommand: `claude plugin tag ${rel || "."}`,
  });
}

// Rewrites one `version` value without reformatting the file. The first textual match can belong
// to something else (a dependency's range sits before the plugin's version in some manifests), so
// each occurrence is tried until the object that owns the version is the one that changed.
function rewriteVersion(raw, select, version) {
  for (const m of raw.matchAll(/("version"\s*:\s*)"[^"]*"/g)) {
    const candidate = raw.slice(0, m.index) + `${m[1]}"${version}"` + raw.slice(m.index + m[0].length);
    if (select(JSON.parse(candidate))?.version === version) return candidate;
  }
  return null;
}

if (apply) {
  if (dirty && !argv.includes("--force")) {
    // A dirty tree is fine for planning, but writing versions into it makes the diff hard to read.
    console.error("⚠ working tree is dirty — --apply will add version edits on top of your changes");
  }
  let marketplaceOut = marketplaceRaw;
  for (const plan of plans) {
    if (plan.bump === "none") continue;
    let written = true;
    // Every layer that declares a version gets the new one: `claude plugin tag` refuses a mismatch.
    if (plan.manifestPath) {
      const manifestFile = join(root, plan.manifestPath);
      const raw = readFileSync(manifestFile, "utf8");
      if (JSON.parse(raw).version !== undefined) {
        const updated = rewriteVersion(raw, (m) => m, plan.proposedVersion);
        if (updated) writeFileSync(manifestFile, updated, "utf8");
        else written = false;
      }
    }
    const inEntry = (m) => m.plugins.find((e) => e.name === plan.plugin);
    if (inEntry(JSON.parse(marketplaceOut))?.version !== undefined) {
      const updated = rewriteVersion(marketplaceOut, inEntry, plan.proposedVersion);
      if (updated) marketplaceOut = updated;
      else written = false;
    }
    if (written) plan.applied = true;
    else console.error(`✗ ${plan.plugin}: could not find its "version" field to rewrite`);
  }
  if (marketplaceOut !== marketplaceRaw) writeFileSync(marketplacePath, marketplaceOut, "utf8");
}

const order = ["none", "patch", "minor", "major"];
function bumpKind(from, to) {
  const [a, b, c] = from.split(/[-+]/)[0].split(".").map(Number);
  const [x, y, z] = to.split(/[-+]/)[0].split(".").map(Number);
  return x > a ? "major" : y > b ? "minor" : z > c ? "patch" : "none";
}

if (check) {
  const missing = plans.filter((p) => !p.alreadyBumped && !p.firstRelease && p.bump !== "none");
  const tooSmall = plans.filter((p) => p.alreadyBumped && order.indexOf(bumpKind(p.previousVersion, p.currentVersion)) < order.indexOf(p.kind));
  if (asJson) {
    console.log(JSON.stringify({ root, since: explicitSince ?? "per plugin", missing, tooSmall, notPlanned }, null, 2));
  } else {
    for (const p of missing) {
      console.log(`✗ ${p.plugin} changed but is still at ${p.currentVersion} — needs a ${p.bump} bump to ${p.proposedVersion}`);
      for (const reason of p.reasons) console.log(`    · ${reason}`);
    }
    for (const p of tooSmall) {
      console.log(`⚠ ${p.plugin} went ${p.previousVersion} → ${p.currentVersion}, but the change suggests a ${p.kind} bump`);
      for (const reason of p.reasons) console.log(`    · ${reason}`);
    }
    if (!missing.length && !tooSmall.length) console.log(`✓ every changed plugin has a version bump since ${explicitSince ?? "its last release"}`);
  }
  process.exit(missing.length ? 1 : 0);
}

if (asJson) {
  console.log(JSON.stringify({ root, since: explicitSince ?? "per plugin", dirty, plans, notPlanned }, null, 2));
  process.exit(0);
}

console.log(
  `Comparing against: ${explicitSince ?? "each plugin's last release"}${dirty ? "  (working tree is dirty — uncommitted changes included)" : ""}`
);

for (const { plugin, reason } of notPlanned) console.log(`\n${plugin}  not planned: ${reason}`);

if (plans.length === 0) {
  console.log("\nNo plugin changed. Nothing to release.");
  process.exit(0);
}

for (const plan of plans) {
  const baseline = !explicitSince && plan.since ? `  since ${plan.since}` : "";
  const header = plan.alreadyBumped
    ? `${plan.plugin}  ${plan.previousVersion} → ${plan.currentVersion}  (already bumped)${baseline}`
    : plan.firstRelease
      ? `${plan.plugin}  ${plan.currentVersion}  (first release)`
      : `${plan.plugin}  ${plan.currentVersion} → ${plan.proposedVersion}  (${plan.bump})${plan.applied ? "  ✓ applied" : ""}${baseline}`;
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

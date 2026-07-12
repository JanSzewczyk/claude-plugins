#!/usr/bin/env node
// Pulls canonical .claude/rules/ files from this skill's rules/ folder (the source of
// truth, versioned in the claude-plugins repo) into the target project's .claude/rules/.
// Tracks a hash manifest so re-runs can tell "unchanged", "safe to update" and "locally
// modified" apart instead of blindly overwriting.
//
// By default this only *reports* status — it never writes without an explicit --only
// selection, since which rules apply to a given repo is a judgment call the skill asks the
// user to approve first (see SKILL.md). Pass --all to sync every candidate unfiltered.
//
// Usage: node sync-rules.mjs [--dry-run] [--force] [--list] [--all] [--only=a.md,b/c.md]

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const all = args.includes("--all");
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean) : null;
// Reporting-only unless the caller opted into writing via --all or an explicit --only list.
const dryRun = args.includes("--dry-run") || listOnly || (!all && !only);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(scriptDir, "..", "rules");

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function findRepoRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start; // fallback: cwd
    dir = parent;
  }
}

function collectMarkdownFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectMarkdownFiles(full, base));
    } else if (entry.endsWith(".md") && entry !== "README.md") {
      out.push(relative(base, full));
    }
  }
  return out;
}

const repoRoot = findRepoRoot(process.cwd());
const targetDir = join(repoRoot, ".claude", "rules");
const manifestPath = join(targetDir, ".sync-manifest.json");

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const nextManifest = { ...manifest };

const relFiles = collectMarkdownFiles(sourceDir).sort();
const rows = [];

for (const rel of relFiles) {
  const sourcePath = join(sourceDir, rel);
  const targetPath = join(targetDir, rel);
  const sourceContent = readFileSync(sourcePath, "utf8");
  const sourceHash = hash(sourceContent);
  const entry = manifest[rel];

  let status;
  let write = false;

  if (!existsSync(targetPath)) {
    status = "add";
    write = true;
  } else {
    const targetHash = hash(readFileSync(targetPath, "utf8"));
    if (!entry) {
      status = "skip (unmanaged file already exists here)";
    } else if (targetHash !== entry.hash) {
      if (force) {
        status = "overwrite (had local edits, --force)";
        write = true;
      } else {
        status = "conflict (local edits — rerun with --force to overwrite)";
      }
    } else if (sourceHash === entry.hash) {
      status = "up to date";
    } else {
      status = "update";
      write = true;
    }
  }

  const selected = only ? only.includes(rel) : true;
  if (!selected) write = false;

  rows.push({ rel, status: only && !selected ? `${status} (not selected)` : status });

  if (write && !dryRun) {
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, sourceContent);
  }
  if (write || (entry && !existsSync(targetPath))) {
    nextManifest[rel] = { hash: sourceHash, syncedAt: new Date().toISOString() };
  }
}

// Flag manifest entries whose source file was deleted upstream.
for (const rel of Object.keys(manifest)) {
  if (!relFiles.includes(rel)) {
    rows.push({ rel, status: "stale (removed from source — delete manually if desired)" });
  }
}

const label = listOnly ? "Status" : dryRun ? "[dry-run]" : "Synced";
console.log(`${label} .claude/rules/ from shared-rules against ${repoRoot}\n`);
for (const { rel, status } of rows.sort((a, b) => a.rel.localeCompare(b.rel))) {
  console.log(`  ${status.padEnd(45)} ${rel}`);
}

if (!dryRun) {
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2) + "\n");
}

const conflicts = rows.filter((r) => r.status.startsWith("conflict")).length;
if (conflicts > 0) {
  console.log(`\n${conflicts} file(s) have local edits and were left untouched. Rerun with --force to overwrite them.`);
}

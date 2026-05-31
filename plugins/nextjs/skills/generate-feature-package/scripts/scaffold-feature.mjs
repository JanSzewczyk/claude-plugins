#!/usr/bin/env node
// Scaffolds a new feature domain package under features/<name>/ following the
// feature-architecture spec (see ../references/feature-architecture.md): zone folders
// + one barrel (index) per zone.
// Usage: node scaffold-feature.mjs <feature-name> [--dry-run]

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2).filter((a) => a !== "--dry-run");
const dryRun = process.argv.includes("--dry-run");
const rawName = args[0];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!rawName) {
  fail('Missing feature name. Usage: /generate-feature-package <name>  (e.g. "order-tracking")');
}

const name = rawName.trim();
// Domain folders are kebab-case: lowercase words joined by single dashes.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  fail(`Invalid feature name "${rawName}". Use kebab-case: lowercase letters/digits, dash-separated (e.g. "orders", "email-templates").`);
}

// Find the project root by walking up until we see package.json.
function findProjectRoot(start) {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return start; // fallback: cwd
    dir = parent;
  }
}

const root = findProjectRoot(process.cwd());
const featureDir = join(root, "features", name);

if (existsSync(featureDir)) {
  fail(`features/${name} already exists — refusing to overwrite. Pick a different name or remove it first.`);
}

const barrel = (purpose) => `// Barrel — ${purpose}\n// Re-export this zone's public API here.\nexport {};\n`;

const serverBarrel = `import "server-only";

// Public API of the "${name}" server zone — re-export actions, services and db members here.
// Consumers outside the feature import ONLY from "~/features/${name}/server"; files inside are private.
export {};
`;

const gitkeep = "";

// path -> file contents. Directories are created implicitly from file paths.
// Folders without a barrel (actions/api/services) get a .gitkeep so git tracks them empty.
const files = {
  "components/index.tsx": barrel("components only (no types, no re-exports from server/)."),
  "constants/index.ts": barrel("constants."),
  "schemas/index.ts": barrel("Zod schemas + *FormData types."),
  "types/index.ts": barrel("shared, client-safe domain types."),
  "server/index.ts": serverBarrel,
  "server/actions/.gitkeep": gitkeep,
  "server/api/.gitkeep": gitkeep,
  "server/db/index.ts": barrel("internal DB sub-barrel: schema + queries + mutations."),
  "server/services/.gitkeep": gitkeep,
  "test/builders/index.ts": barrel("test data builders (import from types/, never from server/)."),
};

const created = [];
for (const [rel, contents] of Object.entries(files)) {
  const full = join(featureDir, rel);
  if (!dryRun) {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, contents);
  }
  created.push(rel);
}

const label = dryRun ? "[dry-run] would create" : "Created";
console.log(`${label} features/${name}/ with ${created.length} files:\n`);
console.log(`features/${name}/`);
for (const rel of created.sort()) {
  console.log(`  ${rel}`);
}
console.log(`\nNext: add tables/types/components, then re-export them from each zone's index.`);
console.log(`Leaf server files (services, permissions, db/queries, db/mutations) each get \`import "server-only"\`.`);

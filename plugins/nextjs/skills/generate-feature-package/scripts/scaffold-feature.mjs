#!/usr/bin/env node
// Scaffolds a new feature domain package under features/<name>/ following the
// feature-architecture spec (see ../references/feature-architecture.md): zone folders
// with the files each zone always needs, ready to fill in.
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

const stub = (purpose) => `// ${purpose}\n`;

const dbIndexBarrel = `// Re-exports queries + mutations only — never re-exports schema.ts.
export * from "./queries";
export * from "./mutations";
`;

const permissionsStub = `import "server-only";

// canDoX guard functions for the "${name}" domain.
`;

const gitkeep = "";

// path -> file contents. Directories are created implicitly from file paths.
// Folders without a fixed file set (actions/services) get a .gitkeep so git tracks them empty.
// constants/, server/api/, utils/, context/, hooks/ are optional zones — added on demand, not scaffolded.
const files = {
  "components/index.tsx": barrel("components only (no types, no re-exports from server/)."),
  [`schemas/${name}-schema.ts`]: stub(`Zod schemas + *FormData types for the "${name}" domain.`),
  "types/index.ts": barrel("shared, client-safe domain types."),
  "server/actions/.gitkeep": gitkeep,
  "server/db/schema.ts": stub("Data model definitions + row/entity types inferred from them."),
  "server/db/queries.ts": stub("Read operations, one per function."),
  "server/db/mutations.ts": stub("Write operations (create/update/delete), one per function."),
  "server/db/index.ts": dbIndexBarrel,
  "server/services/.gitkeep": gitkeep,
  "server/permissions.ts": permissionsStub,
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
console.log(`\nNext: fill in the schema, db, service, action and component files, then re-export`);
console.log(`from components/index.tsx, types/index.ts and test/builders/index.ts.`);
console.log(`There is no server/index.ts barrel — consumers import directly from the server/ file`);
console.log(`they need (e.g. ~/features/${name}/server/services/${name}.service).`);
console.log(`constants/, server/api/, utils/, context/, hooks/ are optional — add them only when needed.`);

#!/usr/bin/env node
// PostToolUse hook: after Claude edits a note under knowledge/, run `validate` and `lint` and hand
// the findings about that note straight back, so it is fixed in the same turn instead of at CI.
//
// - A contract violation exits 2: Claude Code shows stderr to the model as an error to fix. A
//   `{{TODO}}` placeholder is skipped, because a note is unfinished between `new` and its last edit (D18).
// - A lint finding is a warning: it goes back as additional context and never blocks.
// - Anything else (another file, no knowledge/ folder, a broken repo) is silent. A hook that
//   cries wolf gets disabled, so it speaks only about the note just written.
//
// Offline and zero dependencies, like the script it calls (D21, D25).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT = resolve(import.meta.dirname, "../skills/knowledge-author/scripts/knowledge.mjs");

async function main() {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const file = input.tool_input?.file_path;
  const root = input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  if (typeof file !== "string" || !file.endsWith(".md")) return 0;

  const rel = relative(resolve(root), resolve(root, file)).split(sep).join("/");
  if (!rel.startsWith("knowledge/") || rel.startsWith("../")) return 0;
  if (rel === "knowledge/README.md" || rel.split("/").pop().startsWith("_")) return 0;
  if (!existsSync(join(root, "knowledge", "knowledge.config.json"))) return 0;

  const { loadConfig, loadNotes, validateNotes, lint } = await import(pathToFileURL(SCRIPT).href);
  const config = loadConfig(root);
  const notes = loadNotes(root, config);

  const problems = validateNotes(notes, config).filter((i) => i.file === rel && !i.message.includes("{{TODO"));
  if (problems.length) {
    const lines = problems.map((i) => `- ${i.message}${i.hint ? ` (${i.hint})` : ""}`);
    process.stderr.write(`${rel} breaks the authoring contract (knowledge.mjs validate):\n${lines.join("\n")}\n`);
    return 2;
  }

  const id = rel.slice("knowledge/".length, -".md".length);
  const findings = (await lint(root)).filter((f) => f.file === rel || f.message.includes(` ${id} `) || f.message.includes(` ${id} (`));
  if (findings.length) {
    const lines = findings.map((f) => `- ${f.file ?? ""} ${f.message}${f.hint ? ` (${f.hint})` : ""}`);
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `knowledge.mjs lint found:\n${lines.join("\n")}\nFix these if they are real, or say why they are not.`,
        },
      }),
    );
  }
  return 0;
}

try {
  process.exitCode = await main();
} catch {
  process.exitCode = 0; // never break an edit because the checker could not run
}
